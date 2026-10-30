// Hemare - Rotas de autenticacao.
//   POST  /auth/cadastro         cria a conta (doador ou hospital)
//   POST  /auth/login            entra; { lembrar: true } mantem a sessao por 7 dias
//   GET   /auth/eu               confere a sessao e devolve quem esta logado (login automatico ao abrir o site)
//   POST  /auth/renovar          troca o token por um novo (sessao deslizante) enquanto a pessoa usa o site
//   PATCH /auth/eu               muda o nome da conta
//   PUT   /auth/senha            troca a senha (pede a atual) e encerra as outras sessoes
//   POST  /auth/sair-de-todos    encerra todas as sessoes, inclusive esta
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { normalizarCodigo } = require('../regras/indicacao');
const R = require('../regras/auth');
const sessoes = require('../servicos/sessoes');

const router = express.Router();

// Hash de uma senha que ninguem tem: serve para gastar o MESMO tempo quando o e-mail nao existe,
// para ninguem descobrir quem tem conta medindo o tempo da resposta.
const HASH_FALSO = bcrypt.hashSync('hemare-sem-conta-' + Math.random(), 10);

// Maximo de senhas erradas por e-mail em 15 minutos; passou disso, a conta fica travada ate a janela acabar.
const limiteLogin = R.criarLimite({ maximo: 8, janelaMs: 15 * 60 * 1000 });
// Cadastros por e-mail: evita encher o banco com contas repetidas em sequencia.
const limiteCadastro = R.criarLimite({ maximo: 10, janelaMs: 60 * 60 * 1000 });

// Devolve o id de quem tem esse codigo de convite, ou null (codigo ruim ou coluna ainda nao criada).
async function buscarQuemConvidou(texto) {
    const codigo = normalizarCodigo(texto);
    if (!codigo) return null;
    try {
        const r = await pool.query('SELECT id FROM usuarios WHERE codigo_indicacao = $1', [codigo]);
        return r.rows.length > 0 ? r.rows[0].id : null;
    } catch (erro) {
        return null;
    }
}

function emitirToken(usuario, lembrar) {
    const { expiresIn } = R.vidaDoToken(lembrar);
    const token = jwt.sign({ id: usuario.id, nome: usuario.nome, tipo: usuario.tipo, lembrar: lembrar === true }, process.env.JWT_SECRET, { expiresIn });
    const { exp } = jwt.decode(token);
    return { token, expiraEm: new Date(exp * 1000).toISOString() };
}

function dadosPublicos(u) {
    return { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo };
}

