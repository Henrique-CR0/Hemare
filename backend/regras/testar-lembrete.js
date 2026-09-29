// Teste rapido da regra do lembrete de retorno (com data fixa de 'hoje').
const { precisaLembrete } = require('./lembrete');

const HOJE = '2026-09-29';

function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(obtido));
}

// Base: pediu lembrete, homem, doou ha 70 dias (apto), nunca lembrado. Cada teste muda UMA coisa.
function doador(mudancas) {
    return Object.assign({
        quer_lembrete: true, email: 'd@x.com', sexo: 'M', ultima_doacao: '2026-07-21', lembrete_enviado_em: null
    }, mudancas);
}

console.log('--- Testes do lembrete de retorno ---');

verificar('Homem apto (70 dias), pediu lembrete: lembra', precisaLembrete(doador({}), HOJE), true);
verificar('Nao pediu lembrete (opt-in): nao lembra', precisaLembrete(doador({ quer_lembrete: false }), HOJE), false);
verificar('Sem email: nao lembra', precisaLembrete(doador({ email: null }), HOJE), false);
verificar('Nunca doou: nao lembra', precisaLembrete(doador({ ultima_doacao: null }), HOJE), false);
verificar('Homem com 30 dias: ainda nao apto', precisaLembrete(doador({ ultima_doacao: '2026-08-30' }), HOJE), false);
verificar('Mulher com 70 dias: ainda nao apta (precisa 90)', precisaLembrete(doador({ sexo: 'F' }), HOJE), false);
verificar('Mulher com 100 dias: lembra', precisaLembrete(doador({ sexo: 'F', ultima_doacao: '2026-06-21' }), HOJE), true);
verificar('Ja lembrado neste ciclo: nao lembra de novo',
    precisaLembrete(doador({ lembrete_enviado_em: '2026-09-20' }), HOJE), false);
verificar('Lembrado no ciclo ANTERIOR (antes da ultima doacao): lembra',
    precisaLembrete(doador({ lembrete_enviado_em: '2026-05-01' }), HOJE), true);
verificar('Datas como Date do banco (meia-noite local)',
    precisaLembrete(doador({ ultima_doacao: new Date(2026, 6, 21), lembrete_enviado_em: new Date(2026, 4, 1) }), HOJE), true);
verificar('Doador ausente nao quebra', precisaLembrete(null, HOJE), false);
