// Hemare - Regras do canal de noticias por estado.
//
// Por que nao "puxar" noticias sozinho de um buscador? Os feeds gratuitos (Google Noticias, GDELT) proibem ou
// limitam o uso em sites publicos. Entao o canal junta duas fontes seguras:
//   1. AVISOS CURADOS: um administrador cadastra o resumo (com as palavras dele) e o LINK da materia original.
//      O Hemare mostra so titulo, resumo curto, fonte e link: quem quer ler tudo clica e vai ao site de origem.
//   2. SINAIS DO HEMARE: calculados na hora com o estoque e os pedidos dos hospitais cadastrados aqui.

const UFS = [
    ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'],
    ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'],
    ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
    ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
    ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'],
    ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']
].map(([sigla, nome]) => ({ sigla, nome }));

// Do mais grave para o menos grave. 'sem-dados' e o que sobra quando nao ha informacao.
const NIVEIS = ['critico', 'alerta', 'atencao', 'estavel', 'sem-dados'];

const ROTULOS_NIVEL = {
    'critico': 'Estoque crítico',
    'alerta': 'Em alerta',
    'atencao': 'Atenção',
    'estavel': 'Estável',
    'sem-dados': 'Sem dados recentes'
};

// Aceita "pe", " PE " etc. Devolve a sigla ou null.
function normalizarUf(texto) {
    if (typeof texto !== 'string') return null;
    const uf = texto.trim().toUpperCase();
    return UFS.some((e) => e.sigla === uf) ? uf : null;
}

// Link seguro: so http/https (bloqueia "javascript:" e afins).
function urlSegura(texto) {
    if (typeof texto !== 'string' || texto.length > 500) return null;
    try {
        const u = new URL(texto.trim());
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
    } catch (erro) {
        return null;
    }
}

function limpar(texto) {
    return typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim() : '';
}

// Confere o aviso cadastrado pelo administrador. Devolve { erro } ou { noticia } limpo.
function validarNoticia(corpo) {
    const c = corpo || {};

    const uf = normalizarUf(c.uf);
    if (!uf) return { erro: 'Escolha o estado.' };

    const titulo = limpar(c.titulo);
    if (titulo.length < 8 || titulo.length > 160) return { erro: 'O título deve ter de 8 a 160 caracteres.' };

    const resumo = limpar(c.resumo);
    if (resumo.length < 20 || resumo.length > 400) {
        return { erro: 'O resumo deve ter de 20 a 400 caracteres (escreva com as suas palavras, sem copiar a matéria).' };
    }

    const fonte = limpar(c.fonte);
    if (fonte.length < 2 || fonte.length > 60) return { erro: 'Informe o nome da fonte (ex.: Agência Brasil).' };

    const url = urlSegura(c.url);
    if (!url) return { erro: 'Informe o link da matéria original (começando com https://).' };

    const nivel = c.nivel === undefined || c.nivel === '' ? 'sem-dados' : c.nivel;
    if (!NIVEIS.includes(nivel)) return { erro: 'Escolha o nível: crítico, alerta, atenção, estável ou sem dados.' };

    const referencia = limpar(c.referencia);
    if (referencia.length > 30) return { erro: 'A referência de data deve ter até 30 caracteres (ex.: "set/2026").' };

    return { noticia: { uf, titulo, resumo, fonte, url, nivel, referencia: referencia || null } };
}

// Sinais do Hemare para um estado, a partir do que os hospitais cadastrados informaram.
// dados: { estoque: { critico, alerta, total }, necessidadesUrgentes, campanhasAtivas, casosApadrinhamento, hospitais }
function nivelDosSinais(dados) {
    if (!dados || !dados.hospitais) return 'sem-dados';
    if (dados.estoque.critico > 0 || dados.necessidadesUrgentes > 0) return 'critico';
    if (dados.estoque.alerta > 0) return 'alerta';
    return dados.estoque.total > 0 ? 'estavel' : 'sem-dados';
}

// Junta os avisos e os sinais de cada estado e ordena do mais grave para o mais tranquilo.
// noticiasPorUf: { PE: [{ id, ... }] } (mais recente primeiro); sinaisPorUf: { PE: { ... } }
function montarPanorama(noticiasPorUf, sinaisPorUf) {
    const estados = UFS.map((estado) => {
        const noticias = (noticiasPorUf && noticiasPorUf[estado.sigla]) || [];
        const sinais = (sinaisPorUf && sinaisPorUf[estado.sigla]) || null;
        // O nivel do estado e o da noticia MAIS RECENTE: um aviso novo "estavel" substitui um antigo "critico".
        const nivelNoticias = noticias.length > 0 ? noticias[0].nivel : 'sem-dados';
        const nivelHemare = nivelDosSinais(sinais);
        const nivel = NIVEIS[Math.min(NIVEIS.indexOf(nivelNoticias), NIVEIS.indexOf(nivelHemare))];
        return { ...estado, nivel, nivelNoticias, nivelHemare, noticias, sinais };
    }).sort((a, b) => NIVEIS.indexOf(a.nivel) - NIVEIS.indexOf(b.nivel) || a.nome.localeCompare(b.nome));

    const contagem = {};
    NIVEIS.forEach((n) => { contagem[n] = estados.filter((e) => e.nivel === n).length; });
    return { estados, contagem };
}

module.exports = { UFS, NIVEIS, ROTULOS_NIVEL, normalizarUf, urlSegura, validarNoticia, nivelDosSinais, montarPanorama };
