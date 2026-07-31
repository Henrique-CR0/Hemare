// Teste da regra de triagem: confere se cada situacao gera o nivel certo.
const { avaliarTriagem } = require('./triagem');

function verificar(descricao, obtido, nivelEsperado) {
    const ok = obtido.nivel === nivelEsperado;
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  nivel: ' + obtido.nivel);
}

console.log('--- Testes de triagem ---');

// 1) Pessoa saudavel, tudo certo -> VERDE
verificar('Pessoa apta (tudo ok)',
    avaliarTriagem({ idade: 25, peso: 70, dormiuBem: true, alimentado: true }),
    'verde');

// 2) Tatuagem recente -> AMARELO (temporario)
verificar('Tatuagem recente',
    avaliarTriagem({ idade: 25, peso: 70, tatuagemRecente: true }),
    'amarelo');

// 3) Peso abaixo de 50 -> AMARELO
verificar('Peso baixo (48kg)',
    avaliarTriagem({ idade: 25, peso: 48 }),
    'amarelo');

// 4) HIV -> VERMELHO (definitivo)
verificar('Marcou HIV',
    avaliarTriagem({ idade: 25, peso: 70, temHIV: true }),
    'vermelho');

// 5) Diabetes -> AMARELO (confirme)
verificar('Diabetes (atencao)',
    avaliarTriagem({ idade: 25, peso: 70, temDiabetes: true }),
    'amarelo');

// 6) Vermelho tem prioridade: tem tatuagem (amarelo) E HIV (vermelho) -> VERMELHO
verificar('Prioridade do vermelho (tatuagem + HIV)',
    avaliarTriagem({ idade: 25, peso: 70, tatuagemRecente: true, temHIV: true }),
    'vermelho');

// 7) Confere que os motivos aparecem
const resultado = avaliarTriagem({ idade: 25, peso: 48, tatuagemRecente: true });
console.log('   Motivos do caso peso+tatuagem:', resultado.motivos.length, 'motivo(s)');