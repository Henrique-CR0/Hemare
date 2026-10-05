// Hemare - Calendario do sangue (feriados): aviso opcional por e-mail e registro das chamadas.
// Pode rodar de novo sem problema. Rode depois de db/criar-tabelas.js (precisa de doadores e hospitais).
const pool = require('../banco');

async function criar() {
    try {
        // O doador precisa PEDIR o aviso (opt-in, LGPD). Comeca desligado.
        await pool.query('ALTER TABLE doadores ADD COLUMN IF NOT EXISTS quer_aviso_feriado BOOLEAN DEFAULT false');

        // Quem ja recebeu aviso de qual periodo (de qualquer origem): garante no maximo UM aviso por feriado.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS avisos_feriado (
                id SERIAL PRIMARY KEY,
                doador_id INTEGER NOT NULL REFERENCES doadores(id),
                periodo_inicio DATE NOT NULL,
                origem VARCHAR(12) NOT NULL,
                enviado_em TIMESTAMP DEFAULT NOW(),
                UNIQUE (doador_id, periodo_inicio)
            )
        `);

        // Chamada de um hospital para um periodo (uma por hospital e periodo). Guarda so o total, nunca quem recebeu.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chamados_feriado (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
                periodo_inicio DATE NOT NULL,
                periodo_nome VARCHAR(60) NOT NULL,
                convocados INTEGER NOT NULL DEFAULT 0,
                criado_em TIMESTAMP DEFAULT NOW(),
                UNIQUE (hospital_id, periodo_inicio)
            )
        `);
        console.log('✅ Calendário do sangue pronto (aviso opcional do doador + registro de avisos e chamadas).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

criar();
