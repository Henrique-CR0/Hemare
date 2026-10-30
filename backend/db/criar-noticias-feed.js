// Hemare - Tabela do feed de noticias (estilo "Google Noticias"), preenchida sozinha pelo coletor. Pode rodar de novo sem problema.
// Guarda so o que cabe: titulo, trecho curto, imagem de divulgacao do feed, link da materia e nome da fonte.
const pool = require('../banco');

async function criar() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS noticias_feed (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(300) NOT NULL,
                resumo VARCHAR(300) NOT NULL DEFAULT '',
                fonte VARCHAR(80) NOT NULL,
                url VARCHAR(500) NOT NULL,
                imagem VARCHAR(500),
                categoria VARCHAR(12) NOT NULL,
                uf VARCHAR(2),
                publicada_em TIMESTAMPTZ NOT NULL,
                coletada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                oculta BOOLEAN NOT NULL DEFAULT false,
                chave VARCHAR(80) NOT NULL,
                busca TEXT NOT NULL DEFAULT ''
            )
        `);
        // O mesmo link nao entra duas vezes (o coletor roda de hora em hora).
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS noticias_feed_url_idx ON noticias_feed (url)');
        await pool.query('CREATE INDEX IF NOT EXISTS noticias_feed_data_idx ON noticias_feed (publicada_em)');
        await pool.query('CREATE INDEX IF NOT EXISTS noticias_feed_chave_idx ON noticias_feed (chave)');
        console.log('✅ Tabela "noticias_feed" pronta (ou ja existia).');
        console.log('   Ela se enche sozinha: o servidor coleta os feeds ao ligar e de hora em hora.');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();
