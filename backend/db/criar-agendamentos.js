// Hemare - Agendamento de doacao: vagas abertas pelos hospitais e agendamentos dos doadores.
// Pode rodar de novo sem problema. Rode depois de db/criar-doacoes.js (precisa de doadores, hospitais e doacoes).
const pool = require('../banco');

async function criar() {
    try {
        // Cada vaga e um horario de um dia num hospital. "reservadas" nunca passa de "capacidade":
        // a reserva e um UPDATE condicional, entao duas pessoas nao pegam o ultimo lugar ao mesmo tempo.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vagas_doacao (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                data DATE NOT NULL,
                hora VARCHAR(5) NOT NULL,
                capacidade INTEGER NOT NULL,
                reservadas INTEGER NOT NULL DEFAULT 0,
                criado_em TIMESTAMP DEFAULT NOW(),
                UNIQUE (hospital_id, data, hora)
            )
        `);

        // status: 'agendado' | 'compareceu' | 'faltou' | 'cancelado'. Quando o hospital confirma a presenca,
        // a doacao entra na cadeia de confianca e doacao_id aponta para ela.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS agendamentos (
                id SERIAL PRIMARY KEY,
                doador_id INTEGER NOT NULL REFERENCES doadores(id),
                vaga_id INTEGER NOT NULL REFERENCES vagas_doacao(id),
                status VARCHAR(12) NOT NULL DEFAULT 'agendado',
                doacao_id INTEGER REFERENCES doacoes(id),
                lembrete_enviado BOOLEAN NOT NULL DEFAULT false,
                criado_em TIMESTAMP DEFAULT NOW(),
                atualizado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query('CREATE INDEX IF NOT EXISTS agendamentos_doador_idx ON agendamentos (doador_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS agendamentos_vaga_idx ON agendamentos (vaga_id)');
        console.log('✅ Agendamento pronto (vagas dos hospitais e agendamentos dos doadores).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();
