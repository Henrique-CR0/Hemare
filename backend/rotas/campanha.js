// Hemare - Rotas das campanhas de reposicao ("Quem doa por mim").
// A pagina publica da campanha mostra so apelido, hospital, meta e progresso.
// O nome e o telefone do doador so chegam ao hospital da campanha em que ele mesmo prometeu doar.
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirHospitalAprovado } = require('../middleware/exigirPapel');
const { gerarCodigo, normalizarCodigo } = require('../regras/indicacao');
const { paraDia } = require('../regras/alerta');
const { validarCampanha, situacaoCampanha, validarPromessa, somarDias } = require('../regras/campanha');
const { registrarDoacao } = require('../servicos/registrarDoacao');

const router = express.Router();

const CAMPOS = `c.id, c.codigo, c.apelido, c.meta_bolsas, c.expira_em, c.ativo, u.nome AS hospital, h.cidade, h.estado`;
const DE_CAMPANHA = `FROM campanhas_reposicao c
                      JOIN hospitais h ON h.id = c.hospital_id
                      JOIN usuarios u ON u.id = h.usuario_id`;

// Promessas das campanhas dadas: { campanhaId: { prometidas, confirmadas } }.
async function contarPromessas(ids) {
    const mapa = {};
    ids.forEach((id) => { mapa[id] = { prometidas: 0, confirmadas: 0 }; });
    if (ids.length === 0) return mapa;
    const marcadores = ids.map((_, i) => '$' + (i + 1)).join(', ');
    const r = await pool.query('SELECT campanha_id, doacao_id FROM promessas_campanha WHERE campanha_id IN (' + marcadores + ')', ids);
    r.rows.forEach((p) => {
        if (p.doacao_id) mapa[p.campanha_id].confirmadas++;
        else mapa[p.campanha_id].prometidas++;
    });
    return mapa;
}

// Formato da campanha para o frontend (sem dado pessoal de ninguem).
function montar(linha, contagem) {
    const situacao = situacaoCampanha({
        metaBolsas: linha.meta_bolsas,
        confirmadas: contagem.confirmadas,
        prometidas: contagem.prometidas,
        expiraEm: linha.expira_em,
        ativo: linha.ativo
    });
    return {
        codigo: linha.codigo,
        apelido: linha.apelido,
        hospital: linha.hospital,
        cidade: linha.cidade,
        estado: linha.estado,
        expiraEm: paraDia(linha.expira_em),
        ...situacao
    };
}

// Acha o doador logado.
async function buscarDoador(usuario) {
    if (usuario.tipo !== 'doador') return { status: 403, erro: 'Só contas de doador podem prometer doação.' };
    const r = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [usuario.id]);
    if (r.rows.length === 0) return { status: 404, erro: 'Complete seu perfil (tipo sanguíneo e sexo) para prometer doação.' };
    return { doador: r.rows[0] };
}

