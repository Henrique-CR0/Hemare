// Hemare - Lista as tabelas existentes no banco (so para conferir).
const pool = require('../banco');

async function listar() {
    try {
        const r = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.log('Tabelas no banco:');
        r.rows.forEach(function (linha) { console.log(' - ' + linha.table_name); });
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

listar();