// Hemare - Rotas do perfil do doador: ver e editar dados pessoais e foto, baixar os proprios dados (LGPD)
// e excluir a conta. Tudo aqui e so da propria pessoa: nenhuma rota devolve dado de outro doador.
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { paraDia } = require('../regras/alerta');
const { calcularConquistas } = require('../regras/gamificacao');
const { validarPerfil, validarFoto, completude, mascararCpf, descreverVisaoDoHospital } = require('../regras/perfil');

const router = express.Router();

router.use(autenticar);
router.use((req, res, next) => {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'O perfil de doador é só para contas de doador.' });
    next();
});

// Consulta que pode falhar sem derrubar a rota (tabela de um recurso novo que ainda nao foi criada).
async function opcional(sql, parametros) {
    try {
        return (await pool.query(sql, parametros || [])).rows;
    } catch (erro) {
        return [];
    }
}

// Monta o perfil que a tela usa (nunca devolve o CPF inteiro).
function montar(usuario, d) {
    const perfil = {
        nome: usuario.nome,
        email: usuario.email,
        nomeSocial: d.nome_social || null,
        genero: d.genero || null,
        sexo: d.sexo,
        tipoSanguineo: d.tipo_sanguineo,
        cidade: d.cidade || '',
        estado: d.estado || null,
        dataNascimento: d.data_nascimento ? paraDia(d.data_nascimento) : null,
        pesoKg: d.peso_kg === undefined || d.peso_kg === null ? null : Number(d.peso_kg),
        telefone: d.telefone || null,
        cpfMascarado: mascararCpf(d.cpf),
        temCpf: !!d.cpf,
        visibilidade: d.visibilidade || 'anonimo',
        foto: d.foto || null,
        contatoEmergenciaNome: d.contato_emergencia_nome || null,
        contatoEmergenciaTelefone: d.contato_emergencia_telefone || null,
        doadorDesde: usuario.criado_em ? paraDia(usuario.criado_em) : null,
        totalDoacoes: Number(d.total_doacoes) || 0
    };
    const nivel = calcularConquistas({ totalDoacoes: perfil.totalDoacoes, tipoSanguineo: perfil.tipoSanguineo, visibilidade: perfil.visibilidade }).nivel;
    return {
        ...perfil,
        nivel,
        completude: completude(perfil),
        visaoDoHospital: descreverVisaoDoHospital({
            id: d.id, nome: usuario.nome, nome_social: d.nome_social, tipo_sanguineo: d.tipo_sanguineo,
            cidade: d.cidade, visibilidade: perfil.visibilidade, telefone: perfil.telefone
        })
    };
}

// Conta e doador da pessoa logada. Devolve { usuario, doador } ou { status, erro }.
async function carregar(usuarioId) {
    const u = await pool.query('SELECT id, nome, email, tipo, criado_em FROM usuarios WHERE id = $1', [usuarioId]);
    if (u.rows.length === 0 || u.rows[0].tipo === 'removido') return { status: 401, erro: 'Esta conta não existe mais.' };
    const d = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [usuarioId]);
    if (d.rows.length === 0) return { status: 404, erro: 'Complete seu perfil para continuar.', usuario: u.rows[0] };
    return { usuario: u.rows[0], doador: d.rows[0] };
}

const AVISO_MIGRACAO = 'O perfil completo ainda não foi ativado no banco (rode db/ajustar-perfil.js).';

// VER o proprio perfil.
router.get('/', async (req, res) => {
    try {
        const r = await carregar(req.usuario.id);
        if (r.erro) return res.status(r.status).json({ erro: r.erro });
        res.json(montar(r.usuario, r.doador));
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar o perfil: ' + erro.message });
    }
});

