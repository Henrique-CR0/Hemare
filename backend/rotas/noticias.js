// Hemare - Rotas do canal de noticias.
// Publico: feed de noticias (estilo Google Noticias, coletado dos RSS das fontes) e o panorama dos 27 estados
// (avisos curados + sinais calculados com os hospitais do Hemare).
// Administrador: coleta o feed na hora, esconde noticias, e cadastra/remove avisos (resumo proprio + link da materia original).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirAdmin } = require('../middleware/exigirPapel');
const { normalizarUf, validarNoticia, montarPanorama } = require('../regras/noticias');
const { CATEGORIAS, POR_PAGINA, lerFiltros, termoLike } = require('../regras/feed');
const { fontesAtivas } = require('../regras/fontes');
const { coletar, ultimaRodada } = require('../servicos/coletorNoticias');

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

// PUBLICO: feed de noticias (estilo Google Noticias), mais novas primeiro.
// Filtros: ?categoria=doacao|estoque|campanhas|orgaos|saude  ?uf=PE  ?q=texto  ?pagina=2
router.get('/feed', async (req, res) => {
    const f = lerFiltros(req.query);
    const onde = ['oculta = false'];
    const valores = [];
    if (f.uf) { valores.push(f.uf); onde.push('uf = $' + valores.length); }
    if (f.busca) { valores.push(termoLike(f.busca)); onde.push('busca LIKE $' + valores.length); }
    const ondeSemCategoria = onde.join(' AND ');
    if (f.categoria) { valores.push(f.categoria); onde.push('categoria = $' + valores.length); }
    const ondeTudo = onde.join(' AND ');
    try {
        const total = Number((await pool.query('SELECT COUNT(*) AS n FROM noticias_feed WHERE ' + ondeTudo, valores)).rows[0].n);
        const pagina = await pool.query(
            `SELECT id, titulo, resumo, fonte, url, imagem, categoria, uf, publicada_em
               FROM noticias_feed WHERE ${ondeTudo}
              ORDER BY publicada_em DESC, id DESC LIMIT ${POR_PAGINA} OFFSET ${(f.pagina - 1) * POR_PAGINA}`, valores);
        // Contagem de cada categoria com os mesmos filtros de estado e busca (para os botoes mostrarem quantas ha).
        const valoresSemCategoria = f.categoria ? valores.slice(0, -1) : valores;
        const porCategoria = {};
        (await pool.query('SELECT categoria, COUNT(*) AS n FROM noticias_feed WHERE ' + ondeSemCategoria + ' GROUP BY categoria', valoresSemCategoria))
            .rows.forEach((l) => { porCategoria[l.categoria] = Number(l.n); });
        const ultima = (await pool.query('SELECT MAX(coletada_em) AS ultima FROM noticias_feed')).rows[0].ultima;

        res.set('Cache-Control', 'public, max-age=60');
        res.json({
            itens: pagina.rows.map((n) => ({
                id: n.id, titulo: n.titulo, resumo: n.resumo, fonte: n.fonte, url: n.url, imagem: n.imagem,
                categoria: n.categoria, uf: n.uf, publicadaEm: new Date(n.publicada_em).toISOString()
            })),
            total, pagina: f.pagina, porPagina: POR_PAGINA, temMais: f.pagina * POR_PAGINA < total,
            categorias: CATEGORIAS.map((c) => ({ id: c.id, rotulo: c.rotulo, total: porCategoria[c.id] || 0 })),
            atualizadoEm: ultima ? new Date(ultima).toISOString() : null
        });
    } catch (erro) {
        // Tabela ainda nao criada (falta rodar a migracao): a pagina mostra "sem noticias" em vez de quebrar.
        if (erro.code === '42P01') {
            return res.json({ itens: [], total: 0, pagina: 1, porPagina: POR_PAGINA, temMais: false,
                categorias: CATEGORIAS.map((c) => ({ id: c.id, rotulo: c.rotulo, total: 0 })), atualizadoEm: null });
        }
        res.status(500).json({ erro: 'Erro ao carregar as notícias: ' + erro.message });
    }
});

// ADMIN: coleta os feeds agora (sem esperar a hora cheia) e mostra o resultado de cada fonte.
router.post('/feed/coletar', autenticar, exigirAdmin, async (req, res) => {
    try {
        res.json(await coletar());
    } catch (erro) {
        res.status(500).json({ erro: 'Erro na coleta: ' + erro.message });
    }
});

// ADMIN: resultado da ultima coleta (quais fontes responderam, quantas notícias novas).
router.get('/feed/coleta', autenticar, exigirAdmin, (req, res) => {
    res.json({ ultima: ultimaRodada(), fontes: fontesAtivas().map((f) => ({ id: f.id, nome: f.nome, tipo: f.tipo, url: f.url, licenca: f.licenca })) });
});

// ADMIN: esconde (ou volta a mostrar) uma noticia do feed. Ela continua guardada, entao a coleta nao a traz de volta.
router.put('/feed/:id/ocultar', autenticar, exigirAdmin, async (req, res) => {
    if (!/^[0-9]{1,9}$/.test(req.params.id)) return res.status(400).json({ erro: 'Notícia inválida.' });
    const oculta = !(req.body && req.body.oculta === false);
    try {
        const r = await pool.query('UPDATE noticias_feed SET oculta = $1 WHERE id = $2 RETURNING id', [oculta, Number(req.params.id)]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Notícia não encontrada.' });
        res.json({ id: r.rows[0].id, oculta, mensagem: oculta ? 'Notícia escondida do feed.' : 'Notícia de volta ao feed.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao atualizar: ' + erro.message });
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

// ADMIN: corrige um aviso (substitui os campos, como no cadastro).
router.put('/:id', autenticar, exigirAdmin, async (req, res) => {
    if (!/^[0-9]{1,9}$/.test(req.params.id)) return res.status(400).json({ erro: 'Aviso inválido.' });
    const { erro, noticia } = validarNoticia(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const r = await pool.query(
            `UPDATE noticias SET uf = $1, titulo = $2, resumo = $3, fonte = $4, url = $5, nivel = $6, referencia = $7
              WHERE id = $8 RETURNING id`,
            [noticia.uf, noticia.titulo, noticia.resumo, noticia.fonte, noticia.url, noticia.nivel, noticia.referencia, Number(req.params.id)]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Aviso não encontrado.' });
        res.json({ id: r.rows[0].id, mensagem: 'Aviso atualizado.' });
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ erro: 'Esse link já foi cadastrado em outro aviso.' });
        res.status(500).json({ erro: 'Erro ao atualizar: ' + e.message });
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
