// Hemare - Ficha PcD: colunas da declaracao de pessoa com deficiencia no doador.
// Pode rodar de novo sem problema. Rode depois de db/criar-tabelas.js (precisa da tabela doadores).
const pool = require('../banco');

async function ajustar() {
    try {
        const colunas = [
            'pcd BOOLEAN DEFAULT false',     // a pessoa declarou ser PcD (so ela ve; nunca vai a hospital)
            'pcd_tipos TEXT',                // tipos separados por virgula (fisica,visual,...)
            'pcd_apoios TEXT',               // apoios que ajudam no atendimento, separados por virgula
            'pcd_declarado_em TIMESTAMP'     // quando consentiu em guardar a informacao
        ];
        for (const coluna of colunas) {
            await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS ' + coluna);
        }
        console.log('✅ Ficha PcD pronta (colunas da declaração no doador).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
