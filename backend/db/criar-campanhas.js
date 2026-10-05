// Hemare - Tabelas das campanhas de reposicao (campanha por paciente e promessas de doacao).
// Pode rodar de novo sem problema.
const pool = require('../banco');

async function criar() {
    try {
        // A campanha guarda so um apelido: nada que identifique o paciente.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS campanhas_reposicao (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                codigo VARCHAR(12) UNIQUE NOT NULL,
                apelido VARCHAR(30) NOT NULL,
                meta_bolsas INTEGER NOT NULL,
                expira_em DATE NOT NULL,
                ativo BOOLEAN NOT NULL DEFAULT true,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        // Promessa do doador para uma data. doacao_id so e preenchido quando o hospital confirma.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS promessas_campanha (
                id SERIAL PRIMARY KEY,
                campanha_id INTEGER NOT NULL REFERENCES campanhas_reposicao(id),
                doador_id INTEGER NOT NULL REFERENCES doadores(id),
                data_prevista DATE NOT NULL,
                doacao_id INTEGER REFERENCES doacoes(id),
                criado_em TIMESTAMP DEFAULT NOW(),
                UNIQUE (campanha_id, doador_id)
            )
        `);
        console.log('✅ Tabelas "campanhas_reposicao" e "promessas_campanha" prontas (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();
