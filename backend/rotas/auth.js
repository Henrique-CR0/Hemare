// Hemare - Rotas de autenticacao (cadastro e login).
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../banco');
const { TIPOS_CADASTRO } = require('../regras/verificacao');
const { normalizarCodigo } = require('../regras/indicacao');

const router = express.Router();

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

// CADASTRO: cria apenas a conta (usuario). O perfil de doador e preenchido depois do login.
router.post('/cadastro', async (req, res) => {
    const { nome, email, senha, tipo, codigoIndicacao } = req.body;

    if (!nome || !email || !senha || !tipo) {
        return res.status(400).json({ erro: 'Preencha nome, email, senha e tipo.' });
    }

    // Pelo site so se cria conta de doador ou hospital (admin nunca).
    if (!TIPOS_CADASTRO.includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo de conta invalido.' });
    }

        if (senha.length < 8) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    try {
        const senhaHash = await bcrypt.hash(senha, 10);

        // "Traga um amigo": se veio um codigo de convite valido, guarda quem convidou.
        // Codigo invalido ou desconhecido nunca impede o cadastro (so e ignorado).
        const indicadoPor = tipo === 'doador' ? await buscarQuemConvidou(codigoIndicacao) : null;

        const resultado = indicadoPor
            ? await pool.query(
                'INSERT INTO usuarios (nome, email, senha_hash, tipo, indicado_por) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, tipo',
                [nome, email, senhaHash, tipo, indicadoPor]
            )
            : await pool.query(
                'INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
                [nome, email, senhaHash, tipo]
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
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Preencha email e senha.' });
    }

    try {
        const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = resultado.rows[0];

        if (!usuario) {
            return res.status(401).json({ erro: 'Email ou senha invalidos.' });
        }

        const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaConfere) {
            return res.status(401).json({ erro: 'Email ou senha invalidos.' });
        }

        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            mensagem: 'Login realizado!',
            token: token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro no login: ' + erro.message });
    }
});

module.exports = router;