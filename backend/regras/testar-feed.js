// Testes das regras do feed de noticias (leitura de RSS/Atom, classificacao, estado, repeticao). Rode: node regras/testar-feed.js
const F = require('./feed');
const { FONTES, fontesAtivas } = require('./fontes');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const AGORA = new Date('2026-10-30T15:00:00Z');
const saude = { nome: 'Agência Brasil', tipo: 'saude' };
const geral = { nome: 'Agência Senado', tipo: 'geral' };
const sangue = { nome: 'Hemocentro X', tipo: 'sangue', uf: 'SP' };

console.log('--- Texto ---');
verificar('entidades nomeadas e numericas', F.decodificarEntidades('a&nbsp;b &amp; c &#8230; &#x41; &quot;d&quot;'), 'a b & c … A "d"');
verificar('entidade desconhecida fica como veio', F.decodificarEntidades('&inventada;'), '&inventada;');
verificar('tira HTML, scripts e espacos', F.textoSimples('<p>Ola <b>mundo</b></p><script>alert(1)</script><br>fim'), 'Ola mundo fim');
verificar('tira HTML que veio escapado', F.textoSimples(F.decodificarEntidades('&lt;p&gt;Texto &amp;amp; mais&lt;/p&gt;')), 'Texto & mais');
verificar('"a < b" nao e tag', F.textoSimples('2 < 3 e 5 > 4'), '2 < 3 e 5 > 4');
verificar('trecho curto fica igual', F.trecho('Texto curto.', 50), 'Texto curto.');
verificar('trecho longo corta em palavra e poe reticencias', F.trecho('um dois tres quatro cinco seis sete oito', 22), 'um dois tres quatro…');
verificar('trecho nunca passa do maximo', F.trecho('palavra '.repeat(100), 40).length <= 40, true);
verificar('resumo sem o titulo repetido no comeco', F.resumoLimpo('Hemocentro pede doadores. O estoque esta baixo.', 'Hemocentro pede doadores'), 'O estoque esta baixo.');
verificar('resumo sem rodape "O post ... apareceu primeiro em"', F.resumoLimpo('Texto bom da noticia. O post Titulo apareceu primeiro em Site.', 'Outro'), 'Texto bom da noticia.');

console.log('--- RSS 2.0 (CDATA, entidades, imagem) ---');
const rss = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<atom:link rel="self" href="https://exemplo.com/feed"/>
<item>
  <title><![CDATA[Hemocentro faz mutirão de doação de sangue neste sábado em Recife]]></title>
  <link>https://exemplo.com/mutirao</link>
  <pubDate>Thu, 29 Oct 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<img src="https://img.exemplo.com/foto.jpg" /><p>O Hemocentro de Pernambuco abre mais cedo para receber doadores &amp; voluntários.</p>]]></description>
</item>
<item>
  <title>Vacina contra gripe &amp; covid chega aos postos</title>
  <link>https://exemplo.com/vacina</link>
  <pubDate>Wed, 28 Oct 2026 10:00:00 -0300</pubDate>
  <media:content url="https://img.exemplo.com/capa.jpg" medium="image"/>
  <description>&lt;p&gt;Campanha de vacinação começa na segunda-feira em todo o país e vai até o fim do mês.&lt;/p&gt;</description>
</item>
</channel></rss>`;
const itens = F.lerFeed(rss);
verificar('2 itens', itens.length, 2);
verificar('titulo de CDATA', itens[0].titulo, 'Hemocentro faz mutirão de doação de sangue neste sábado em Recife');
verificar('titulo com entidade', itens[1].titulo, 'Vacina contra gripe & covid chega aos postos');
verificar('link do RSS (nao pega o atom:link do canal)', itens[0].url, 'https://exemplo.com/mutirao');
verificar('imagem da primeira <img> do texto', itens[0].imagem, 'https://img.exemplo.com/foto.jpg');
verificar('imagem do media:content', itens[1].imagem, 'https://img.exemplo.com/capa.jpg');
verificar('resumo sem HTML, com entidades', itens[0].resumo, 'O Hemocentro de Pernambuco abre mais cedo para receber doadores & voluntários.');
verificar('resumo escapado (&lt;p&gt;) vira texto', itens[1].resumo, 'Campanha de vacinação começa na segunda-feira em todo o país e vai até o fim do mês.');
verificar('data com fuso', itens[1].data.toISOString(), '2026-10-28T13:00:00.000Z');

console.log('--- Atom ---');
const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
  <title type="html">Doe sangue: estoques do hemocentro estão baixos</title>
  <link rel="self" href="https://exemplo.com/self"/>
  <link rel="alternate" href="https://exemplo.com/estoques?a=1&amp;b=2"/>
  <updated>2026-10-29T08:30:00-03:00</updated>
  <summary>Os estoques de todos os tipos sanguíneos estão abaixo do ideal, informou o hemocentro.</summary>
  <enclosure url="https://img.exemplo.com/e.png" type="image/png"/>
</entry></feed>`;
const a = F.lerFeed(atom)[0];
verificar('link alternate (ignora o self) e & decodificado', a.url, 'https://exemplo.com/estoques?a=1&b=2');
verificar('data de <updated>', a.data.toISOString(), '2026-10-29T11:30:00.000Z');
verificar('imagem do enclosure', a.imagem, 'https://img.exemplo.com/e.png');

