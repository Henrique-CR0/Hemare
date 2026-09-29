// Teste rapido da regra de gamificacao (niveis e emblemas).
const { calcularConquistas, montarPlacar } = require('./gamificacao');

function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(obtido));
}

function emblemasConquistados(resultado) {
    return resultado.emblemas.filter((e) => e.conquistado).map((e) => e.id);
}

console.log('--- Testes de gamificacao ---');

// Nunca doou: nivel 1, faltam 1 para o proximo, sem emblemas.
const zero = calcularConquistas({ totalDoacoes: 0, doacoesUltimoAno: 0, tipoSanguineo: 'A+', visibilidade: 'anonimo' });
verificar('0 doacoes: nivel 1 (Futuro doador)', zero.nivel.numero, 1);
verificar('0 doacoes: falta 1 para o proximo', zero.proximoNivel.faltam, 1);
verificar('0 doacoes: progresso 0', zero.progresso, 0);
verificar('0 doacoes: nenhum emblema', emblemasConquistados(zero), []);

// Primeira doacao: nivel 2, 4 vidas, emblema "primeira".
const uma = calcularConquistas({ totalDoacoes: 1, doacoesUltimoAno: 1, tipoSanguineo: 'A+', visibilidade: 'anonimo' });
verificar('1 doacao: nivel 2 (Gota de esperanca)', uma.nivel.numero, 2);
verificar('1 doacao: 4 vidas', uma.vidasSalvas, 4);
verificar('1 doacao: faltam 2 para Doador frequente', uma.proximoNivel.faltam, 2);
verificar('1 doacao: emblema primeira', emblemasConquistados(uma), ['primeira']);

// 4 doacoes: nivel 3, progresso 50% ate 5.
const quatro = calcularConquistas({ totalDoacoes: 4, doacoesUltimoAno: 2, tipoSanguineo: 'O-', visibilidade: 'identificado' });
verificar('4 doacoes: nivel 3 (Doador frequente)', quatro.nivel.numero, 3);
verificar('4 doacoes: progresso 50', quatro.progresso, 50);
verificar('4 doacoes O- identificado: emblemas',
    emblemasConquistados(quatro), ['primeira', 'regular', 'identificado', 'universal']);

// 5 doacoes: 20 vidas.
const cinco = calcularConquistas({ totalDoacoes: 5, doacoesUltimoAno: 0 });
verificar('5 doacoes: nivel 4 (Guardiao da vida)', cinco.nivel.numero, 4);
verificar('5 doacoes: emblema 20 vidas', emblemasConquistados(cinco), ['primeira', 'vidas-20']);

// 25 doacoes: nivel maximo, sem proximo, progresso 100.
const lenda = calcularConquistas({ totalDoacoes: 25, doacoesUltimoAno: 3 });
verificar('25 doacoes: nivel 6 (Lenda Hemare)', lenda.nivel.numero, 6);
verificar('25 doacoes: sem proximo nivel', lenda.proximoNivel, null);
verificar('25 doacoes: progresso 100', lenda.progresso, 100);

// Rh nulo: emblema sangue dourado.
const dourado = calcularConquistas({ totalDoacoes: 0, tipoSanguineo: 'Rh nulo (sangue dourado)' });
verificar('Rh nulo: emblema dourado', emblemasConquistados(dourado), ['dourado']);

// Valores ausentes ou invalidos nao quebram.
const vazio = calcularConquistas({ totalDoacoes: null });
verificar('total nulo vira 0', vazio.totalDoacoes, 0);

console.log('--- Testes do placar das cidades ---');

const placar = montarPlacar([
    { cidade: 'Recife', doadores: 5, doacoes: 12 },
    { cidade: 'Olinda', doadores: 3, doacoes: 12 },
    { cidade: 'Caruaru', doadores: 2, doacoes: 30 },   // menos de 3 doadores: fica fora (privacidade)
    { cidade: 'Paulista', doadores: 4, doacoes: 0 },    // sem doacoes: fica fora
    { cidade: 'Jaboatao', doadores: '6', doacoes: '20' } // numeros como texto (vem assim do Postgres)
]);
verificar('Placar: ordem por doacoes (empate: mais doadores)',
    placar.cidades.map((c) => c.cidade), ['Jaboatao', 'Recife', 'Olinda']);
verificar('Placar: posicoes', placar.cidades.map((c) => c.posicao), [1, 2, 3]);
verificar('Placar: vidas da 1a cidade', placar.cidades[0].vidasSalvas, 80);
verificar('Placar: total de doacoes conta todas as cidades', placar.totalDoacoes, 74);
verificar('Placar: total de vidas', placar.totalVidas, 296);
verificar('Placar: total de doadores', placar.totalDoadores, 20);

const muitas = montarPlacar(Array.from({ length: 15 }, (_, i) => ({ cidade: 'Cidade ' + i, doadores: 3, doacoes: i + 1 })));
verificar('Placar: no maximo 10 cidades', muitas.cidades.length, 10);

verificar('Placar vazio', montarPlacar([]), { totalDoacoes: 0, totalVidas: 0, totalDoadores: 0, cidades: [] });
