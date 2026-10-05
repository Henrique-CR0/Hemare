// Hemare - Tarefa automatica: avisa por e-mail, alguns dias antes de um feriado prolongado, quem PEDIU o aviso
// e fica apto a doar a tempo. No maximo UM aviso por feriado (a tabela avisos_feriado garante, mesmo se um
// hospital tambem chamou). Roda sozinha com o servidor (ao ligar e a cada 12 horas).
// Tambem da para rodar na mao:  node tarefas/avisosFeriado.js
require('dotenv').config();
const { Resend } = require('resend');
const pool = require('../banco');
const { paraDia } = require('../regras/alerta');
const { proximosPeriodos, planoDoDoador, precisaAvisoFeriado, DIAS_DE_AVISO } = require('../regras/feriados');
const aviso = require('../servicos/avisoFeriado');

const resend = new Resend(process.env.RESEND_API_KEY);
const INTERVALO_HORAS = 12;

// Devolve quantos avisos foram enviados.
async function enviarAvisosFeriado(hojeTexto) {
    const hoje = hojeTexto || paraDia(new Date());
    const periodos = proximosPeriodos(hoje, DIAS_DE_AVISO).filter((p) => !p.emAndamento && p.risco !== 'baixo');
    if (periodos.length === 0) return 0;

    const r = await pool.query(
        `SELECT d.id, u.nome, u.email, d.sexo, d.ultima_doacao, d.quer_aviso_feriado
           FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
          WHERE d.quer_aviso_feriado = true`
    );
    let enviados = 0;
    for (const periodo of periodos) {
        const rAv = await pool.query('SELECT doador_id FROM avisos_feriado WHERE periodo_inicio = $1', [periodo.inicio]);
        const avisados = new Set(rAv.rows.map((x) => x.doador_id));
        for (const doa of r.rows) {
            if (!precisaAvisoFeriado(doa, periodo, hoje, avisados.has(doa.id))) continue;
            try {
                await pool.query("INSERT INTO avisos_feriado (doador_id, periodo_inicio, origem) VALUES ($1, $2, 'lembrete')", [doa.id, periodo.inicio]);
            } catch (erro) {
                continue; // alguem ja registrou este aviso agora mesmo
            }
            try {
                const resposta = await resend.emails.send({
                    from: 'Hemare <onboarding@resend.dev>',
                    to: doa.email,
                    subject: aviso.assunto(periodo),
                    html: aviso.html({ nome: doa.nome, periodo, plano: planoDoDoador(doa, periodo, hoje) })
                });
                if (resposta && resposta.error) throw new Error('falha no envio');
                enviados++;
            } catch (erro) {
                // Nao conseguiu enviar: libera o registro para tentar de novo na proxima rodada.
                await pool.query('DELETE FROM avisos_feriado WHERE doador_id = $1 AND periodo_inicio = $2', [doa.id, periodo.inicio]).catch(() => {});
            }
        }
    }
    return enviados;
}

function agendarAvisosFeriado() {
    async function rodada() {
        try {
            const enviados = await enviarAvisosFeriado();
            if (enviados > 0) console.log('📅 Avisos de feriado enviados: ' + enviados);
        } catch (erro) {
            console.log('⚠️  Avisos de feriado nao rodaram: ' + erro.message);
        }
    }
    setTimeout(rodada, 20 * 1000);
    setInterval(rodada, INTERVALO_HORAS * 60 * 60 * 1000).unref();
}

if (require.main === module) {
    enviarAvisosFeriado()
        .then((n) => console.log('✅ Avisos de feriado enviados: ' + n))
        .catch((erro) => console.log('❌ Erro:', erro.message))
        .finally(() => pool.end());
}

module.exports = { enviarAvisosFeriado, agendarAvisosFeriado };
