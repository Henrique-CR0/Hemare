// Hemare - Calcula a distancia (km) entre dois pontos usando a formula de Haversine.

// Converte graus para radianos.
function paraRad(graus) {
    return graus * Math.PI / 180;
}

// Recebe duas coordenadas (lat/lng) e devolve a distancia em km, arredondada.
function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371; // raio medio da Terra em km

    const dLat = paraRad(lat2 - lat1);
    const dLng = paraRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(paraRad(lat1)) * Math.cos(paraRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    return Math.round(distancia); // km inteiros
}

module.exports = { calcularDistancia };
