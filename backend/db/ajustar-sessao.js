// Hemare - Sessoes encerraveis: guarda, por usuario, o instante a partir do qual os tokens antigos deixam de valer.
// Pode rodar de novo sem problema. Rode depois de db/criar-tabelas.js.
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sessao_valida_apos TIMESTAMPTZ');
        console.log('✅ Sessões encerráveis prontas (coluna sessao_valida_apos em usuarios).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
