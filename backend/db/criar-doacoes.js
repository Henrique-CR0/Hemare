// Hemare - Tabela de doacoes confirmadas (registro real de cada doacao).
const pool = require('../banco');

async function criar() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doacoes (
                id SERIAL PRIMARY KEY,
                doador_id INTEGER NOT NULL REFERENCES doadores(id),
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                data_doacao DATE NOT NULL DEFAULT CURRENT_DATE,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        // Contador de doacoes no proprio doador (para a gamificacao).
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS total_doacoes INTEGER DEFAULT 0');
        console.log('✅ Tabela "doacoes" criada + coluna total_doacoes (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();