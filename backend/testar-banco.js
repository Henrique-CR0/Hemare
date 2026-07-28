// Hemare - Teste rapido: pergunta a hora ao banco so para ver se a conexao funciona.
const pool = require('./banco');

async function testar() {
    try {
        const resultado = await pool.query('SELECT NOW()');
        console.log('✅ Conectado ao banco! Hora do servidor:', resultado.rows[0].now);
    } catch (erro) {
        console.log('❌ Erro ao conectar:', erro.message);
    } finally {
        await pool.end();
    }
}

testar();