console.log('--- RSS 1.0 / RDF ---');
const rdf = `<rdf:RDF><item rdf:about="https://exemplo.com/gov"><title>Ministério lança campanha de doação de órgãos</title><link>https://exemplo.com/gov</link>
<description>Texto longo o bastante para ser usado como resumo da matéria publicada.</description><dc:date>2026-10-27T13:07:00Z</dc:date></item></rdf:RDF>`;
verificar('RDF: data de dc:date', F.lerFeed(rdf)[0].data.toISOString(), '2026-10-27T13:07:00.000Z');

console.log('--- Imagens recusadas ---');
const feio = (img) => F.lerFeed(`<item><title>Titulo suficientemente longo</title><link>https://x.com/a</link><media:thumbnail url="${img}"/></item>`)[0].imagem;
verificar('http (sem https) e recusado', feio('http://img.exemplo.com/a.jpg'), null);
verificar('logo e recusado', feio('https://img.exemplo.com/logo-site.jpg'), null);
verificar('svg e recusado', feio('https://img.exemplo.com/a.svg'), null);
verificar('pixel de rastreio e recusado', feio('https://agenciabrasil.ebc.com.br/ebc.png?id=1&o=rss'), null);
verificar('javascript: e recusado', feio('javascript:alert(1)'), null);

console.log('--- Classificacao ---');
const c = (titulo, resumo, fonte) => F.classificar({ titulo, resumo: resumo || '' }, fonte || geral);
verificar('estoque baixo de sangue = estoque/urgencia', c('Estoques de sangue estão baixos em Goiás'), 'estoque');
verificar('hemocentro pede doadores = estoque/urgencia', c('Hemocentro pede doadores de todos os tipos'), 'estoque');
verificar('doacao de sangue sem urgencia = doacao', c('Doação de sangue: veja quem pode doar'), 'doacao');
verificar('doacao de orgaos = orgaos', c('Brasil bate recorde de doação de órgãos'), 'orgaos');
verificar('medula ossea = orgaos', c('Cadastro de doadores de medula óssea cresce'), 'orgaos');
verificar('campanha de saude em feed geral = campanhas', c('Campanha de vacinação contra a gripe começa hoje'), 'campanhas');
verificar('campanha eleitoral em feed geral e IGNORADA', c('Campanha eleitoral começa com debate entre candidatos'), null);
verificar('politica em feed geral e IGNORADA', c('Senado aprova reforma tributária'), null);
verificar('"sangue" solto em crime e IGNORADO', c('Crime violento: sangue na cena do crime'), null);
verificar('feed de saude aceita saude geral', c('Estudo mostra benefícios de caminhar', '', saude), 'saude');
verificar('feed de hemocentro aceita tudo (o que nao e doacao vira saude)', c('Palestra sobre oncologia no campus', '', sangue), 'saude');
verificar('feed de hemocentro: bolsas de sangue raro = doacao', c('Hemocentros enviam bolsas de sangue raríssimo para paciente com anemia falciforme', '', sangue), 'doacao');
verificar('hemocentro pesquisando (sem pedir doador) = saude', c('Pesquisa do Hemocentro detecta sinais de recaída em pacientes com linfoma'), 'saude')
verificar('hemocentro inaugurando sede = saude (interessa, mas nao e doacao)', c('Hemocentro inaugura nova sede em Caruaru'), 'saude');
verificar('doenca falciforme sem pedir doador = saude', c('Dia nacional de combate à anemia falciforme chama atenção para o tratamento'), 'saude');
verificar('bolsas de sangue raro = doacao', c('Hemocentros enviam bolsas de sangue raríssimo para outro estado'), 'doacao');
verificar('acento nao atrapalha (DOAÇÃO DE SANGUE)', c('DOAÇÃO DE SANGUE neste sábado'), 'doacao');

console.log('--- Estado ---');
verificar('estado citado', F.detectarUf('Hemocentro de Pernambuco pede doadores'), 'PE');
verificar('fonte com estado fixo ganha', F.detectarUf('Texto sem estado', 'MG'), 'MG');
verificar('dois estados = nenhum', F.detectarUf('De Goiás para Bahia'), null);
verificar('"Mato Grosso do Sul" nao vira Mato Grosso', F.detectarUf('Campanha em Mato Grosso do Sul'), 'MS');
verificar('"Rio Grande do Norte" nao vira outro', F.detectarUf('Estoque no Rio Grande do Norte'), 'RN');
verificar('"para" (preposicao) nao e o Pará', F.detectarUf('Convite para doar sangue'), null);
verificar('"Pará" com acento e', F.detectarUf('Hemopa, no Pará, pede doadores'), 'PA');
verificar('Brasilia = DF', F.detectarUf('Hemocentro de Brasília convoca doadores'), 'DF');

