// Hemare - Rotas do canal de noticias por estado.
// Publico: panorama dos 27 estados (avisos curados + sinais calculados com os hospitais do Hemare).
// Administrador: cadastra e remove avisos (resumo proprio + link da materia original).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirAdmin } = require('../middleware/exigirPapel');
const { normalizarUf, validarNoticia, montarPanorama } = require('../regras/noticias');

const router = express.Router();

const AVISOS_POR_ESTADO = 5;

// Consulta que pode falhar sem derrubar a pagina (ex.: tabela de um recurso novo ainda nao criada).
async function consultaOpcional(sql) {
    try {
        return (await pool.query(sql)).rows;
    } catch (erro) {
        return [];
    }
}

// Sinais por estado a partir dos hospitais APROVADOS do Hemare.
async function calcularSinais() {
    const sinais = {};
    function sinal(uf) {
        if (!sinais[uf]) {
            sinais[uf] = { hospitais: 0, estoque: { critico: 0, alerta: 0, total: 0 }, necessidadesUrgentes: 0, campanhasAtivas: 0, casosApadrinhamento: 0 };
        }
        return sinais[uf];
    }

    const hospitais = await pool.query('SELECT estado AS uf, COUNT(*) AS total FROM hospitais WHERE aprovado = true GROUP BY estado');
    hospitais.rows.forEach((l) => { const uf = normalizarUf(l.uf); if (uf) sinal(uf).hospitais += Number(l.total); });

    const estoque = await pool.query(
        `SELECT h.estado AS uf, e.nivel, COUNT(*) AS total
           FROM estoque e JOIN hospitais h ON h.id = e.hospital_id
          WHERE h.aprovado = true GROUP BY h.estado, e.nivel`
    );
    estoque.rows.forEach((l) => {
        const uf = normalizarUf(l.uf);
        if (!uf) return;
        const s = sinal(uf).estoque;
        s.total += Number(l.total);
        if (l.nivel === 'critico' || l.nivel === 'emergencia') s.critico += Number(l.total);
        else if (l.nivel === 'alerta') s.alerta += Number(l.total);
    });

    const urgentes = await pool.query(
        `SELECT h.estado AS uf, COUNT(*) AS total
           FROM necessidades n JOIN hospitais h ON h.id = n.hospital_id
          WHERE h.aprovado = true AND n.status = 'aberta' AND n.urgencia IN ('critico', 'emergencia')
          GROUP BY h.estado`
    );
    urgentes.rows.forEach((l) => { const uf = normalizarUf(l.uf); if (uf) sinal(uf).necessidadesUrgentes += Number(l.total); });

    const campanhas = await consultaOpcional(
        `SELECT h.estado AS uf, COUNT(*) AS total
           FROM campanhas_reposicao c JOIN hospitais h ON h.id = c.hospital_id
          WHERE h.aprovado = true AND c.ativo = true AND c.expira_em >= CURRENT_DATE
          GROUP BY h.estado`
    );
    campanhas.forEach((l) => { const uf = normalizarUf(l.uf); if (uf) sinal(uf).campanhasAtivas += Number(l.total); });

    const casos = await consultaOpcional(
        `SELECT h.estado AS uf, COUNT(*) AS total
           FROM casos_apadrinhamento c JOIN hospitais h ON h.id = c.hospital_id
          WHERE h.aprovado = true AND c.ativo = true
          GROUP BY h.estado`
    );
    casos.forEach((l) => { const uf = normalizarUf(l.uf); if (uf) sinal(uf).casosApadrinhamento += Number(l.total); });

    return sinais;
}

// PUBLICO: panorama dos 27 estados, do mais grave para o mais tranquilo.
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, uf, titulo, resumo, fonte, url, nivel, referencia, criada_em FROM noticias ORDER BY id DESC');
        const porUf = {};
        r.rows.forEach((n) => {
            const uf = normalizarUf(n.uf);
            if (!uf) return;
            (porUf[uf] = porUf[uf] || []).push({
                id: n.id, titulo: n.titulo, resumo: n.resumo, fonte: n.fonte, url: n.url,
                nivel: n.nivel, referencia: n.referencia, cadastradaEm: n.criada_em
            });
        });
        Object.keys(porUf).forEach((uf) => { porUf[uf] = porUf[uf].slice(0, AVISOS_POR_ESTADO); });

        res.json(montarPanorama(porUf, await calcularSinais()));
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao montar o panorama: ' + erro.message });
    }
});

// ADMIN: cadastra um aviso.
router.post('/', autenticar, exigirAdmin, async (req, res) => {
    const { erro, noticia } = validarNoticia(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const r = await pool.query(
            `INSERT INTO noticias (uf, titulo, resumo, fonte, url, nivel, referencia, criada_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [noticia.uf, noticia.titulo, noticia.resumo, noticia.fonte, noticia.url, noticia.nivel, noticia.referencia, req.usuario.id]
        );
        res.status(201).json({ id: r.rows[0].id, mensagem: 'Aviso publicado no canal de notícias.' });
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ erro: 'Esse link já foi cadastrado.' });
        res.status(500).json({ erro: 'Erro ao publicar: ' + e.message });
    }
});

// ADMIN: remove um aviso.
router.delete('/:id', autenticar, exigirAdmin, async (req, res) => {
    if (!/^[0-9]{1,9}$/.test(req.params.id)) return res.status(400).json({ erro: 'Aviso inválido.' });
    try {
        const r = await pool.query('DELETE FROM noticias WHERE id = $1 RETURNING id', [Number(req.params.id)]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Aviso não encontrado.' });
        res.json({ mensagem: 'Aviso removido.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao remover: ' + erro.message });
    }
});

module.exports = router;
