// Hemare - E-mails do agendamento (confirmacao e lembrete). Mesmo texto-base, com cuidado de nao levar dado de ninguem
// alem do primeiro nome de quem recebe. E um e-mail "transacional": a pessoa marcou o horario, entao nao precisa de opt-in.
const { escaparHtml } = require('../regras/html');
const { formatarDia } = require('../regras/agendamento');

function link() {
    return process.env.FRONTEND_URL ? String(process.env.FRONTEND_URL).replace(/\/$/, '') + '/agendar' : null;
}

// dados: { nome, data, hora, hospital, cidade, endereco }
function corpo(dados, abertura) {
    const primeiro = String(dados.nome || '').split(' ')[0];
    const onde = [dados.hospital, dados.cidade].filter(Boolean).join(', ');
    const url = link();
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #c8102e;">🩸 Hemare</h2>
            <p>Olá, ${escaparHtml(primeiro)}!</p>
            <p>${abertura}</p>
            <p><strong>${escaparHtml(formatarDia(dados.data))} às ${escaparHtml(dados.hora)}</strong><br>
            ${escaparHtml(onde)}${dados.endereco ? '<br>' + escaparHtml(dados.endereco) : ''}</p>
            <p><strong>No dia:</strong> leve um documento oficial com foto, esteja bem alimentado e hidratado e tenha dormido bem.
            Não vá em jejum.</p>
            <p style="color:#666; font-size:13px;">Não vai conseguir ir? Cancele ou remarque${url ? ' em ' + escaparHtml(url) : ' na área do doador'}
            para liberar a vaga para outra pessoa. A decisão final de aptidão é sempre da equipe de triagem.</p>
        </div>
    `;
}

function confirmacao(dados) {
    return { assunto: '🩸 Doação agendada: ' + formatarDia(dados.data) + ' às ' + dados.hora, html: corpo(dados, 'Seu horário para doar sangue está <strong>confirmado</strong>.') };
}

function lembrete(dados) {
    return { assunto: '🩸 Amanhã é dia de doar sangue', html: corpo(dados, 'Passando para lembrar do seu horário de doação, que está chegando.') };
}

module.exports = { confirmacao, lembrete };
