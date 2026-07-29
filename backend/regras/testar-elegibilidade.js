// Teste rapido da regra de elegibilidade (usando uma data fixa de 'hoje').
const { verificarElegibilidade } = require('./elegibilidade');

const HOJE = '2026-06-01';

function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(obtido));
}

console.log('--- Testes de elegibilidade ---');

// Homem que doou ha 70 dias (>= 60): apto.
verificar('Homem, 70 dias atras (apto)',
    verificarElegibilidade('2026-03-23', 'M', HOJE),
    { apto: true, motivo: 'Intervalo cumprido', diasRestantes: 0 });

// Homem que doou ha 30 dias (< 60): faltam 30.
verificar('Homem, 30 dias atras (faltam 30)',
    verificarElegibilidade('2026-05-02', 'M', HOJE),
    { apto: false, motivo: 'Aguardando intervalo', diasRestantes: 30 });

// Mulher que doou ha 100 dias (>= 90): apta.
verificar('Mulher, 100 dias atras (apta)',
    verificarElegibilidade('2026-02-21', 'F', HOJE),
    { apto: true, motivo: 'Intervalo cumprido', diasRestantes: 0 });

// Nunca doou: apto.
verificar('Nunca doou (apto)',
    verificarElegibilidade(null, 'M', HOJE),
    { apto: true, motivo: 'Primeira doacao', diasRestantes: 0 });