// Teste da regra de distancia (com pontos conhecidos).
const { calcularDistancia } = require('./distancia');

function verificar(descricao, obtido, esperadoAprox, margem) {
    // Como sao distancias reais, aceitamos uma pequena margem de erro.
    const ok = Math.abs(obtido - esperadoAprox) <= margem;
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + obtido + ' km (esperado ~' + esperadoAprox + ')');
}

console.log('--- Testes de distancia ---');

// Recife (Hemope) -> Sao Paulo (Pro-Sangue): ~2130 km
verificar('Recife -> Sao Paulo',
    calcularDistancia(-8.05, -34.895, -23.5558, -46.6696), 2130, 60);

// Recife -> Rio de Janeiro: ~1880 km
verificar('Recife -> Rio de Janeiro',
    calcularDistancia(-8.05, -34.895, -22.911, -43.196), 1880, 60);

// Sao Paulo -> Rio de Janeiro: ~360 km
verificar('Sao Paulo -> Rio de Janeiro',
    calcularDistancia(-23.5558, -46.6696, -22.911, -43.196), 360, 40);

// Mesmo ponto -> 0 km
verificar('Mesmo ponto (Recife -> Recife)',
    calcularDistancia(-8.05, -34.895, -8.05, -34.895), 0, 1);