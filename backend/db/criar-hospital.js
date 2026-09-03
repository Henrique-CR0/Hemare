// Hemare - Cria as tabelas do lado do hospital: hospitais e necessidades.
const pool = require('../banco');

async function criar() {
    try {
        // Dados do hospital (ligado a um usuario do tipo 'hospital').
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hospitais (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER UNIQUE NOT NULL REFERENCES usuarios(id),
                cidade VARCHAR(100) NOT NULL,
                estado VARCHAR(2),
                endereco VARCHAR(200),
                aprovado BOOLEAN DEFAULT true
            )
        `);

        // Necessidades (campanhas): o hospital pede um tipo sanguineo.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS necessidades (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                tipo_sanguineo VARCHAR(50) NOT NULL,
                tipo_doacao VARCHAR(20) DEFAULT 'sangue',
                urgencia VARCHAR(20) DEFAULT 'normal',
                status VARCHAR(20) DEFAULT 'aberta',
                criada_em TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('✅ Tabelas "hospitais" e "necessidades" criadas (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();