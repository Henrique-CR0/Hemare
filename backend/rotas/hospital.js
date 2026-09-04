// Hemare - Rotas do hospital (perfil e necessidades).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { doadoresCompativeis } = require('../regras/compatibilidade');

const router = express.Router();

// COMPLETAR PERFIL do hospital (cidade, estado, endereco).
router.post('/perfil', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { cidade, estado, endereco } = req.body;

    if (!cidade) {
        return res.status(400).json({ erro: 'Informe ao menos a cidade.' });
    }

    try {
        const existe = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (existe.rows.length > 0) {
            await pool.query(
                'UPDATE hospitais SET cidade = $1, estado = $2, endereco = $3 WHERE usuario_id = $4',
                [cidade, estado, endereco, usuarioId]
            );
        } else {
            await pool.query(
                'INSERT INTO hospitais (usuario_id, cidade, estado, endereco) VALUES ($1, $2, $3, $4)',
                [usuarioId, cidade, estado, endereco]
            );
        }
        res.json({ mensagem: 'Perfil do hospital salvo!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar perfil: ' + erro.message });
    }
});

// PUBLICAR uma necessidade (o hospital pede um tipo sanguineo).
router.post('/necessidade', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, tipoDoacao, urgencia } = req.body;

    if (!tipoSanguineo) {
        return res.status(400).json({ erro: 'Informe o tipo sanguineo necessario.' });
    }

    try {
        // Descobre o hospital deste usuario.
        const rHosp = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (rHosp.rows.length === 0) {
            return res.status(400).json({ erro: 'Complete o perfil do hospital primeiro.' });
        }
        const hospitalId = rHosp.rows[0].id;

        await pool.query(
            'INSERT INTO necessidades (hospital_id, tipo_sanguineo, tipo_doacao, urgencia) VALUES ($1, $2, $3, $4)',
            [hospitalId, tipoSanguineo, tipoDoacao || 'sangue', urgencia || 'normal']
        );
        res.status(201).json({ mensagem: 'Necessidade publicada!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao publicar: ' + erro.message });
    }
});

// LISTAR as necessidades do hospital logado.
router.get('/necessidades', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    try {
        const rHosp = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (rHosp.rows.length === 0) return res.json([]);
        const hospitalId = rHosp.rows[0].id;

        const r = await pool.query(
            'SELECT * FROM necessidades WHERE hospital_id = $1 ORDER BY criada_em DESC',
            [hospitalId]
        );
        res.json(r.rows);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// MATCH: dado o id de uma necessidade, acha os doadores compativeis.
router.get('/match/:necessidadeId', autenticar, async (req, res) => {
    try {
        // Pega a necessidade (o tipo sanguineo pedido).
        const rNec = await pool.query('SELECT * FROM necessidades WHERE id = $1', [req.params.necessidadeId]);
        if (rNec.rows.length === 0) return res.status(404).json({ erro: 'Necessidade nao encontrada.' });
        const tipoReceptor = rNec.rows[0].tipo_sanguineo;

        // Usa a regra de compatibilidade para saber quais tipos podem doar.
        const tiposCompativeis = doadoresCompativeis(tipoReceptor);
        if (tiposCompativeis.length === 0) {
            return res.json({ tipoReceptor, tiposCompativeis: [], doadores: [] });
        }

        // Busca os doadores desses tipos (mostra so cidade e tipo, respeitando privacidade).
        const r = await pool.query(
            `SELECT u.nome, d.tipo_sanguineo, d.cidade, d.visibilidade
             FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
             WHERE d.tipo_sanguineo = ANY($1)`,
            [tiposCompativeis]
        );

        // Respeita a privacidade: anonimo nao mostra o nome.
        const doadores = r.rows.map((doa) => ({
            nome: doa.visibilidade === 'identificado' ? doa.nome : 'Doador anônimo',
            tipo_sanguineo: doa.tipo_sanguineo,
            cidade: doa.cidade
        }));

        res.json({ tipoReceptor, tiposCompativeis, doadores });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// DADOS do hospital logado (nome, cidade, status de verificacao).
router.get('/meus-dados', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    try {
        const r = await pool.query(
            `SELECT u.nome, h.cidade, h.estado, h.aprovado
             FROM hospitais h JOIN usuarios u ON u.id = h.usuario_id
             WHERE h.usuario_id = $1`,
            [usuarioId]
        );
        if (r.rows.length === 0) return res.json(null);
        res.json(r.rows[0]);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;