// Teste da regra de triagem: confere se cada situacao gera o nivel certo.
const { avaliarTriagem } = require('./triagem');

function verificar(descricao, obtido, nivelEsperado) {
    const ok = obtido.nivel === nivelEsperado;
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  nivel: ' + obtido.nivel);
}

console.log('--- Testes de triagem ---');

// 1) Pessoa saudavel, tudo certo -> VERDE
verificar('Pessoa apta (30 anos, 70kg, tudo ok)',
    avaliarTriagem({ idade: 30, peso: 70, dormiuBem: true, alimentado: true }),
    'verde');

// 2) Tatuagem recente -> AMARELO (temporario)
verificar('Tatuagem recente',
    avaliarTriagem({ idade: 30, peso: 70, tatuagemRecente: true }),
    'amarelo');

// 3) Peso abaixo de 50 -> VERMELHO (impedimento)
verificar('Peso baixo (48kg)',
    avaliarTriagem({ idade: 30, peso: 48 }),
    'vermelho');

// 4) Idade fora da faixa (15 anos) -> VERMELHO
verificar('Idade abaixo de 16 (15 anos)',
    avaliarTriagem({ idade: 15, peso: 70 }),
    'vermelho');

// 5) Idade 17 -> AMARELO (autorizacao do responsavel)
verificar('Idade 17 (autorizacao)',
    avaliarTriagem({ idade: 17, peso: 70 }),
    'amarelo');

// 6) Idade 65 -> AMARELO (so quem ja doou antes dos 60)
verificar('Idade 65 (confirmar)',
    avaliarTriagem({ idade: 65, peso: 70 }),
    'amarelo');

// 7) HIV -> VERMELHO (definitivo)
verificar('Marcou HIV',
    avaliarTriagem({ idade: 30, peso: 70, temHIV: true }),
    'vermelho');

// 8) Medicacao continua -> AMARELO
verificar('Usa medicacao continua',
    avaliarTriagem({ idade: 30, peso: 70, usaMedicacaoContinua: true }),
    'amarelo');

// 9) Vermelho tem prioridade: tatuagem (amarelo) + HIV (vermelho) -> VERMELHO
verificar('Prioridade do vermelho (tatuagem + HIV)',
    avaliarTriagem({ idade: 30, peso: 70, tatuagemRecente: true, temHIV: true }),
    'vermelho');