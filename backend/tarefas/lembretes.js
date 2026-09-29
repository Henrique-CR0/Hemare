// Hemare - Tarefa automatica: envia o lembrete "voce ja pode doar de novo".
// Roda sozinha com o servidor (ao ligar e a cada 12 horas).
// Tambem da para rodar na mao:  node tarefas/lembretes.js
require('dotenv').config();
const { Resend } = require('resend');
const pool = require('../banco');
const { precisaLembrete } = require('../regras/lembrete');
const { escaparHtml } = require('../regras/html');

const resend = new Resend(process.env.RESEND_API_KEY);
const INTERVALO_HORAS = 12;

// Confere quem ficou apto e ainda nao foi lembrado neste ciclo, e manda o email.
// Devolve quantos lembretes foram enviados.
async function enviarLembretes() {
    const r = await pool.query(
        `SELECT d.id, u.nome, u.email, d.sexo, d.ultima_doacao, d.lembrete_enviado_em, d.quer_lembrete
           FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
          WHERE d.quer_lembrete = true AND d.ultima_doacao IS NOT NULL`
    );
    const paraLembrar = r.rows.filter((d) => precisaLembrete(d));

    let enviados = 0;
    for (const doa of paraLembrar) {
        try {
            const resposta = await resend.emails.send({
                from: 'Hemare <onboarding@resend.dev>',
                to: doa.email,
                subject: '🩸 Você já pode doar sangue de novo!',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                        <h2 style="color: #c8102e;">🩸 Hemare</h2>
                        <p>Olá, ${escaparHtml(doa.nome)}!</p>
                        <p>Já passou o intervalo desde a sua última doação: <strong>você já pode doar de novo</strong>.</p>
                        <p>Cada doação pode salvar até 4 vidas. Que tal agendar a próxima?</p>
                        <p style="color:#666; font-size:13px;">Faça a triagem rápida no Hemare antes de ir e veja o hemocentro mais perto de você.
                        Você recebeu este lembrete porque pediu na sua área do Hemare; dá para desligar lá a qualquer momento.</p>
                    </div>
                `
            });
            if (resposta && resposta.error) continue; // nao marca: tenta de novo na proxima rodada
            await pool.query('UPDATE doadores SET lembrete_enviado_em = CURRENT_DATE WHERE id = $1', [doa.id]);
            enviados++;
        } catch (erro) {
            // Falha de envio de um doador nao impede os outros.
        }
    }
    return enviados;
}

// Liga a tarefa junto com o servidor. Se o banco ainda nao tiver as colunas
// (db/ajustar-lembretes.js nao rodou), so avisa no log e segue.
function agendarLembretes() {
    async function rodada() {
        try {
            const enviados = await enviarLembretes();
            if (enviados > 0) console.log('🔔 Lembretes de retorno enviados: ' + enviados);
        } catch (erro) {
            console.log('⚠️  Lembretes de retorno nao rodaram: ' + erro.message);
        }
    }
    setTimeout(rodada, 10 * 1000);
    setInterval(rodada, INTERVALO_HORAS * 60 * 60 * 1000).unref();
}

// Rodando direto pelo terminal: envia uma vez e termina.
if (require.main === module) {
    enviarLembretes()
        .then((n) => console.log('✅ Lembretes enviados: ' + n))
        .catch((erro) => console.log('❌ Erro:', erro.message))
        .finally(() => pool.end());
}

module.exports = { enviarLembretes, agendarLembretes };
