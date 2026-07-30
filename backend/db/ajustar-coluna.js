// Hemare - Aumenta a coluna tipo_sanguineo para caber textos maiores (ex.: "Rh nulo (sangue dourado)").
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE doadores ALTER COLUMN tipo_sanguineo TYPE VARCHAR(50)');
        console.log('✅ Coluna tipo_sanguineo ajustada para VARCHAR(50).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();