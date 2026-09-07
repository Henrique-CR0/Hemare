// Hemare - Adiciona a coluna CNES na tabela hospitais.
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS cnes VARCHAR(12)');
        console.log('✅ Coluna CNES adicionada (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();