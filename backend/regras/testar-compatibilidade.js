// Teste rapido da regra de compatibilidade.
const { podeDoar, doadoresCompativeis } = require('./compatibilidade');

function verificar(descricao, valorObtido, valorEsperado) {
    const ok = JSON.stringify(valorObtido) === JSON.stringify(valorEsperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(valorObtido));
}

console.log('--- Testes de compatibilidade ---');
verificar('O- doa para A+ (deve ser true)', podeDoar('O-', 'A+'), true);
verificar('A+ doa para O- (deve ser false)', podeDoar('A+', 'O-'), false);
verificar('AB+ recebe de todos (deve ser true)', podeDoar('B+', 'AB+'), true);
verificar('O- recebe so de O- (deve ser false)', podeDoar('A-', 'O-'), false);
verificar('Doadores para A+ ', doadoresCompativeis('A+'), ['O-', 'O+', 'A-', 'A+']);
verificar('Tipo invalido devolve lista vazia', doadoresCompativeis('XYZ'), []);