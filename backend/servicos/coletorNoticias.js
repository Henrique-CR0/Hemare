// Hemare - Coletor do feed de noticias: baixa os RSS das fontes (regras/fontes.js), filtra e guarda o que e novo.
// Boas maneiras com os sites: um pedido por feed, tempo limite, tamanho limite e um User-Agent que diz quem somos.
// `buscar` e injetavel para os testes (nada vai para a internet nos testes).
const pool = require('../banco');
const { fontesAtivas } = require('../regras/fontes');
const { itensDoFeed } = require('../regras/feed');

const USER_AGENT = 'HemareBot/1.0 (+https://github.com/Henrique-CR0/Hemare; leitor de feeds RSS: mostra titulo e link da fonte)';
const TEMPO_LIMITE_MS = 12000;
const TAMANHO_MAXIMO = 3 * 1000 * 1000;
const GUARDAR_DIAS = 90;
const DIAS_PARA_CONFERIR_REPETICAO = 40;

let emAndamento = null;
let ultimaColeta = null;

// Decodifica pelo charset declarado no XML (alguns feeds antigos ainda vem em ISO-8859-1).
function decodificar(bytes) {
    const inicio = Buffer.from(bytes.slice(0, 300)).toString('latin1');
    const declarado = /encoding\s*=\s*["']([^"']+)["']/i.exec(inicio);
    try {
        return new TextDecoder(declarado ? declarado[1] : 'utf-8').decode(bytes);
    } catch (erro) {
        return new TextDecoder('utf-8').decode(bytes);
    }
}

async function baixar(url, buscar) {
    const r = await buscar(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        redirect: 'follow'
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > TAMANHO_MAXIMO) throw new Error('feed grande demais');
    return decodificar(bytes);
}

async function coletarFonte(fonte, vistos, opcoes) {
    const resultado = { id: fonte.id, nome: fonte.nome, ok: false, lidos: 0, novos: 0 };
    try {
        const xml = await baixar(fonte.url, opcoes.buscar);
        const itens = itensDoFeed(xml, fonte, opcoes.agora);
        resultado.ok = true;
        resultado.lidos = itens.length;
        for (const n of itens) {
            if (vistos.has(n.url) || vistos.has('t:' + n.chave)) continue;
            vistos.add(n.url); vistos.add('t:' + n.chave);
            try {
                await pool.query(
                    `INSERT INTO noticias_feed (titulo, resumo, fonte, url, imagem, categoria, uf, publicada_em, chave, busca)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [n.titulo, n.resumo, n.fonte, n.url, n.imagem, n.categoria, n.uf, n.publicadaEm, n.chave, n.busca]
                );
                resultado.novos++;
            } catch (erro) {
                if (erro.code !== '23505') throw erro; // link repetido: tudo bem
            }
        }
    } catch (erro) {
        resultado.erro = erro && erro.name === 'TimeoutError' ? 'demorou demais' : String((erro && erro.message) || erro).slice(0, 120);
    }
    return resultado;
}

// Uma rodada completa. Se ja tem uma rodando, devolve a mesma (dois cliques seguidos nao pedem tudo de novo).
function coletar(opcoes) {
    if (emAndamento) return emAndamento;
    const o = { buscar: (...a) => globalThis.fetch(...a), agora: new Date(), fontes: fontesAtivas(), ...(opcoes || {}) };
    emAndamento = (async () => {
        const iniciouEm = new Date();
        // Ja guardado recentemente (link ou titulo): nao entra de novo, mesmo vindo de outra fonte.
        const recentes = await pool.query('SELECT url, chave FROM noticias_feed WHERE coletada_em > $1',
            [new Date(o.agora.getTime() - DIAS_PARA_CONFERIR_REPETICAO * 86400000)]);
        const vistos = new Set();
        recentes.rows.forEach((l) => { vistos.add(l.url); vistos.add('t:' + l.chave); });

        const fontes = await Promise.all(o.fontes.map((f) => coletarFonte(f, vistos, o)));
        await pool.query('DELETE FROM noticias_feed WHERE coletada_em < $1', [new Date(o.agora.getTime() - GUARDAR_DIAS * 86400000)]);

        ultimaColeta = { iniciouEm: iniciouEm.toISOString(), terminouEm: new Date().toISOString(), novos: fontes.reduce((s, f) => s + f.novos, 0), fontes };
        return ultimaColeta;
    })().finally(() => { emAndamento = null; });
    return emAndamento;
}

function ultimaRodada() { return ultimaColeta; }

module.exports = { coletar, ultimaRodada, USER_AGENT };
