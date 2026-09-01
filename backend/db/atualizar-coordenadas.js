// Hemare - Preenche latitude/longitude dos hemocentros (coordenadas aproximadas p/ demonstracao).
const pool = require('../banco');

// [nome, latitude, longitude]
const COORDS = [
    ['Fundação Hemope', -8.0500, -34.8950],
    ['Fundação Pró-Sangue - Hemocentro SP', -23.5558, -46.6696],
    ['HEMORIO', -22.9110, -43.1960],
    ['Fundação Hemominas', -19.9210, -43.9330],
    ['HEMOAM', -3.1000, -60.0170],
    ['HEMOBA', -12.9900, -38.4900],
    ['HEMOCE', -3.7500, -38.5500],
    ['Hemocentro de Brasília - FHB', -15.7900, -47.8800],
    ['HEMORGS', -30.0700, -51.1300],
    ['HEMEPAR', -25.4200, -49.2500],
    ['HEMOSC', -27.5900, -48.5500],
    ['HEMOAL', -9.6800, -35.7400],
    ['HEMONORTE', -5.7900, -35.2000],
    ['HEMOPI', -5.0900, -42.8000],
    ['HEMOPA', -1.4600, -48.4900],
    ['HEMOSE', -10.9300, -37.0700],
    ['HEMOMAR', -2.5300, -44.3000],
    ['MT Hemocentro', -15.6000, -56.1000],
    ['HEMOSUL', -20.4600, -54.6100],
    ['HEMOGO', -16.6700, -49.2600]
];

async function atualizar() {
    try {
        let contador = 0;
        for (const [nome, lat, lng] of COORDS) {
            const r = await pool.query(
                'UPDATE locais SET latitude = $1, longitude = $2 WHERE nome = $3',
                [lat, lng, nome]
            );
            contador += r.rowCount;
        }
        console.log('✅ Coordenadas atualizadas em ' + contador + ' locais.');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

atualizar();