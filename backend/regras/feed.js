// Hemare - Regras do feed de noticias (estilo "Google Noticias"): le RSS/Atom, limpa, classifica e evita repeticao.
// Tudo aqui e puro (sem rede e sem banco): quem busca os feeds e o servicos/coletorNoticias.js.
// O Hemare guarda e mostra so: titulo, trecho curto, imagem de divulgacao do feed, link da materia e nome da fonte.
const { UFS, urlSegura } = require('./noticias');

const CATEGORIAS = [
    { id: 'doacao', rotulo: 'Doação de sangue' },
    { id: 'estoque', rotulo: 'Estoques e urgência' },
    { id: 'campanhas', rotulo: 'Campanhas' },
    { id: 'orgaos', rotulo: 'Órgãos, medula e leite' },
    { id: 'saude', rotulo: 'Saúde' }
];

const MAX_TITULO = 300;
const MAX_RESUMO = 240;
const IDADE_MAXIMA_DIAS = 30;

// ---------- Texto ----------

// Minusculas e sem acento, para comparar palavras.
function normalizar(texto) {
    return String(texto == null ? '' : texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»' };

function decodificarEntidades(texto) {
    return String(texto).replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (inteiro, nome) => {
        if (nome[0] === '#') {
            const codigo = nome[1].toLowerCase() === 'x' ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
            return codigo > 0 && codigo < 0x110000 ? String.fromCodePoint(codigo) : '';
        }
        return Object.prototype.hasOwnProperty.call(ENTIDADES, nome.toLowerCase()) ? ENTIDADES[nome.toLowerCase()] : inteiro;
    });
}

// Conteudo de uma tag do XML: se vem em CDATA e literal; senao tem entidades (&lt; etc.) para decodificar.
function valorDaTag(bruto) {
    const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(bruto);
    return cdata ? cdata[1] : decodificarEntidades(bruto);
}

// Tira o HTML e deixa so o texto corrido.
function textoSimples(html) {
    if (typeof html !== 'string') return '';
    const semBlocos = html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/?(p|br|div|li|h[1-6]|tr|blockquote)\b[^>]*>/gi, ' ')
        .replace(/<[a-zA-Z/!][^>]*>/g, '');
    return decodificarEntidades(semBlocos).replace(/\s+/g, ' ').trim();
}

