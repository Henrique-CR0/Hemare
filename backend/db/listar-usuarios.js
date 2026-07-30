// Hemare - Lista os usuarios cadastrados (sem mostrar a senha).
const pool = require('../banco');

async function listar() {
    try {
        const r = await pool.query('SELECT id, nome, email, tipo FROM usuarios ORDER BY id');
        console.log('Usuarios cadastrados:');
        console.table(r.rows);
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

listar();