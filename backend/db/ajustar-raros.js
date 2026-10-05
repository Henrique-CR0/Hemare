// Hemare - Rede de sangue raro: colunas de participacao no doador e tabelas de pedidos e chamados.
// Pode rodar de novo sem problema. Rode depois de db/criar-doacoes.js e db/ajustar-perfil.js.
const pool = require('../banco');

async function ajustar() {
    try {
        const colunas = [
            'raro_fenotipo VARCHAR(20)',
            'raro_status VARCHAR(12)',                       // 'declarado' (a pessoa disse) ou 'confirmado' (um hospital conferiu o laudo)
            'raro_consentimento BOOLEAN DEFAULT false',      // autoriza ser chamada em emergencia real
            'raro_alcance VARCHAR(10)',                      // 'cidade', 'estado' ou 'pais'
            'raro_codigo VARCHAR(12)',                       // codigo que a pessoa mostra ao hospital para confirmar o laudo
            'raro_confirmado_por INTEGER REFERENCES hospitais(id)',
            'raro_confirmado_em TIMESTAMP',
            'raro_ultima_notificacao DATE'
        ];
        for (const coluna of colunas) {
            await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS ' + coluna);
        }
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS doadores_raro_codigo_idx ON doadores (raro_codigo)');

        // Pedido de emergencia de um hospital (fica guardado para auditoria; expira em 72 horas).
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pedidos_raros (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                fenotipo VARCHAR(20) NOT NULL,
                motivo VARCHAR(300) NOT NULL,
                apelido_paciente VARCHAR(30),
                status VARCHAR(12) NOT NULL DEFAULT 'aberto',
                expira_em TIMESTAMP NOT NULL,
                convocados INTEGER NOT NULL DEFAULT 0,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        // Quem foi chamado para cada pedido e o que respondeu. So quem responde "disponivel" tem contato revelado.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS convocacoes_raras (
                id SERIAL PRIMARY KEY,
                pedido_id INTEGER NOT NULL REFERENCES pedidos_raros(id),
                doador_id INTEGER NOT NULL REFERENCES doadores(id),
                enviado_em TIMESTAMP DEFAULT NOW(),
                resposta VARCHAR(12),
                respondido_em TIMESTAMP,
                doacao_id INTEGER REFERENCES doacoes(id),
                UNIQUE (pedido_id, doador_id)
            )
        `);
        console.log('✅ Rede de sangue raro pronta (colunas do doador + tabelas de pedidos e chamados).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

ajustar();