// Trecho curto com reticencias, cortando em palavra inteira.
function trecho(texto, max) {
    const t = String(texto || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const corte = t.slice(0, max - 1);
    const ultimoEspaco = corte.lastIndexOf(' ');
    return (ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : corte).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

// Resumo: sem o titulo repetido no comeco, sem rodape de plugin ("O post ... apareceu primeiro em ...") e curto.
function resumoLimpo(texto, titulo) {
    let t = String(texto || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*O post .{0,200} apareceu primeiro em .{0,100}$/i, '').replace(/\s*\[(…|\.\.\.)\]\s*$/, '…');
    const nt = normalizar(titulo).trim();
    if (nt && normalizar(t).startsWith(nt)) t = t.slice(nt.length).replace(/^[\s:.\-–—]+/, '');
    return trecho(t, MAX_RESUMO);
}

// ---------- XML (RSS 2.0, Atom e RSS 1.0/RDF) ----------

function escaparRegex(texto) { return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function blocos(xml) {
    const achados = [];
    const re = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) achados.push(m[2]);
    return achados;
}

// Primeira tag com esse nome (aceita prefixo, ex.: "dc:date"). Devolve o texto ja decodificado ou ''.
function tag(bloco, nome) {
    const re = new RegExp('<' + escaparRegex(nome) + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + escaparRegex(nome) + '>', 'i');
    const m = re.exec(bloco);
    return m ? valorDaTag(m[1]) : '';
}

function atributo(texto, nome) {
    const m = new RegExp('\\b' + nome + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(texto);
    return m ? decodificarEntidades(m[2] !== undefined ? m[2] : m[3]) : '';
}

// Link da materia: Atom usa <link href="..."/>; RSS usa <link>texto</link>.
function linkDoBloco(bloco) {
    const re = /<link\b([^>]*?)\/?>/gi;
    let m;
    while ((m = re.exec(bloco)) !== null) {
        const rel = atributo(m[1], 'rel');
        const href = atributo(m[1], 'href');
        if (href && (!rel || rel === 'alternate')) return href;
    }
    const comTexto = tag(bloco, 'link').trim();
    if (comTexto) return comTexto;
    const guid = tag(bloco, 'guid').trim();
    return /^https?:\/\//i.test(guid) ? guid : '';
}

// Imagens que nao sao a foto da materia: logos, pixels de rastreio, gifs e svgs.
const IMAGEM_RUIM = /(logo|pixel|spacer|rastre|1x1|avatar|favicon|\/ebc\.(png|gif)|\.svg|\.gif)/i;

function imagemValida(url) {
    const u = urlSegura(url || '');
    if (!u || !u.startsWith('https://') || IMAGEM_RUIM.test(u)) return null;
    return u;
}

function imagemDoBloco(bloco) {
    const candidatas = [];
    const enc = /<enclosure\b([^>]*)>/gi;
    let m;
    while ((m = enc.exec(bloco)) !== null) {
        if (/^image\//i.test(atributo(m[1], 'type')) || /\.(jpe?g|png|webp)(\?|$)/i.test(atributo(m[1], 'url'))) candidatas.push(atributo(m[1], 'url'));
    }
    const media = /<media:(content|thumbnail)\b([^>]*)>/gi;
    while ((m = media.exec(bloco)) !== null) {
        const tipo = atributo(m[2], 'type'), medio = atributo(m[2], 'medium');
        if (m[1] === 'thumbnail' || medio === 'image' || /^image\//i.test(tipo) || (!tipo && !medio)) candidatas.push(atributo(m[2], 'url'));
    }
    candidatas.push(tag(bloco, 'imagem-destaque').trim());
    // Ultimo recurso: a primeira <img> do texto do feed.
    const html = [tag(bloco, 'description'), tag(bloco, 'content:encoded'), tag(bloco, 'content'), tag(bloco, 'summary')].join(' ');
    const img = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
    while ((m = img.exec(html)) !== null) candidatas.push(decodificarEntidades(m[1]));
    for (const c of candidatas) {
        const ok = imagemValida(c);
        if (ok) return ok;
    }
    return null;
}

function dataDoBloco(bloco) {
    for (const nome of ['pubDate', 'published', 'updated', 'dc:date', 'date']) {
        const bruto = tag(bloco, nome).trim();
        if (!bruto) continue;
        const ms = Date.parse(bruto);
        if (!Number.isNaN(ms)) return new Date(ms);
    }
    return null;
}

// Le o XML de um feed e devolve os itens "crus": { titulo, resumo, url, imagem, data(Date|null) }.
function lerFeed(xml, opcoes) {
    if (typeof xml !== 'string' || xml.length === 0) return [];
    const semResumo = !!(opcoes && opcoes.semResumo);
    return blocos(xml).map((b) => {
        const titulo = textoSimples(tag(b, 'title'));
        let resumo = '';
        if (!semResumo) {
            for (const nome of ['atom:subtitle', 'summary', 'description', 'content:encoded', 'content']) {
                const t = textoSimples(tag(b, nome));
                if (t.length >= 40) { resumo = t; break; }
                if (!resumo) resumo = t;
            }
        }
        return { titulo, resumo, url: linkDoBloco(b).trim(), imagem: imagemDoBloco(b), data: dataDoBloco(b) };
    });
}

// ---------- Classificacao ----------

// DOACAO: fala de doar, de bolsas, de estoques ou de pedir sangue. HEMO: so cita a rede de sangue (hemocentro, doenca do sangue):
// interessa ao leitor, mas e "saude", a nao ser que peca doadores.
const SANGUE = /(doa(cao|coes)? de sangue|doar sangue|doe sangue|doador(es|a|as)? de sangue|sangue doado|bolsas? de sangue|banco(s)? de sangue|transfusa|transfusoes|plaqueta|estoque(s)? de sangue|estoque(s)? .{0,25}sangue|sangue .{0,20}estoque|tipo(s)? sanguineo|sangue raro|junho vermelho|dia (mundial|nacional) do doador)/;
const HEMO = /(hemocentro|hemoterapi|hemonucleo|hemorrede|hemovida|doenca falciforme|anemia falciforme|hemofilia)/;
const PEDE_DOADORES = /(doador|doar|doacao|doacoes)/;
const URGENCIA = /(estoque|urgen|emergencia|baix[oa]s?|critic|queda|falta|reforc|apelo|apela|pede|pedem|convoca|precisa)/;
const ORGAOS = /(doa(cao|coes) de orgaos?|doador(es|a|as)? de orgaos?|transplante|medula ossea|redome|doador(es|a|as)? de medula|banco(s)? de leite|leite humano|doa(cao|r) de leite)/;
const CAMPANHA = /(campanha|mutirao|semana (nacional|de)|vacinacao|multivacinacao|outubro rosa|novembro azul|setembro amarelo|janeiro branco|agosto dourado|junho vermelho|maio amarelo|mobilizacao)/;
const CONTEXTO_SAUDE = /(saude|vacin|\bsus\b|hospital|doenca|prevencao|imunizacao|doa(cao|r)|sangue)/;

// Devolve a categoria ('doacao', 'estoque', 'campanhas', 'orgaos', 'saude') ou null se o item nao interessa.
function classificar(item, fonte) {
    const t = normalizar(item.titulo + ' ' + item.resumo);
    const hemo = HEMO.test(t);
    const sangue = SANGUE.test(t) || (hemo && PEDE_DOADORES.test(t));
    if (sangue && URGENCIA.test(t)) return 'estoque';
    if (sangue) return 'doacao';
    if (ORGAOS.test(t)) return 'orgaos';
    if (CAMPANHA.test(t) && (fonte.tipo !== 'geral' || CONTEXTO_SAUDE.test(t))) return 'campanhas';
    if (hemo || fonte.tipo === 'sangue' || fonte.tipo === 'saude') return 'saude';
    return null;
}

// Estado citado no texto. So vale se for UM estado so (nomes mais longos primeiro: "Mato Grosso do Sul" antes de "Mato Grosso").
// "Pará" so conta com acento e inicial maiuscula, porque "para" e uma palavra comum.
const UFS_POR_NOME = [...UFS].sort((a, b) => b.nome.length - a.nome.length);

function detectarUf(texto, ufDaFonte) {
    if (ufDaFonte) return ufDaFonte;
    let resto = String(texto || '');
    const achadas = new Set();
    for (const e of UFS_POR_NOME) {
        // \b nao funciona com letra acentuada no fim ("Amapá"), por isso o limite de palavra usa lookaround.
        const re = e.sigla === 'PA' ? /(?<!\p{L})Pará(?!\p{L})/gu : new RegExp('(?<!\\p{L})' + e.nome.replace(/\s+/g, '\\s+') + '(?!\\p{L})', 'giu');
        if (re.test(resto)) {
            achadas.add(e.sigla);
            resto = resto.replace(re, ' ');
        }
    }
    if (/(?<!\p{L})Bras[ií]lia(?!\p{L})/u.test(resto)) achadas.add('DF');
    return achadas.size === 1 ? [...achadas][0] : null;
}

// Chave para achar a mesma materia republicada (mesmo titulo, fonte diferente).
function chaveDoTitulo(titulo) {
    return normalizar(titulo).replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70);
}

// Do XML de um feed para os itens prontos para guardar. `agora` e injetavel para os testes.
function itensDoFeed(xml, fonte, agora) {
    const hoje = agora || new Date();
    const limite = hoje.getTime() - IDADE_MAXIMA_DIAS * 86400000;
    const vistos = new Set();
    const prontos = [];
    for (const cru of lerFeed(xml, fonte)) {
        const url = urlSegura(cru.url);
        const titulo = trecho(cru.titulo, MAX_TITULO);
        if (!url || titulo.length < 15) continue;
        // Sem data confiavel nao entra: nao da para dizer que e recente. Data no futuro vira "agora".
        if (!cru.data) continue;
        const publicada = new Date(Math.min(cru.data.getTime(), hoje.getTime()));
        if (publicada.getTime() < limite) continue;
        const resumo = resumoLimpo(cru.resumo, titulo);
        const categoria = classificar({ titulo, resumo }, fonte);
        if (!categoria) continue;
        const chave = chaveDoTitulo(titulo);
        if (vistos.has(url) || vistos.has('t:' + chave)) continue;
        vistos.add(url); vistos.add('t:' + chave);
        prontos.push({
            titulo, resumo, url, imagem: cru.imagem, publicadaEm: publicada.toISOString(), fonte: fonte.nome,
            categoria, uf: detectarUf(titulo + ' ' + resumo, fonte.uf), chave,
            busca: normalizar(titulo + ' ' + resumo + ' ' + fonte.nome)
        });
    }
    return prontos;
}

// ---------- Consulta do feed (entrada da API) ----------

const POR_PAGINA = 20;

// Valida os filtros que vem da URL. Valor estranho vira "sem filtro"; nunca da erro.
function lerFiltros(consulta) {
    const q = consulta || {};
    const categoria = CATEGORIAS.some((c) => c.id === q.categoria) ? q.categoria : null;
    const uf = typeof q.uf === 'string' && UFS.some((e) => e.sigla === q.uf.trim().toUpperCase()) ? q.uf.trim().toUpperCase() : null;
    const busca = typeof q.q === 'string' ? q.q.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    const pagina = Math.min(Math.max(parseInt(q.pagina, 10) || 1, 1), 50);
    return { categoria, uf, busca, pagina };
}

// Termo da busca LIKE: sem acento e sem os curingas (% _ \), que a pessoa nao deve conseguir usar.
function termoLike(busca) {
    return '%' + normalizar(busca).replace(/[\\%_]/g, ' ').replace(/\s+/g, ' ').trim() + '%';
}

module.exports = {
    CATEGORIAS, MAX_TITULO, MAX_RESUMO, IDADE_MAXIMA_DIAS, POR_PAGINA,
    normalizar, decodificarEntidades, textoSimples, trecho, resumoLimpo, lerFeed, classificar, detectarUf,
    chaveDoTitulo, itensDoFeed, lerFiltros, termoLike
};
