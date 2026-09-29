// Hemare - Prepara a tabela hospitais para a verificacao por administrador.
// Uso:  node db/ajustar-verificacao.js
//       node db/ajustar-verificacao.js --revisar-existentes   (manda para verificacao os
//       hospitais que ja estavam aprovados automaticamente, sem ninguem ter conferido)
const pool = require('../banco');

async function ajustar() {
    try {
        // Hospital novo nasce PENDENTE (antes nascia aprovado).
        await pool.query('ALTER TABLE hospitais ALTER COLUMN aprovado SET DEFAULT false');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS motivo_recusa TEXT');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS verificado_em TIMESTAMP');
        await pool.query('ALTER TABLE hospitais ADD COLUMN IF NOT EXISTS verificado_por INTEGER REFERENCES usuarios(id)');
        console.log('✅ Colunas de verificacao prontas; hospitais novos agora comecam pendentes.');

        if (process.argv.includes('--revisar-existentes')) {
            const r = await pool.query(
                'UPDATE hospitais SET aprovado = false WHERE aprovado = true AND verificado_em IS NULL'
            );
            console.log('🔎 ' + r.rowCount + ' hospital(is) aprovado(s) sem verificacao voltaram para "pendente".');
        } else {
            const r = await pool.query('SELECT COUNT(*) FROM hospitais WHERE aprovado = true AND verificado_em IS NULL');
            console.log('ℹ️  ' + r.rows[0].count + ' hospital(is) continuam aprovados sem ter passado por verificacao.');
            console.log('   Para revisa-los, rode de novo com --revisar-existentes.');
        }
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