console.log('--- Do feed ate o item pronto ---');
const prontos = F.itensDoFeed(rss, geral, AGORA);
verificar('feed geral: so entra o que interessa (mutirao de sangue + campanha de vacina)', prontos.length, 2);
verificar('categoria do primeiro', prontos[0].categoria, 'doacao');
verificar('estado do primeiro (Recife nao conta, "Pernambuco" sim)', prontos[0].uf, 'PE');
verificar('fonte e data ISO', [prontos[0].fonte, prontos[0].publicadaEm], ['Agência Senado', '2026-10-29T12:00:00.000Z']);
verificar('campo de busca sem acento', prontos[0].busca.includes('mutirao de doacao de sangue'), true);

const velha = rss.replace('Thu, 29 Oct 2026 12:00:00 GMT', 'Mon, 01 Jun 2026 12:00:00 GMT');
verificar('materia com mais de 30 dias nao entra', F.itensDoFeed(velha, geral, AGORA).length, 1);
const futura = rss.replace('Thu, 29 Oct 2026 12:00:00 GMT', 'Wed, 30 Dec 2026 12:00:00 GMT');
verificar('data no futuro vira "agora"', F.itensDoFeed(futura, geral, AGORA).find((i) => i.url.endsWith('mutirao')).publicadaEm, AGORA.toISOString());
const semData = rss.replace(/<pubDate>Thu[^<]*<\/pubDate>/, '');
verificar('sem data confiavel nao entra', F.itensDoFeed(semData, geral, AGORA).some((i) => i.url.endsWith('mutirao')), false);
const dobrado = rss.replace('</channel>', '<item><title>Hemocentro faz mutirão de doação de sangue neste sábado em Recife</title><link>https://outro.com/copia</link><pubDate>Thu, 29 Oct 2026 13:00:00 GMT</pubDate></item></channel>');
verificar('mesmo titulo em dois links entra uma vez so', F.itensDoFeed(dobrado, geral, AGORA).filter((i) => i.titulo.startsWith('Hemocentro faz mutirão')).length, 1);
const perigo = rss.replace('https://exemplo.com/mutirao', 'javascript:alert(1)');
verificar('link javascript: nao entra', F.itensDoFeed(perigo, geral, AGORA).some((i) => i.titulo.startsWith('Hemocentro faz')), false);
verificar('XML vazio, nulo ou lixo nao quebram', [F.lerFeed(''), F.lerFeed(null), F.lerFeed('<html>nao e feed</html>')], [[], [], []]);
verificar('semResumo: so o titulo', F.itensDoFeed(rss, { ...saude, semResumo: true }, AGORA)[0].resumo, '');

console.log('--- Filtros da API ---');
verificar('padrao', F.lerFiltros({}), { categoria: null, uf: null, busca: '', pagina: 1 });
verificar('valores validos', F.lerFiltros({ categoria: 'campanhas', uf: ' pe ', q: '  doar   sangue ', pagina: '3' }), { categoria: 'campanhas', uf: 'PE', busca: 'doar sangue', pagina: 3 });
verificar('valores estranhos viram "sem filtro"', F.lerFiltros({ categoria: 'xx', uf: 'ZZ', q: 5, pagina: '-4' }), { categoria: null, uf: null, busca: '', pagina: 1 });
verificar('pagina limitada', F.lerFiltros({ pagina: '9999' }).pagina, 50);
verificar('busca limitada a 60 letras', F.lerFiltros({ q: 'a'.repeat(200) }).busca.length, 60);
verificar('LIKE sem curingas e sem acento', F.termoLike('Doação 100%_x\\'), '%doacao 100 x%');

console.log('--- Fontes ---');
verificar('ids sem repeticao', new Set(FONTES.map((f) => f.id)).size, FONTES.length);
verificar('todas as URLs sao https', FONTES.every((f) => f.url.startsWith('https://')), true);
verificar('tipos validos', FONTES.every((f) => ['sangue', 'saude', 'geral'].includes(f.tipo)), true);
verificar('todas dizem a licenca', FONTES.every((f) => f.licenca && f.licenca.length > 10), true);
verificar('veiculo comercial (g1) vem DESLIGADO', fontesAtivas('').some((f) => f.id.startsWith('g1')), false);
verificar('...e liga pelo .env', fontesAtivas('g1-saude').some((f) => f.id === 'g1-saude'), true);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' FALHA(S)');
process.exit(falhas === 0 ? 0 : 1);