// HOSPITAL: abre uma campanha para um paciente internado.
router.post('/', autenticar, exigirHospitalAprovado, async (req, res) => {
    const { erro, campanha } = validarCampanha(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const expiraEm = somarDias(paraDia(new Date()), campanha.prazoDias);
        for (let tentativa = 0; tentativa < 5; tentativa++) {
            const codigo = gerarCodigo();
            try {
                await pool.query(
                    'INSERT INTO campanhas_reposicao (hospital_id, codigo, apelido, meta_bolsas, expira_em) VALUES ($1, $2, $3, $4, $5)',
                    [req.hospital.id, codigo, campanha.apelido, campanha.metaBolsas, expiraEm]
                );
                return res.status(201).json({ codigo, mensagem: 'Campanha criada! Compartilhe o link com a família e os amigos.' });
            } catch (e) {
                if (e.code !== '23505') throw e; // codigo repetido: sorteia outro
            }
        }
        res.status(500).json({ erro: 'Não consegui gerar o link da campanha. Tente de novo.' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao criar a campanha: ' + e.message });
    }
});

// HOSPITAL: suas campanhas ativas, com quem prometeu doar (nome e telefone, que o doador autorizou ao prometer).
router.get('/minhas', autenticar, exigirHospitalAprovado, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT ${CAMPOS} ${DE_CAMPANHA} WHERE c.hospital_id = $1 AND c.ativo = true ORDER BY c.criado_em DESC`,
            [req.hospital.id]
        );
        const contagem = await contarPromessas(r.rows.map((l) => l.id));
        const rProm = await pool.query(
            `SELECT p.campanha_id, p.data_prevista, p.doacao_id, d.id AS doador_id, un.nome, d.telefone
               FROM promessas_campanha p
               JOIN campanhas_reposicao c ON c.id = p.campanha_id
               JOIN doadores d ON d.id = p.doador_id
               JOIN usuarios un ON un.id = d.usuario_id
              WHERE c.hospital_id = $1 AND c.ativo = true
              ORDER BY p.data_prevista ASC`,
            [req.hospital.id]
        );
        res.json(r.rows.map((l) => ({
            ...montar(l, contagem[l.id]),
            promessas: rProm.rows.filter((p) => p.campanha_id === l.id).map((p) => ({
                doadorId: p.doador_id,
                nome: p.nome,
                telefone: p.telefone,
                dataPrevista: paraDia(p.data_prevista),
                confirmada: !!p.doacao_id
            }))
        })));
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao listar suas campanhas: ' + e.message });
    }
});

// DOADOR: campanhas em que prometeu doar.
router.get('/minhas-promessas', autenticar, async (req, res) => {
    try {
        const achado = await buscarDoador(req.usuario);
        if (achado.erro) return res.status(achado.status).json({ erro: achado.erro });
        const r = await pool.query(
            `SELECT ${CAMPOS}, p.data_prevista, p.doacao_id
               FROM promessas_campanha p
               JOIN campanhas_reposicao c ON c.id = p.campanha_id
               JOIN hospitais h ON h.id = c.hospital_id
               JOIN usuarios u ON u.id = h.usuario_id
              WHERE p.doador_id = $1 AND h.aprovado = true
              ORDER BY p.data_prevista DESC`,
            [achado.doador.id]
        );
        res.json(r.rows.map((l) => ({
            codigo: l.codigo,
            apelido: l.apelido,
            hospital: l.hospital,
            cidade: l.cidade,
            dataPrevista: paraDia(l.data_prevista),
            confirmada: !!l.doacao_id
        })));
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao buscar suas promessas: ' + e.message });
    }
});

// Busca a campanha pelo codigo (so de hospital aprovado). Devolve a linha ou null.
async function buscarCampanha(texto) {
    const codigo = normalizarCodigo(texto);
    if (!codigo) return null;
    const r = await pool.query(`SELECT ${CAMPOS} ${DE_CAMPANHA} WHERE c.codigo = $1 AND h.aprovado = true`, [codigo]);
    return r.rows[0] || null;
}

// PUBLICO: pagina da campanha (quem recebe o link ve isto, sem precisar de conta).
router.get('/:codigo', async (req, res) => {
    try {
        const linha = await buscarCampanha(req.params.codigo);
        if (!linha) return res.status(404).json({ erro: 'Campanha não encontrada.' });
        const contagem = await contarPromessas([linha.id]);
        res.json(montar(linha, contagem[linha.id]));
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao abrir a campanha: ' + e.message });
    }
});

// DOADOR: promete doar em uma data (o hospital passa a ver seu nome e telefone so para esta campanha).
router.post('/:codigo/prometer', autenticar, async (req, res) => {
    try {
        const achado = await buscarDoador(req.usuario);
        if (achado.erro) return res.status(achado.status).json({ erro: achado.erro });
        const doador = achado.doador;

        const linha = await buscarCampanha(req.params.codigo);
        if (!linha) return res.status(404).json({ erro: 'Campanha não encontrada.' });
        const contagem = (await contarPromessas([linha.id]))[linha.id];
        const situacao = montar(linha, contagem);

        const rJa = await pool.query('SELECT id FROM promessas_campanha WHERE campanha_id = $1 AND doador_id = $2', [linha.id, doador.id]);
        const veredito = validarPromessa({
            data: req.body.data,
            situacao,
            expiraEm: linha.expira_em,
            jaPrometeu: rJa.rows.length > 0,
            doador
        });
        if (!veredito.pode) return res.status(400).json({ erro: veredito.erro });

        await pool.query(
            'INSERT INTO promessas_campanha (campanha_id, doador_id, data_prevista) VALUES ($1, $2, $3)',
            [linha.id, doador.id, req.body.data]
        );
        res.status(201).json({
            mensagem: '🤝 Combinado! O hospital verá seu nome e telefone para confirmar sua doação. Faça a triagem antes de ir.'
        });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ erro: 'Você já prometeu doar por este paciente.' });
        res.status(500).json({ erro: 'Erro ao registrar a promessa: ' + e.message });
    }
});

// DOADOR: desiste da promessa (so enquanto o hospital nao confirmou a doacao).
router.delete('/:codigo/prometer', autenticar, async (req, res) => {
    try {
        const achado = await buscarDoador(req.usuario);
        if (achado.erro) return res.status(achado.status).json({ erro: achado.erro });
        const linha = await buscarCampanha(req.params.codigo);
        if (!linha) return res.status(404).json({ erro: 'Campanha não encontrada.' });
        const r = await pool.query(
            'DELETE FROM promessas_campanha WHERE campanha_id = $1 AND doador_id = $2 AND doacao_id IS NULL RETURNING id',
            [linha.id, achado.doador.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Você não tem uma promessa pendente nesta campanha.' });
        res.json({ mensagem: 'Promessa cancelada. Tudo bem, obrigado por avisar!' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao cancelar: ' + e.message });
    }
});

// HOSPITAL: confirma a doacao de quem prometeu (entra na cadeia de confianca e conta para a campanha).
router.post('/:codigo/confirmar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const doadorId = Number(req.body.doadorId);
    if (!Number.isInteger(doadorId) || doadorId < 1) return res.status(400).json({ erro: 'Doador inválido.' });
    try {
        const linha = await buscarCampanha(req.params.codigo);
        if (!linha || linha.id === undefined) return res.status(404).json({ erro: 'Campanha não encontrada.' });
        const dono = await pool.query('SELECT id FROM campanhas_reposicao WHERE id = $1 AND hospital_id = $2 AND ativo = true', [linha.id, req.hospital.id]);
        if (dono.rows.length === 0) return res.status(404).json({ erro: 'Campanha não encontrada.' });

        const rProm = await pool.query(
            'SELECT id, doacao_id FROM promessas_campanha WHERE campanha_id = $1 AND doador_id = $2',
            [linha.id, doadorId]
        );
        if (rProm.rows.length === 0) return res.status(404).json({ erro: 'Essa pessoa não prometeu doar nesta campanha.' });
        if (rProm.rows[0].doacao_id) return res.status(409).json({ erro: 'Essa doação já foi confirmada.' });

        const resultado = await registrarDoacao(req.hospital.id, doadorId);
        if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
        await pool.query('UPDATE promessas_campanha SET doacao_id = $1 WHERE id = $2', [resultado.doacaoId, rProm.rows[0].id]);

        res.json({ mensagem: 'Doação confirmada e contada na campanha! 🩸🔗', hash: resultado.hash });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao confirmar: ' + e.message });
    }
});

// HOSPITAL: encerra a campanha (a pagina publica passa a mostrar "encerrada").
router.post('/:codigo/encerrar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const codigo = normalizarCodigo(req.params.codigo);
    if (!codigo) return res.status(404).json({ erro: 'Campanha não encontrada.' });
    try {
        const r = await pool.query(
            'UPDATE campanhas_reposicao SET ativo = false WHERE codigo = $1 AND hospital_id = $2 AND ativo = true RETURNING id',
            [codigo, req.hospital.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Campanha não encontrada.' });
        res.json({ mensagem: 'Campanha encerrada. Obrigado a todos que doaram!' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao encerrar: ' + e.message });
    }
});

module.exports = router;