// EDITAR o perfil (nome, dados pessoais, foto, privacidade).
router.put('/', async (req, res) => {
    const { erro, perfil } = validarPerfil(req.body);
    if (erro) return res.status(400).json({ erro });
    const foto = validarFoto(req.body.foto);
    if (foto.erro) return res.status(400).json({ erro: foto.erro });

    try {
        const atual = await carregar(req.usuario.id);
        if (atual.status === 401) return res.status(401).json({ erro: atual.erro });

        // Nomes de coluna fixos aqui (nada vindo do usuario entra no SQL); so os valores vao como parametros.
        const campos = {
            nome_social: perfil.nomeSocial, genero: perfil.genero, sexo: perfil.sexo, tipo_sanguineo: perfil.tipoSanguineo,
            cidade: perfil.cidade, estado: perfil.estado, data_nascimento: perfil.dataNascimento, peso_kg: perfil.pesoKg,
            telefone: perfil.telefone, visibilidade: perfil.visibilidade,
            contato_emergencia_nome: perfil.contatoEmergenciaNome, contato_emergencia_telefone: perfil.contatoEmergenciaTelefone
        };
        if (perfil.cpf !== undefined) campos.cpf = perfil.cpf;
        if (foto.foto !== undefined) campos.foto = foto.foto;
        const colunas = Object.keys(campos);
        const valores = colunas.map((c) => campos[c]);

        await pool.query('UPDATE usuarios SET nome = $1 WHERE id = $2', [perfil.nome, req.usuario.id]);
        if (atual.doador) {
            const sets = colunas.map((c, i) => c + ' = $' + (i + 1)).join(', ');
            await pool.query(
                'UPDATE doadores SET ' + sets + ', perfil_atualizado_em = NOW() WHERE usuario_id = $' + (colunas.length + 1),
                [...valores, req.usuario.id]
            );
        } else {
            const marcadores = colunas.map((_, i) => '$' + (i + 2)).join(', ');
            await pool.query(
                'INSERT INTO doadores (usuario_id, ' + colunas.join(', ') + ') VALUES ($1, ' + marcadores + ')',
                [req.usuario.id, ...valores]
            );
        }

        const novo = await carregar(req.usuario.id);
        res.json({
            mensagem: 'Perfil salvo!',
            perfil: montar(novo.usuario, novo.doador),
            usuario: { id: novo.usuario.id, nome: novo.usuario.nome, email: novo.usuario.email, tipo: novo.usuario.tipo }
        });
    } catch (e) {
        if (e.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao salvar o perfil: ' + e.message });
    }
});

// BAIXAR os proprios dados (direito de acesso da LGPD): um arquivo JSON com tudo que o Hemare guarda da pessoa.
router.get('/exportar', async (req, res) => {
    try {
        const r = await carregar(req.usuario.id);
        if (r.status === 401) return res.status(401).json({ erro: r.erro });
        const doador = r.doador ? montar(r.usuario, r.doador) : null;
        const idDoador = r.doador ? r.doador.id : null;

        const doacoes = idDoador ? await opcional(
            `SELECT dc.id, dc.data_doacao, dc.hash, un.nome AS hospital
               FROM doacoes dc JOIN hospitais h ON h.id = dc.hospital_id JOIN usuarios un ON un.id = h.usuario_id
              WHERE dc.doador_id = $1 ORDER BY dc.id`, [idDoador]) : [];
        const afilhados = idDoador ? await opcional(
            `SELECT c.apelido, p.criado_em FROM padrinhos p JOIN casos_apadrinhamento c ON c.id = p.caso_id
              WHERE p.doador_id = $1`, [idDoador]) : [];
        const rara = idDoador ? await opcional(
            'SELECT raro_fenotipo, raro_status, raro_consentimento, raro_alcance FROM doadores WHERE id = $1 AND raro_fenotipo IS NOT NULL', [idDoador]) : [];
        const avisoFeriado = idDoador ? await opcional(
            'SELECT quer_aviso_feriado FROM doadores WHERE id = $1', [idDoador]) : [];
        const pcd = idDoador ? await opcional(
            'SELECT pcd, pcd_tipos, pcd_apoios, pcd_declarado_em FROM doadores WHERE id = $1 AND pcd = true', [idDoador]) : [];
        const promessas = idDoador ? await opcional(
            `SELECT c.apelido, p.data_prevista, p.doacao_id FROM promessas_campanha p
               JOIN campanhas_reposicao c ON c.id = p.campanha_id WHERE p.doador_id = $1`, [idDoador]) : [];

        const dados = {
            geradoEm: new Date().toISOString(),
            conta: { nome: r.usuario.nome, email: r.usuario.email, criadaEm: r.usuario.criado_em },
            perfil: doador && {
                nomeSocial: doador.nomeSocial, genero: doador.genero, sexoParaIntervalo: doador.sexo, tipoSanguineo: doador.tipoSanguineo,
                cidade: doador.cidade, estado: doador.estado, dataNascimento: doador.dataNascimento, pesoKg: doador.pesoKg,
                telefone: doador.telefone, cpf: r.doador.cpf || null, visibilidade: doador.visibilidade,
                contatoEmergencia: { nome: doador.contatoEmergenciaNome, telefone: doador.contatoEmergenciaTelefone },
                temFoto: !!doador.foto, foto: doador.foto
            },
            doacoesConfirmadas: doacoes.map((d) => ({ id: d.id, data: paraDia(d.data_doacao), hospital: d.hospital, selo: d.hash })),
            redeSangueRaro: rara[0] ? {
                participa: rara[0].raro_consentimento === true, fenotipo: rara[0].raro_fenotipo, situacao: rara[0].raro_status, alcance: rara[0].raro_alcance
            } : null,
            avisoPorEmailAntesDeFeriados: avisoFeriado[0] ? avisoFeriado[0].quer_aviso_feriado === true : false,
            declaracaoPcd: pcd[0] ? {
                tipos: String(pcd[0].pcd_tipos || '').split(',').filter(Boolean),
                apoios: String(pcd[0].pcd_apoios || '').split(',').filter(Boolean),
                declaradaEm: pcd[0].pcd_declarado_em
            } : null,
            pacientesApadrinhados: afilhados.map((a) => ({ apelido: a.apelido, desde: a.criado_em })),
            promessasEmCampanhas: promessas.map((p) => ({ apelido: p.apelido, dataPrevista: paraDia(p.data_prevista), confirmada: !!p.doacao_id }))
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-hemare.json"');
        res.send(JSON.stringify(dados, null, 2));
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao exportar seus dados: ' + erro.message });
    }
});

// EXCLUIR a conta (direito de eliminacao da LGPD). Pede a senha. Os dados pessoais sao apagados; as doacoes
// ja confirmadas ficam SEM nenhum dado pessoal, porque fazem parte da cadeia de confianca e nao podem sumir.
router.post('/excluir', async (req, res) => {
    const senha = req.body && req.body.senha;
    if (typeof senha !== 'string' || !senha) return res.status(400).json({ erro: 'Digite sua senha para confirmar.' });

    try {
        const r = await pool.query('SELECT id, senha_hash, tipo FROM usuarios WHERE id = $1', [req.usuario.id]);
        if (r.rows.length === 0 || r.rows[0].tipo === 'removido') return res.status(401).json({ erro: 'Esta conta não existe mais.' });
        if (!(await bcrypt.compare(senha, r.rows[0].senha_hash))) return res.status(403).json({ erro: 'Senha incorreta.' });

        const id = req.usuario.id;
        const d = await pool.query('SELECT id FROM doadores WHERE usuario_id = $1', [id]);
        const idDoador = d.rows.length > 0 ? d.rows[0].id : null;

        // Partes opcionais (recursos que podem nem existir ainda no banco): falhar aqui nao impede a exclusao.
        if (idDoador) {
            await opcional('DELETE FROM padrinhos WHERE doador_id = $1', [idDoador]);
            await opcional('DELETE FROM convocacoes_raras WHERE doador_id = $1 AND doacao_id IS NULL', [idDoador]);
            await opcional(
                `UPDATE doadores SET raro_fenotipo = NULL, raro_status = NULL, raro_consentimento = false, raro_alcance = NULL,
                        raro_codigo = NULL, raro_confirmado_por = NULL, raro_confirmado_em = NULL, raro_ultima_notificacao = NULL
                  WHERE id = $1`, [idDoador]);
            await opcional('UPDATE doadores SET pcd = false, pcd_tipos = NULL, pcd_apoios = NULL, pcd_declarado_em = NULL WHERE id = $1', [idDoador]);
            await opcional('DELETE FROM avisos_feriado WHERE doador_id = $1', [idDoador]);
            await opcional('UPDATE doadores SET quer_aviso_feriado = false WHERE id = $1', [idDoador]);
            await opcional('DELETE FROM promessas_campanha WHERE doador_id = $1 AND doacao_id IS NULL', [idDoador]);
            await opcional('UPDATE doadores SET quer_lembrete = false WHERE id = $1', [idDoador]);
            await opcional(
                `UPDATE doadores SET foto = NULL, data_nascimento = NULL, genero = NULL, peso_kg = NULL, estado = NULL,
                        contato_emergencia_nome = NULL, contato_emergencia_telefone = NULL WHERE id = $1`, [idDoador]);
        }
        await opcional('UPDATE usuarios SET codigo_indicacao = NULL WHERE id = $1', [id]);
        await opcional('DELETE FROM recuperacao_senha WHERE usuario_id = $1', [id]);

        // Nucleo: anonimiza a conta e o doador de uma vez so.
        const senhaInutil = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const cliente = await pool.connect();
        try {
            await cliente.query('BEGIN');
            await cliente.query(
                "UPDATE usuarios SET nome = 'Conta removida', email = $1, senha_hash = $2, tipo = 'removido' WHERE id = $3",
                ['removido-' + id + '@removido.hemare.invalid', senhaInutil, id]
            );
            if (idDoador) {
                await cliente.query(
                    "UPDATE doadores SET nome_social = NULL, cpf = NULL, telefone = NULL, cidade = '', visibilidade = 'anonimo' WHERE id = $1",
                    [idDoador]
                );
            }
            await cliente.query('COMMIT');
        } catch (e) {
            await cliente.query('ROLLBACK').catch(() => {});
            throw e;
        } finally {
            cliente.release();
        }

        res.json({ mensagem: 'Sua conta foi excluída e seus dados pessoais foram apagados. Obrigado por ter ajudado! 💛' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao excluir a conta: ' + erro.message });
    }
});

module.exports = router;
