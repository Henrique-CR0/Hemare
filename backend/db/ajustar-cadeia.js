// Hemare - Adiciona campos de hash (cadeia de confianca) na tabela doacoes.
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS hash VARCHAR(64)');
        await pool.query('ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS hash_anterior VARCHAR(64)');
        console.log('✅ Colunas hash e hash_anterior adicionadas (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();