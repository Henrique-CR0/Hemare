// Hemare - Tabela do canal de noticias por estado. Pode rodar de novo sem problema.
const pool = require('../banco');

async function criar() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS noticias (
                id SERIAL PRIMARY KEY,
                uf VARCHAR(2) NOT NULL,
                titulo VARCHAR(160) NOT NULL,
                resumo VARCHAR(400) NOT NULL,
                fonte VARCHAR(60) NOT NULL,
                url VARCHAR(500) NOT NULL,
                nivel VARCHAR(12) NOT NULL DEFAULT 'sem-dados',
                referencia VARCHAR(30),
                criada_em TIMESTAMP DEFAULT NOW(),
                criada_por INTEGER REFERENCES usuarios(id)
            )
        `);
        // Mesmo link nao entra duas vezes (deixa o povoamento inicial repetivel).
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS noticias_url_idx ON noticias (url)');
        console.log('✅ Tabela "noticias" pronta (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();