// CADASTRO: cria apenas a conta (usuario). O perfil de doador e preenchido depois do login.
router.post('/cadastro', async (req, res) => {
    const { erro, dados } = R.validarCadastro(req.body);
    if (erro) return res.status(400).json({ erro });

    const bloqueio = limiteCadastro.bloqueio(dados.email);
    if (bloqueio.bloqueado) return res.status(429).set('Retry-After', String(bloqueio.segundos)).json({ erro: R.mensagemDeEspera(bloqueio.segundos) });

    try {
        // O e-mail e unico sem diferenciar maiusculas ("Ana@x.com" e "ana@x.com" sao a mesma conta).
        const existe = await pool.query('SELECT id FROM usuarios WHERE LOWER(email) = $1', [dados.email]);
        if (existe.rows.length > 0) {
            limiteCadastro.falha(dados.email);
            return res.status(409).json({ erro: 'Esse email ja esta cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(dados.senha, 10);

        // "Traga um amigo": se veio um codigo de convite valido, guarda quem convidou.
        // Codigo invalido ou desconhecido nunca impede o cadastro (so e ignorado).
        const indicadoPor = dados.tipo === 'doador' ? await buscarQuemConvidou(dados.codigoIndicacao) : null;

        const resultado = indicadoPor
            ? await pool.query(
                'INSERT INTO usuarios (nome, email, senha_hash, tipo, indicado_por) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, tipo',
                [dados.nome, dados.email, senhaHash, dados.tipo, indicadoPor]
            )
            : await pool.query(
                'INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
                [dados.nome, dados.email, senhaHash, dados.tipo]
            );

        res.status(201).json({ mensagem: 'Usuario cadastrado!', usuario: resultado.rows[0] });
    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({ erro: 'Esse email ja esta cadastrado.' });
        }
        res.status(500).json({ erro: 'Erro ao cadastrar: ' + erro.message });
    }
});

// LOGIN: confere email e senha; se baterem, devolve um token JWT.
router.post('/login', async (req, res) => {
    const email = R.normalizarEmail(req.body && req.body.email);
    const senha = req.body && req.body.senha;
    const lembrar = req.body && req.body.lembrar === true;

    if (!email || typeof senha !== 'string' || !senha) {
        return res.status(400).json({ erro: 'Preencha email e senha.' });
    }

    const bloqueio = limiteLogin.bloqueio(email);
    if (bloqueio.bloqueado) {
        return res.status(429).set('Retry-After', String(bloqueio.segundos)).json({ erro: R.mensagemDeEspera(bloqueio.segundos) });
    }

    try {
        const resultado = await pool.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [email]);
        const usuario = resultado.rows[0];

        // Sempre gasta o tempo de uma comparacao de senha, exista a conta ou nao.
        const senhaConfere = await bcrypt.compare(senha, usuario ? usuario.senha_hash : HASH_FALSO);

        if (!usuario || !senhaConfere || usuario.tipo === 'removido') {
            limiteLogin.falha(email);
            return res.status(401).json({ erro: 'Email ou senha invalidos.' });
        }

        limiteLogin.limpar(email);
        const { token, expiraEm } = emitirToken(usuario, lembrar);
        res.json({ mensagem: 'Login realizado!', token, expiraEm, usuario: dadosPublicos(usuario) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro no login: ' + erro.message });
    }
});

// Quem esta logado (e a conta ainda existe). O site chama ao abrir: e o "login automatico".
router.get('/eu', autenticar, async (req, res) => {
    try {
        const r = await pool.query('SELECT id, nome, email, tipo FROM usuarios WHERE id = $1', [req.usuario.id]);
        if (r.rows.length === 0 || r.rows[0].tipo === 'removido') {
            return res.status(401).json({ erro: 'Esta conta não existe mais.' });
        }
        res.json({ usuario: dadosPublicos(r.rows[0]), expiraEm: new Date(req.usuario.exp * 1000).toISOString(), renovar: R.deveRenovar(req.usuario) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao conferir a sessão: ' + erro.message });
    }
});

// Sessao deslizante: troca o token por outro novo (com a mesma "vida") enquanto a pessoa usa o site.
router.post('/renovar', autenticar, async (req, res) => {
    try {
        const r = await pool.query('SELECT id, nome, email, tipo FROM usuarios WHERE id = $1', [req.usuario.id]);
        if (r.rows.length === 0 || r.rows[0].tipo === 'removido') {
            return res.status(401).json({ erro: 'Esta conta não existe mais.' });
        }
        const { token, expiraEm } = emitirToken(r.rows[0], req.usuario.lembrar === true);
        res.json({ token, expiraEm, usuario: dadosPublicos(r.rows[0]) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao renovar a sessão: ' + erro.message });
    }
});

// Muda o nome da conta (o e-mail nao muda por aqui: exigiria confirmar o novo endereco).
router.patch('/eu', autenticar, async (req, res) => {
    const nome = typeof (req.body && req.body.nome) === 'string' ? req.body.nome.replace(/\s+/g, ' ').trim() : '';
    if (nome.length < 2 || nome.length > 120 || /[\u0000-\u001f<>]/.test(nome)) {
        return res.status(400).json({ erro: 'Informe o nome (de 2 a 120 caracteres, sem símbolos como < ou >).' });
    }
    try {
        const r = await pool.query("UPDATE usuarios SET nome = $1 WHERE id = $2 AND tipo <> 'removido' RETURNING id, nome, email, tipo", [nome, req.usuario.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Conta não encontrada.' });
        const { token, expiraEm } = emitirToken(r.rows[0], req.usuario.lembrar === true);
        res.json({ usuario: dadosPublicos(r.rows[0]), token, expiraEm, mensagem: 'Nome atualizado.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao atualizar o nome: ' + erro.message });
    }
});

// Trocar a senha: pede a atual, valida a nova e encerra as outras sessoes (esta continua, com um token novo).
router.put('/senha', autenticar, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body || {};
    if (typeof senhaAtual !== 'string' || !senhaAtual) return res.status(400).json({ erro: 'Digite a senha atual.' });
    try {
        const r = await pool.query('SELECT id, nome, email, tipo, senha_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
        const usuario = r.rows[0];
        if (!usuario || usuario.tipo === 'removido') return res.status(401).json({ erro: 'Esta conta não existe mais.' });

        const bloqueio = limiteLogin.bloqueio(usuario.email);
        if (bloqueio.bloqueado) return res.status(429).set('Retry-After', String(bloqueio.segundos)).json({ erro: R.mensagemDeEspera(bloqueio.segundos) });
        if (!(await bcrypt.compare(senhaAtual, usuario.senha_hash))) {
            limiteLogin.falha(usuario.email);
            return res.status(403).json({ erro: 'A senha atual está incorreta.' });
        }

        const conferida = R.validarSenha(novaSenha, { email: usuario.email, nome: usuario.nome });
        if (conferida.erro) return res.status(400).json({ erro: conferida.erro });
        if (novaSenha === senhaAtual) return res.status(400).json({ erro: 'A nova senha precisa ser diferente da atual.' });

        await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [await bcrypt.hash(novaSenha, 10), usuario.id]);
        limiteLogin.limpar(usuario.email);
        await sessoes.revogarTodas(usuario.id);
        // O token novo e emitido DEPOIS da revogacao, entao esta sessao continua valendo.
        const { token, expiraEm } = emitirToken(usuario, req.usuario.lembrar === true);
        res.json({ mensagem: 'Senha alterada. As outras sessões foram encerradas.', token, expiraEm });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao trocar a senha: ' + erro.message });
    }
});

// "Sair de todos os aparelhos": encerra todas as sessoes, inclusive esta.
router.post('/sair-de-todos', autenticar, async (req, res) => {
    const ok = await sessoes.revogarTodas(req.usuario.id);
    if (!ok) return res.status(500).json({ erro: 'O encerramento de sessões ainda não foi ativado no banco (rode db/ajustar-sessao.js).' });
    res.json({ mensagem: 'Todas as sessões foram encerradas. Entre de novo quando quiser.' });
});

module.exports = router;
