// Testes da regra de indicacao ("Traga um amigo"). Rode: node regras/testar-indicacao.js
const { gerarCodigo, normalizarCodigo, ALFABETO, TAMANHO_CODIGO } = require('./indicacao');
const { calcularConquistas } = require('./gamificacao');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

console.log('--- Testes do codigo de indicacao ---');

const codigo = gerarCodigo();
verificar('codigo tem 8 caracteres', codigo.length, TAMANHO_CODIGO);
verificar('codigo usa so o alfabeto permitido', [...codigo].every((c) => ALFABETO.includes(c)), true);
verificar('alfabeto nao tem caracteres confusos (0 O 1 I)', /[01OI]/.test(ALFABETO), false);
verificar('codigos sao diferentes entre si', new Set(Array.from({ length: 200 }, () => gerarCodigo())).size, 200);
verificar('gerador injetavel: sempre o primeiro simbolo', gerarCodigo(() => 0), 'AAAAAAAA');
verificar('gerador injetavel: sempre o ultimo simbolo', gerarCodigo((n) => n - 1), '99999999');

verificar('normaliza minusculas e espacos', normalizarCodigo('  abcd2345 '), 'ABCD2345');
verificar('recusa tamanho errado', normalizarCodigo('ABC'), null);
verificar('recusa caractere fora do alfabeto (0)', normalizarCodigo('ABCD2340'), null);
verificar('recusa texto com SQL', normalizarCodigo("x'; DROP TABLE usuarios;--"), null);
verificar('recusa nao-texto', normalizarCodigo(12345678), null);
verificar('recusa vazio/nulo', normalizarCodigo(null), null);

console.log('--- Testes dos emblemas de recrutador ---');

function ganhos(dados) {
    return calcularConquistas(dados).emblemas.filter((e) => e.conquistado).map((e) => e.id);
}
verificar('0 amigos: sem emblema de recrutador', ganhos({ totalDoacoes: 0, amigosQueDoaram: 0 }), []);
verificar('sem informar amigos: nao quebra', ganhos({ totalDoacoes: 0 }), []);
verificar('1 amigo que doou: Recrutador', ganhos({ totalDoacoes: 0, amigosQueDoaram: 1 }), ['recrutador']);
verificar('2 amigos: ainda so Recrutador', ganhos({ totalDoacoes: 0, amigosQueDoaram: 2 }), ['recrutador']);
verificar('3 amigos: Recrutador e Multiplicador', ganhos({ totalDoacoes: 0, amigosQueDoaram: 3 }), ['recrutador', 'multiplicador']);
verificar('valor invalido vira 0', ganhos({ totalDoacoes: 0, amigosQueDoaram: 'abc' }), []);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
