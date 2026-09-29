// Hemare - Tabelas do apadrinhamento de pacientes (casos publicos e padrinhos). Pode rodar de novo sem problema.
const pool = require('../banco');

async function criar() {
    try {
        // O caso guarda so um apelido e dados genericos: nada que identifique o paciente.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS casos_apadrinhamento (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                apelido VARCHAR(30) NOT NULL,
                tipo_sanguineo VARCHAR(3) NOT NULL,
                condicao VARCHAR(40) NOT NULL DEFAULT 'Não informada',
                frequencia_dias INTEGER NOT NULL,
                meta_padrinhos INTEGER NOT NULL,
                ativo BOOLEAN NOT NULL DEFAULT true,
                ultima_chamada DATE,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS padrinhos (
                id SERIAL PRIMARY KEY,
                caso_id INTEGER NOT NULL REFERENCES casos_apadrinhamento(id),
                doador_id INTEGER NOT NULL REFERENCES doadores(id),
                criado_em TIMESTAMP DEFAULT NOW(),
                UNIQUE (caso_id, doador_id)
            )
        `);
        console.log('✅ Tabelas "casos_apadrinhamento" e "padrinhos" prontas (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();
