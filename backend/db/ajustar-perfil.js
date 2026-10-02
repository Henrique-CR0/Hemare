// Hemare - Colunas do perfil completo do doador: foto, nascimento, genero, peso, estado e contato de emergencia.
// Pode rodar de novo sem problema.
const pool = require('../banco');

async function ajustar() {
    try {
        const colunas = [
            'foto TEXT',
            'data_nascimento DATE',
            'genero VARCHAR(20)',
            'peso_kg INTEGER',
            'estado VARCHAR(2)',
            'contato_emergencia_nome VARCHAR(120)',
            'contato_emergencia_telefone VARCHAR(20)',
            'perfil_atualizado_em TIMESTAMP'
        ];
        for (const coluna of colunas) {
            await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS ' + coluna);
        }
        console.log('✅ Colunas do perfil do doador prontas (foto, nascimento, genero, peso, estado, contato de emergencia).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
