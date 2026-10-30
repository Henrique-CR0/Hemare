// Teste das regras de acesso do FRONTEND (menu por tipo de conta e destino seguro depois do login).
// Os arquivos do frontend sao modulos ES; aqui eles sao importados direto. Rode: node testes/estrutura/acesso-frontend.js
const path = require('path');
const { pathToFileURL } = require('url');

let falhas = 0, total = 0;
function verificar(descricao, obtido, esperado) {
    total++;
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const frontend = (...p) => pathToFileURL(path.join(__dirname, '..', '..', '..', 'frontend', 'src', ...p)).href;

async function main() {
    const { destinoSeguro, comDestino } = await import(frontend('regras', 'destino.js'));
    const { menuDe, destinoDoLogo } = await import(frontend('regras', 'menu.js'));
    const { PORTOES } = await import(frontend('regras', 'portoes.js'));

    console.log('--- Destino depois do login (so caminho do proprio site) ---');
    verificar('caminho interno vale', destinoSeguro('/triagem', '/x'), '/triagem');
    verificar('com parametros vale', destinoSeguro('/meu-perfil?aba=seguranca', '/x'), '/meu-perfil?aba=seguranca');
    verificar('outro site e recusado', destinoSeguro('https://malvado.com', '/x'), '/x');
    verificar('protocolo relativo (//site) e recusado', destinoSeguro('//malvado.com', '/x'), '/x');
    verificar('barra invertida e recusada', destinoSeguro('/\\malvado.com', '/x'), '/x');
    verificar('javascript: e recusado', destinoSeguro('javascript:alert(1)', '/x'), '/x');
    verificar('sem barra no comeco e recusado', destinoSeguro('triagem', '/x'), '/x');
    verificar('vazio, nulo e numero caem no padrao', [destinoSeguro('', '/x'), destinoSeguro(null, '/x'), destinoSeguro(5, '/x')], ['/x', '/x', '/x']);
    verificar('muito longo e recusado', destinoSeguro('/' + 'a'.repeat(300), '/x'), '/x');
    verificar('caractere de controle e recusado', destinoSeguro('/a\u0000b', '/x'), '/x');
    verificar('login e cadastro nao servem de destino (nao sairia do lugar)', ['/login', '/cadastro?ref=A', '/cadastro-hospital', '/recuperar-senha'].map((d) => destinoSeguro(d, '/x')), ['/x', '/x', '/x', '/x']);
    verificar('comDestino monta o endereco do login', comDestino('/login', '/triagem'), '/login?destino=%2Ftriagem');
    verificar('comDestino sem destino valido devolve o caminho puro', [comDestino('/login', null), comDestino('/login', 'https://x.com')], ['/login', '/login']);

    console.log('--- Menu de cada tipo de conta ---');
    const rotulos = (tipo) => menuDe(tipo).links.map((l) => l.rotulo);
    const paras = (tipo) => menuDe(tipo).links.map((l) => l.para);
    verificar('visitante ve o site publico, com cadeado em Posso doar? e Apadrinhe', menuDe(null).links.filter((l) => l.exigeConta).map((l) => l.rotulo), ['Posso doar?', 'Apadrinhe']);
    verificar('visitante tem o menu Aprenda', menuDe(null).aprenda, true);
    verificar('doador: nada com cadeado (ja tem conta) e inclui Agendar doacao', [menuDe('doador').links.some((l) => l.exigeConta), rotulos('doador').includes('Agendar doação')], [false, true]);
    verificar('hospital: so Termometro, Noticias, Previsao e Radar', rotulos('hospital'), ['Termômetro de estoque', 'Notícias', 'Previsão do sangue', 'Radar de aptidão']);
    verificar('hospital NAO ve nada de doador (triagem, onde doar, apadrinhar, agendar, inicio)', ['/triagem', '/locais', '/apadrinhar', '/agendar', '/'].some((p) => paras('hospital').includes(p)), false);
    verificar('hospital nao tem o menu Aprenda', menuDe('hospital').aprenda, false);
    verificar('admin: so Noticias, Previsao e Radar', rotulos('admin'), ['Notícias', 'Previsão do sangue', 'Radar de aptidão']);
    verificar('doador NAO ve o radar (e ferramenta de hospital)', paras('doador').includes('/radar'), false);
    verificar('logo: visitante e doador vao para o inicio; hospital e admin para a propria area',
        [destinoDoLogo(null, '/x'), destinoDoLogo('doador', '/area-doador'), destinoDoLogo('hospital', '/painel-hospital'), destinoDoLogo('admin', '/admin')], ['/', '/', '/painel-hospital', '/admin']);

    console.log('--- Portoes de acesso ---');
    verificar('ha portao para a triagem e para apadrinhar', Object.keys(PORTOES).sort(), ['apadrinhar', 'triagem']);
    verificar('cada portao explica o porque, lista beneficios e mostra o que segue aberto',
        Object.values(PORTOES).every((p) => p.titulo && p.porque.length > 40 && p.beneficios.length >= 3 && p.abertas.length >= 2), true);
    verificar('o portao da triagem diz que as respostas nao ficam guardadas', /não ficam guardadas/.test(PORTOES.triagem.porque), true);

    console.log(falhas === 0 ? '\nTodos os testes passaram (' + total + ' verificacoes).' : '\n' + falhas + ' teste(s) falharam.');
    process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
