// Teste de ponta a ponta: feed de noticias (coletor de RSS + API publica + moderacao do admin).
// A internet e simulada: o fetch devolve XMLs de mentira e guarda o que foi pedido. Rode: node testes/e2e/noticias-feed.js  (ou npm test)
const amb = require('../ambiente').criarAmbiente(3079);
const { pool, URL, api, conta, checar, titulo } = amb;
const { fontesAtivas } = require('../../regras/fontes');

const HORAS = (h) => new Date(Date.now() - h * 3600 * 1000).toUTCString();
const item = (t, link, horas, extra) => `<item><title>${t}</title><link>${link}</link><pubDate>${HORAS(horas)}</pubDate>${extra || ''}</item>`;
const rss = (...itens) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>${itens.join('')}</channel></rss>`;
const desc = (texto) => `<description><![CDATA[${texto}]]></description>`;

// O que cada "site" responde. Os que nao estao aqui respondem 404.
const respostas = {};
const pedidos = [];
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, opcoes) => {
    if (!String(url).startsWith(URL)) {
        pedidos.push({ url: String(url), agente: opcoes && opcoes.headers && opcoes.headers['User-Agent'] });
        const r = respostas[url];
        if (r === undefined) return new Response('nao achei', { status: 404 });
        if (r instanceof Error) throw r;
        if (typeof r === 'number') return new Response('erro', { status: r });
        return new Response(r, { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
    }
    return fetchOriginal(url, opcoes);
};
const pelaFonte = (id) => fontesAtivas().find((f) => f.id === id).url;

async function main() {
    await amb.iniciar(['criar-noticias-feed.js']);

    const tDoador = await conta('Doador', 'd@x.com', 'doador');
    await conta('Admin', 'adm@x.com', 'doador');
    await pool.query("UPDATE usuarios SET tipo = 'admin' WHERE email = 'adm@x.com'");
    const tAdmin = (await api('POST', '/auth/login', null, { email: 'adm@x.com', senha: 'senha-forte-123' })).dados.token;

    titulo('Antes da primeira coleta');
    let r = await api('GET', '/noticias/feed');
    checar('Feed publico (sem login) abre vazio, com as 5 categorias', r.status === 200 && r.dados.itens.length === 0 && r.dados.categorias.length === 5 && r.dados.atualizadoEm === null, r.dados);

    titulo('Coleta');
    respostas[pelaFonte('agencia-brasil-saude')] = rss(
        item('Estoques de sangue estão baixos em Pernambuco e hemocentro pede doadores', 'https://abr.exemplo/estoque', 2,
            '<media:content url="https://img.exemplo.com/estoque.jpg" medium="image"/>' + desc('<p>O Hemope informou que todos os tipos sanguíneos estão abaixo do ideal.</p>')),
        item('Campanha de vacinação contra a gripe começa na segunda-feira', 'https://abr.exemplo/vacina', 5, desc('A meta é vacinar 90% do público-alvo até o fim do mês em todo o país.')),
        item('Estudo mostra benefícios da caminhada diária para o coração', 'https://abr.exemplo/caminhada', 30, desc('Pesquisadores acompanharam voluntários por cinco anos.'))
    );
    respostas[pelaFonte('hemocentro-ribeirao')] = rss(
        item('Estoques de sangue estão baixos em Pernambuco e hemocentro pede doadores', 'https://hemo.exemplo/copia', 1, desc('Mesma notícia republicada em outro site.')),
        item('Hemocentro abre horário especial para doação de sangue no feriado', 'https://hemo.exemplo/feriado', 8, desc('Quem puder, passe lá. O atendimento vai até as 18h.'))
    );
    respostas[pelaFonte('fiocruz')] = 500;
    respostas[pelaFonte('agencia-senado')] = new Error('sem rede');
    respostas[pelaFonte('agencia-brasil')] = rss(item('Senado aprova reforma tributária em primeiro turno', 'https://abr.exemplo/politica', 3, desc('Votação terminou de madrugada.')));

    r = await api('POST', '/noticias/feed/coletar', null);
    checar('Coletar sem login (401)', r.status === 401, r);
    r = await api('POST', '/noticias/feed/coletar', tDoador);
    checar('Doador NAO coleta (403)', r.status === 403, r);
    r = await api('POST', '/noticias/feed/coletar', tAdmin);
    checar('Admin coleta (200) e 4 noticias novas entram', r.status === 200 && r.dados.novos === 4, r.dados);
    const estado = Object.fromEntries(r.dados.fontes.map((f) => [f.id, f]));
    checar('Fonte que deu erro 500 aparece como fora do ar, sem derrubar as outras', estado['fiocruz'].ok === false && /500/.test(estado['fiocruz'].erro) && estado['agencia-brasil-saude'].ok === true, estado['fiocruz']);
    checar('Fonte sem rede tambem (so essa falha)', estado['agencia-senado'].ok === false && estado['agencia-senado'].erro === 'sem rede', estado['agencia-senado']);
    checar('Feed "geral" so guarda o que interessa (reforma tributaria ficou de fora)', estado['agencia-brasil'].ok === true && estado['agencia-brasil'].lidos === 0, estado['agencia-brasil']);
    checar('Cada feed foi pedido com o User-Agent do Hemare', pedidos.length >= 6 && pedidos.every((p) => /^HemareBot\//.test(p.agente || '')), pedidos.slice(0, 2));
    const hojeNoBanco = Number((await pool.query('SELECT COUNT(*) AS n FROM noticias_feed')).rows[0].n);
    checar('4 linhas no banco (a copia do mesmo titulo em outra fonte nao entrou)', hojeNoBanco === 4, hojeNoBanco);

    titulo('Feed publico');
    r = await api('GET', '/noticias/feed');
    const it = r.dados.itens;
    checar('4 itens, os mais novos primeiro', r.status === 200 && it.length === 4 && it[0].url === 'https://abr.exemplo/estoque', it.map((n) => n.titulo.slice(0, 20)));
    checar('Item traz titulo, trecho, fonte, link, imagem, categoria, estado e data ISO', it[0].resumo.startsWith('O Hemope informou') && it[0].fonte === 'Agência Brasil' && it[0].imagem === 'https://img.exemplo.com/estoque.jpg'
        && it[0].categoria === 'estoque' && it[0].uf === 'PE' && !Number.isNaN(Date.parse(it[0].publicadaEm)), it[0]);
    const contagem = Object.fromEntries(r.dados.categorias.map((c) => [c.id, c.total]));
    checar('Categorias: estoque, doacao, campanhas e saude contadas', contagem.estoque === 1 && contagem.doacao === 1 && contagem.campanhas === 1 && contagem.orgaos === 0 && contagem.saude === 1, contagem);
    checar('"Atualizado em" aparece', !Number.isNaN(Date.parse(r.dados.atualizadoEm)), r.dados.atualizadoEm);
    checar('Pode ficar em cache por 1 minuto', /max-age=60/.test(r.cabecalhos.get('cache-control') || ''), r.cabecalhos.get('cache-control'));
    checar('Nao expoe dado de usuario nem o texto de busca interno', !JSON.stringify(r.dados).includes('@x.com') && !('busca' in it[0]) && !('chave' in it[0]), it[0]);

    titulo('Filtros e busca');
    r = await api('GET', '/noticias/feed?categoria=campanhas');
    checar('Categoria campanhas: 1 item', r.dados.itens.length === 1 && r.dados.itens[0].categoria === 'campanhas' && r.dados.total === 1, r.dados.total);
    r = await api('GET', '/noticias/feed?uf=PE');
    checar('Estado PE: so a materia de Pernambuco', r.dados.itens.length === 1 && r.dados.itens[0].uf === 'PE', r.dados.itens.length);
    checar('...e as categorias respeitam o estado', r.dados.categorias.find((c) => c.id === 'estoque').total === 1 && r.dados.categorias.find((c) => c.id === 'saude').total === 0, r.dados.categorias);
    r = await api('GET', '/noticias/feed?q=DOACAO');
    checar('Busca sem acento e sem diferenciar maiuscula acha "doação"', r.dados.itens.length === 1 && /doa/i.test(r.dados.itens[0].titulo), r.dados.itens.map((n) => n.titulo));
    r = await api('GET', '/noticias/feed?q=' + encodeURIComponent('Hemope'));
    checar('Busca olha tambem o trecho', r.dados.itens.length === 1, r.dados.itens.length);
    r = await api('GET', '/noticias/feed?q=' + encodeURIComponent('%'));
    checar('Curinga "%" nao lista tudo (e tratado como texto)', r.status === 200 && r.dados.itens.length === 4, r.dados.itens.length);
    r = await api('GET', '/noticias/feed?q=' + encodeURIComponent("x'; DROP TABLE noticias_feed; --"));
    checar('Tentativa de injecao de SQL na busca: 200 e a tabela segue de pe', r.status === 200 && r.dados.itens.length === 0 && Number((await pool.query('SELECT COUNT(*) AS n FROM noticias_feed')).rows[0].n) === 4, r.dados);
    r = await api('GET', '/noticias/feed?categoria=xx&uf=ZZ&pagina=-3');
    checar('Filtros invalidos viram "sem filtro" (200, 4 itens)', r.status === 200 && r.dados.itens.length === 4 && r.dados.pagina === 1, r.dados.total);
    r = await api('GET', '/noticias/feed?pagina=5');
    checar('Pagina alem do fim: vazia, sem erro', r.status === 200 && r.dados.itens.length === 0 && r.dados.temMais === false, r.dados);

    titulo('Coletar de novo nao repete');
    r = await api('POST', '/noticias/feed/coletar', tAdmin);
    checar('Segunda coleta: 0 novas', r.status === 200 && r.dados.novos === 0, r.dados.novos);
    respostas[pelaFonte('agencia-brasil-saude')] = rss(
        item('Estoques de sangue estão baixos em Pernambuco e hemocentro pede doadores', 'https://abr.exemplo/estoque', 2),
        item('Ministério da Saúde lança campanha nacional de doação de órgãos', 'https://abr.exemplo/orgaos', 0.1, desc('A campanha incentiva as famílias a conversarem sobre o assunto.'))
    );
    r = await api('POST', '/noticias/feed/coletar', tAdmin);
    checar('Noticia nova numa coleta posterior entra (so ela)', r.dados.novos === 1, r.dados);
    r = await api('GET', '/noticias/feed');
    checar('...e aparece no topo, como "orgaos"', r.dados.itens[0].url === 'https://abr.exemplo/orgaos' && r.dados.itens[0].categoria === 'orgaos' && r.dados.total === 5, r.dados.itens[0]);

    titulo('Paginas');
    const muitos = [];
    for (let n = 1; n <= 25; n++) muitos.push(item('Hemocentro ' + n + ' abre mutirão de doação de sangue neste fim de semana', 'https://hemo.exemplo/m' + n, 10 + n));
    respostas[pelaFonte('hemocentro-ribeirao')] = rss(...muitos);
    await api('POST', '/noticias/feed/coletar', tAdmin);
    r = await api('GET', '/noticias/feed');
    checar('Pagina 1 traz 20 e diz que tem mais', r.dados.itens.length === 20 && r.dados.temMais === true && r.dados.total === 30, [r.dados.itens.length, r.dados.total]);
    const p2 = await api('GET', '/noticias/feed?pagina=2');
    checar('Pagina 2 traz o resto (10) e diz que acabou', p2.dados.itens.length === 10 && p2.dados.temMais === false, p2.dados.itens.length);
    const ids = new Set([...r.dados.itens, ...p2.dados.itens].map((n) => n.id));
    checar('Nenhuma noticia aparece nas duas paginas', ids.size === 30, ids.size);

    titulo('Moderacao do admin');
    const alvo = r.dados.itens[0];
    r = await api('PUT', '/noticias/feed/' + alvo.id + '/ocultar', tDoador, {});
    checar('Doador NAO esconde (403)', r.status === 403, r);
    r = await api('PUT', '/noticias/feed/abc/ocultar', tAdmin, {});
    checar('Id invalido (400)', r.status === 400, r);
    r = await api('PUT', '/noticias/feed/99999/ocultar', tAdmin, {});
    checar('Noticia inexistente (404)', r.status === 404, r);
    r = await api('PUT', '/noticias/feed/' + alvo.id + '/ocultar', tAdmin, {});
    checar('Admin esconde (200)', r.status === 200 && r.dados.oculta === true, r);
    r = await api('GET', '/noticias/feed');
    checar('Escondida some do feed publico', !r.dados.itens.some((n) => n.id === alvo.id) && r.dados.total === 29, r.dados.total);
    await api('POST', '/noticias/feed/coletar', tAdmin);
    r = await api('GET', '/noticias/feed');
    checar('A coleta seguinte NAO traz a escondida de volta', !r.dados.itens.some((n) => n.id === alvo.id) && r.dados.total === 29, r.dados.total);
    r = await api('PUT', '/noticias/feed/' + alvo.id + '/ocultar', tAdmin, { oculta: false });
    checar('Admin desfaz (volta ao feed)', r.status === 200 && r.dados.oculta === false, r);
    r = await api('GET', '/noticias/feed');
    checar('...e ela reaparece', r.dados.total === 30, r.dados.total);

    titulo('Painel da coleta (admin)');
    r = await api('GET', '/noticias/feed/coleta', tDoador);
    checar('Doador NAO ve o painel da coleta (403)', r.status === 403, r);
    r = await api('GET', '/noticias/feed/coleta', tAdmin);
    checar('Admin ve a ultima coleta e as fontes com a licenca de cada uma', r.status === 200 && r.dados.ultima.fontes.length > 0 && r.dados.fontes.length === fontesAtivas().length && r.dados.fontes.every((f) => f.licenca), r.status);
    checar('Fontes comerciais desligadas (g1) nao foram pedidas', !pedidos.some((p) => p.url.includes('globo.com')), pedidos.filter((p) => p.url.includes('globo')));

    titulo('Limpeza de itens velhos');
    await pool.query("INSERT INTO noticias_feed (titulo, fonte, url, categoria, publicada_em, coletada_em, chave) VALUES ('Antiga demais para ficar guardada', 'X', 'https://velha.exemplo/a', 'saude', $1, $1, 'antiga')", [new Date(Date.now() - 100 * 86400000)]);
    await api('POST', '/noticias/feed/coletar', tAdmin);
    const velha = (await pool.query("SELECT COUNT(*) AS n FROM noticias_feed WHERE url = 'https://velha.exemplo/a'")).rows[0].n;
    checar('Coleta apaga o que tem mais de 90 dias', Number(velha) === 0, velha);

    amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
