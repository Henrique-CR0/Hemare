// Hemare - Cria a tabela de locais de doacao (diretorio unido: publicos e privados).
const pool = require('../banco');

async function criar() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS locais (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(150) NOT NULL,
                cidade VARCHAR(100) NOT NULL,
                estado VARCHAR(2) NOT NULL,
                endereco VARCHAR(250),
                telefone VARCHAR(40),
                tipo VARCHAR(20) DEFAULT 'publico',
                latitude NUMERIC,
                longitude NUMERIC
            )
        `);
        console.log('✅ Tabela "locais" criada (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();