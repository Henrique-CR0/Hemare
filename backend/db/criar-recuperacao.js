// Hemare - Tabela para os codigos de recuperacao de senha.
const pool = require('../banco');

async function criar() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS recuperacao_senha (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
                codigo VARCHAR(6) NOT NULL,
                expira_em TIMESTAMP NOT NULL,
                usado BOOLEAN DEFAULT false,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela "recuperacao_senha" criada (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();