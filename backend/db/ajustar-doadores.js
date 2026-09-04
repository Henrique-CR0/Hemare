// Hemare - Adiciona campos novos na tabela doadores (nome social e CPF).
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS nome_social VARCHAR(120)');
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS cpf VARCHAR(14)');
        console.log('✅ Colunas nome_social e cpf adicionadas (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();