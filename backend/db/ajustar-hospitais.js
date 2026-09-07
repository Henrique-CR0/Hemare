// Hemare - Adiciona campos de CNPJ e endereco completo na tabela hospitais.
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18)');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS cep VARCHAR(9)');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS numero VARCHAR(10)');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS bairro VARCHAR(100)');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS complemento VARCHAR(100)');
        console.log('✅ Colunas de CNPJ e endereço adicionadas (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();