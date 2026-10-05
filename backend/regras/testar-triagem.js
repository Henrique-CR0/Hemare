// Teste da regra de triagem: confere se cada situacao gera o nivel certo.
const { avaliarTriagem } = require('./triagem');

let falhas = 0;
function verificar(descricao, obtido, nivelEsperado) {
    const ok = obtido.nivel === nivelEsperado;
    if (!ok) falhas++;
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

// 10) Limites exatos (onde erros de "<" e "<=" costumam aparecer)
verificar('Exatamente 50 kg: pode',
    avaliarTriagem({ idade: 30, peso: 50 }),
    'verde');
verificar('Exatamente 16 anos: autorizacao',
    avaliarTriagem({ idade: 16, peso: 70 }),
    'amarelo');
verificar('18 anos: pode',
    avaliarTriagem({ idade: 18, peso: 70 }),
    'verde');
verificar('59 anos: pode',
    avaliarTriagem({ idade: 59, peso: 70 }),
    'verde');
verificar('60 anos: ainda pode fazer a primeira doacao (limite 60 anos e 11 meses)',
    avaliarTriagem({ idade: 60, peso: 70 }),
    'verde');
verificar('61 anos: primeira doacao ja passou do limite, doador de repeticao segue',
    avaliarTriagem({ idade: 61, peso: 70 }),
    'amarelo');
verificar('69 anos: doador de repeticao segue',
    avaliarTriagem({ idade: 69, peso: 70 }),
    'amarelo');

// 11) Regras novas (Portaria GM/MS 11.685/2026, em vigor desde 30/09/2026; Hemope)
verificar('70 anos: nao e mais impedimento, e atencao (so doador regular, apos triagem clinica)',
    avaliarTriagem({ idade: 70, peso: 70 }),
    'amarelo');
verificar('75 anos: tambem atencao',
    avaliarTriagem({ idade: 75, peso: 70 }),
    'amarelo');
verificar('Endoscopia ou colonoscopia recente: atencao (4 meses)',
    avaliarTriagem({ idade: 30, peso: 70, endoscopiaRecente: true }),
    'amarelo');
verificar('Endoscopia + HIV: vermelho tem prioridade',
    avaliarTriagem({ idade: 30, peso: 70, endoscopiaRecente: true, temHIV: true }),
    'vermelho');

function textos(r) { return r.motivos.join(' | '); }
function conferirTexto(descricao, texto, trecho, esperado) {
    const ok = texto.includes(trecho) === esperado;
    if (!ok) falhas++;
    console.log((ok ? '✅' : '❌') + ' ' + descricao);
}
const tat = textos(avaliarTriagem({ idade: 30, peso: 70, tatuagemRecente: true }));
conferirTexto('Tatuagem: fala em 4 meses', tat, '4 meses', true);
conferirTexto('Tatuagem: fala dos 7 dias com alvara sanitario', tat, '7 dias', true);
conferirTexto('Tatuagem: nao fala mais em 12 meses', tat, '12 meses (1 ano)', false);
conferirTexto('Tatuagem: cita piercing e botox', tat, 'botox', true);
const endo = textos(avaliarTriagem({ idade: 30, peso: 70, endoscopiaRecente: true }));
conferirTexto('Endoscopia: fala em 4 meses', endo, '4 meses', true);
const idoso = textos(avaliarTriagem({ idade: 72, peso: 70 }));
conferirTexto('70+: explica que so continua quem ja e doador regular', idoso, 'doador regular', true);
conferirTexto('70+: nao diz mais "16 a 69 anos"', idoso, '16 a 69 anos', false);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
