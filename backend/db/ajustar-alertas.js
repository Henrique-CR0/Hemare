// Hemare - Guarda a data do ultimo alerta de emergencia recebido por cada doador
// (o alerta inteligente nao chama o mesmo doador mais de uma vez a cada poucos dias).
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS ultimo_alerta DATE');
        console.log('✅ Coluna ultimo_alerta adicionada em doadores (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
