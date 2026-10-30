// Teste das regras de tempo e identidade das fontes do FEED DE NOTICIAS no frontend ("há 2 horas", iniciais, cor).
// O arquivo do frontend e modulo ES; aqui ele e importado direto. Rode: node testes/estrutura/noticias-frontend.js
const path = require('path');
const { pathToFileURL } = require('url');

let falhas = 0, total = 0;
function verificar(descricao, obtido, esperado) {
    total++;
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

async function main() {
    const { haQuanto, iniciais, corDaFonte } = await import(pathToFileURL(path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'regras', 'tempo.js')).href);
    const AGORA = Date.parse('2026-10-30T15:00:00Z');
    const antes = (ms) => new Date(AGORA - ms).toISOString();
    const MIN = 60000, H = 60 * MIN, D = 24 * H;

    console.log('--- "há quanto tempo" ---');
    verificar('segundos = agora mesmo', haQuanto(antes(20000), AGORA), 'agora mesmo');
    verificar('5 minutos', haQuanto(antes(5 * MIN), AGORA), 'há 5 min');
    verificar('1 hora (singular)', haQuanto(antes(61 * MIN), AGORA), 'há 1 hora');
    verificar('3 horas', haQuanto(antes(3 * H + 5 * MIN), AGORA), 'há 3 horas');
    verificar('1 dia (singular)', haQuanto(antes(25 * H), AGORA), 'há 1 dia');
    verificar('4 dias', haQuanto(antes(4 * D), AGORA), 'há 4 dias');
    verificar('1 semana', haQuanto(antes(8 * D), AGORA), 'há 1 semana');
    verificar('3 semanas', haQuanto(antes(22 * D), AGORA), 'há 3 semanas');
    verificar('mais de 30 dias vira data', haQuanto('2026-08-15T12:00:00Z', AGORA), '15/08/2026');
    verificar('data no futuro (relogio errado) nao quebra', haQuanto(new Date(AGORA + 5 * MIN).toISOString(), AGORA), 'agora mesmo');
    verificar('data invalida = vazio', [haQuanto('lixo', AGORA), haQuanto(null, AGORA), haQuanto(undefined, AGORA)], ['', '', '']);

    console.log('--- Iniciais e cor da fonte ---');
    verificar('duas palavras', iniciais('Agência Brasil'), 'AB');
    verificar('ignora "de/da/do"', iniciais('Hemocentro de Ribeirão Preto (USP)'), 'HR');
    verificar('uma palavra', iniciais('g1'), 'G');
    verificar('vazio nao quebra', [iniciais(''), iniciais(null)], ['?', '?']);
    verificar('a mesma fonte tem sempre a mesma cor', corDaFonte('Agência Brasil') === corDaFonte('Agência Brasil'), true);
    verificar('cor escura o bastante para texto branco (luminosidade 32%)', /^hsl\(\d+, 55%, 32%\)$/.test(corDaFonte('Agência Senado')), true);

    console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM (' + total + ' verificacoes)' : '\n' + falhas + ' FALHA(S) em ' + total + ' verificacoes');
    process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
