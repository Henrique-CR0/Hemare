// Hemare - Adiciona campo de telefone/contato do doador.
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)');
        console.log('✅ Coluna telefone adicionada (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();