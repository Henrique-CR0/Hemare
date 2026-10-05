// Hemare - Colunas do "Traga um amigo": codigo de convite de cada conta e quem convidou.
const pool = require('../banco');

async function ajustar() {
    try {
        await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_indicacao VARCHAR(12)');
        await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS indicado_por INTEGER REFERENCES usuarios(id)');
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS usuarios_codigo_indicacao_idx ON usuarios (codigo_indicacao)');
        console.log('✅ Colunas de indicacao prontas (codigo_indicacao e indicado_por).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
