// Teste rapido do comprovante verificavel (verificacao de um registro da cadeia + mascara de CPF).
const { calcularHash, GENESIS, verificarRegistro } = require('./cadeia');
const { hashValido, mascararCpf } = require('./comprovante');

function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(obtido));
}

console.log('--- Testes do comprovante verificavel ---');

// Monta uma cadeia de 2 doacoes, do jeito que a rota confirmar-doacao faz.
const h1 = calcularHash(GENESIS, 7, 3, '2026-09-01');
const r1 = { hash: h1, hash_anterior: GENESIS, doador_id: 7, hospital_id: 3, data_doacao: '2026-09-01' };
const h2 = calcularHash(h1, 9, 3, '2026-09-10');
const r2 = { hash: h2, hash_anterior: h1, doador_id: 9, hospital_id: 3, data_doacao: '2026-09-10' };

verificar('Primeiro registro (ligado ao GENESIS) e valido', verificarRegistro(r1, GENESIS).valido, true);
verificar('Segundo registro ligado ao primeiro e valido', verificarRegistro(r2, h1).valido, true);
verificar('Data alterada: conteudo NAO confere',
    verificarRegistro({ ...r2, data_doacao: '2026-09-11' }, h1), { valido: false, conteudoIntegro: false, encadeado: true });
verificar('Doador trocado: conteudo NAO confere',
    verificarRegistro({ ...r2, doador_id: 10 }, h1).conteudoIntegro, false);
verificar('Registro fora do lugar na cadeia: NAO encadeado',
    verificarRegistro(r2, GENESIS), { valido: false, conteudoIntegro: true, encadeado: false });
verificar('Data como Date (vinda do banco) tambem confere',
    verificarRegistro({ ...r1, data_doacao: new Date('2026-09-01T00:00:00Z') }, GENESIS).valido, true);

verificar('Hash valido (64 hex)', hashValido(h1), true);
verificar('Hash curto e invalido', hashValido('abc'), false);
verificar('Hash com maiusculas e invalido', hashValido(h1.toUpperCase()), false);
verificar('Hash com caractere estranho e invalido', hashValido(h1.slice(0, 63) + "'"), false);

verificar('CPF formatado e mascarado', mascararCpf('123.456.789-00'), '***.456.789-**');
verificar('CPF so numeros e mascarado', mascararCpf('12345678900'), '***.456.789-**');
verificar('CPF incompleto nao aparece', mascararCpf('123'), null);
verificar('Sem CPF nao aparece', mascararCpf(null), null);
