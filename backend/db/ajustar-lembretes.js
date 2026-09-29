// Hemare - Colunas do lembrete de retorno ("voce ja pode doar de novo").
// quer_lembrete comeca FALSO: so recebe quem pedir (opt-in, LGPD).
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS quer_lembrete BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS lembrete_enviado_em DATE');
        console.log('✅ Colunas quer_lembrete e lembrete_enviado_em adicionadas em doadores (ou ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
