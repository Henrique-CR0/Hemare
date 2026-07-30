// Hemare - Cria as tabelas do banco. Rode uma vez (pode rodar de novo sem problema).
const pool = require('../banco');

async function criarTabelas() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(120) NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                senha_hash VARCHAR(200) NOT NULL,
                tipo VARCHAR(20) NOT NULL,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela "usuarios" criada (ou ja existia).');
    } catch (erro) {
        console.log('❌ Erro ao criar tabelas:', erro.message);
    } finally {
        await pool.end();
    }
}

criarTabelas();