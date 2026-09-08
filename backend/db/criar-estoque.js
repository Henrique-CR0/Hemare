// Hemare - Tabela de estoque de sangue por hospital e tipo sanguineo.
const pool = require('../banco');

async function criar() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS estoque (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                tipo_sanguineo VARCHAR(3) NOT NULL,
                nivel VARCHAR(20) NOT NULL DEFAULT 'estavel',
                atualizado_em TIMESTAMP DEFAULT NOW(),
                UNIQUE (hospital_id, tipo_sanguineo)
            )
        `);
        console.log('✅ Tabela "estoque" criada (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();