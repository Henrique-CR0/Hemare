// Hemare - Tarefa automatica: lembra por e-mail quem tem uma doacao agendada para as proximas ~26 horas.
// Um lembrete por agendamento (a coluna lembrete_enviado evita repetir; reagendar liga o lembrete de novo).
// Roda sozinha com o servidor (ao ligar e a cada 2 horas). Tambem da para rodar na mao:  node tarefas/lembreteAgendamento.js
require('dotenv').config();
const { Resend } = require('resend');
const pool = require('../banco');
const { paraDia } = require('../regras/alerta');
const { momentoDaVaga } = require('../regras/agendamento');
const email = require('../servicos/emailAgendamento');

const resend = new Resend(process.env.RESEND_API_KEY);
const INTERVALO_HORAS = 2;
const ANTECEDENCIA_HORAS = 26;

// Devolve quantos lembretes foram enviados.
async function enviarLembretesDeAgendamento(agora) {
    const instante = agora || new Date();
    const r = await pool.query(
        `SELECT a.id, v.data, v.hora, u.nome, u.email, uh.nome AS hospital, h.cidade, h.endereco, h.numero, h.bairro
           FROM agendamentos a
           JOIN vagas_doacao v ON v.id = a.vaga_id
           JOIN doadores d ON d.id = a.doador_id
           JOIN usuarios u ON u.id = d.usuario_id
           JOIN hospitais h ON h.id = v.hospital_id
           JOIN usuarios uh ON uh.id = h.usuario_id
          WHERE a.status = 'agendado' AND a.lembrete_enviado = false`
    );
    let enviados = 0;
    for (const a of r.rows) {
        const falta = momentoDaVaga(paraDia(a.data), a.hora) - instante.getTime();
        if (falta <= 0 || falta > ANTECEDENCIA_HORAS * 3600 * 1000) continue;
        try {
            const m = email.lembrete({ nome: a.nome, data: paraDia(a.data), hora: a.hora, hospital: a.hospital, cidade: a.cidade,
                endereco: [a.endereco, a.numero, a.bairro].filter(Boolean).join(', ') });
            const resposta = await resend.emails.send({ from: 'Hemare <onboarding@resend.dev>', to: a.email, subject: m.assunto, html: m.html });
            if (resposta && resposta.error) continue; // nao marca: tenta de novo na proxima rodada
            await pool.query('UPDATE agendamentos SET lembrete_enviado = true WHERE id = $1', [a.id]);
            enviados++;
        } catch (erro) {
            // Falha de envio de um nao impede os outros.
        }
    }
    return enviados;
}

function agendarLembretesDeAgendamento() {
    async function rodada() {
        try {
            const enviados = await enviarLembretesDeAgendamento();
            if (enviados > 0) console.log('📅 Lembretes de agendamento enviados: ' + enviados);
        } catch (erro) {
            console.log('⚠️  Lembretes de agendamento nao rodaram: ' + erro.message);
        }
    }
    setTimeout(rodada, 30 * 1000);
    setInterval(rodada, INTERVALO_HORAS * 60 * 60 * 1000).unref();
}

if (require.main === module) {
    enviarLembretesDeAgendamento()
        .then((n) => console.log('✅ Lembretes de agendamento enviados: ' + n))
        .catch((erro) => console.log('❌ Erro:', erro.message))
        .finally(() => pool.end());
}

module.exports = { enviarLembretesDeAgendamento, agendarLembretesDeAgendamento };
