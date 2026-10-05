// Hemare - Rotas da Ficha PcD (pessoa com deficiencia).
// /pcd/guia e /pcd/ficha sao publicas e nao guardam nada: so devolvem as perguntas e calculam a orientacao na hora.
// /pcd/eu e do doador logado: declarar (ou deixar de declarar) a condicao no perfil. Dado sensivel (LGPD, art. 11):
// so a propria pessoa ve; nenhuma rota de hospital le estas colunas.
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { paraDia } = require('../regras/alerta');
const { TIPOS, APOIOS, guia, validarPcd, avaliarFicha, listaDoBanco } = require('../regras/pcd');

const router = express.Router();

const AVISO_MIGRACAO = 'A Ficha PcD ainda não foi ativada no banco (rode db/ajustar-pcd.js).';

router.get('/guia', (req, res) => {
    res.json(guia());
});

router.post('/ficha', (req, res) => {
    const { erro, resultado } = avaliarFicha(req.body);
    if (erro) return res.status(400).json({ erro });
    res.json(resultado);
});

router.use('/eu', autenticar, (req, res, next) => {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'A Ficha PcD é para contas de doador.' });
    next();
});

function montar(d) {
    return {
        declarado: d.pcd === true,
        tipos: d.pcd === true ? listaDoBanco(d.pcd_tipos, TIPOS.map((t) => t.valor)) : [],
        apoios: d.pcd === true ? listaDoBanco(d.pcd_apoios, APOIOS.map((a) => a.valor)) : [],
        declaradoEm: d.pcd === true && d.pcd_declarado_em ? paraDia(d.pcd_declarado_em) : null,
        opcoes: { tipos: TIPOS, apoios: APOIOS }
    };
}

router.get('/eu', async (req, res) => {
    try {
        const r = await pool.query('SELECT pcd, pcd_tipos, pcd_apoios, pcd_declarado_em FROM doadores WHERE usuario_id = $1', [req.usuario.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Complete seu perfil primeiro.' });
        res.json(montar(r.rows[0]));
    } catch (erro) {
        if (erro.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao buscar sua declaração: ' + erro.message });
    }
});

router.put('/eu', async (req, res) => {
    const { erro, pcd } = validarPcd(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const r = await pool.query(
            `UPDATE doadores SET pcd = $1, pcd_tipos = $2, pcd_apoios = $3, pcd_declarado_em = $4 WHERE usuario_id = $5
             RETURNING pcd, pcd_tipos, pcd_apoios, pcd_declarado_em`,
            [pcd.declarado, pcd.declarado ? pcd.tipos.join(',') : null, pcd.declarado && pcd.apoios.length ? pcd.apoios.join(',') : null,
                pcd.declarado ? new Date() : null, req.usuario.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Complete seu perfil primeiro.' });
        res.json(montar(r.rows[0]));
    } catch (e) {
        if (e.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao salvar sua declaração: ' + e.message });
    }
});

module.exports = router;
