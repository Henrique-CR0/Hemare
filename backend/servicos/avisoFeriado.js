// Hemare - E-mail "doe antes do feriado": o mesmo texto para o aviso automatico e para a chamada do hospital.
// Nao leva dado de ninguem alem do primeiro nome de quem recebe.
const { escaparHtml } = require('../regras/html');
const { formatarDia } = require('../regras/feriados');

function assunto(periodo) {
    return '🩸 Doe antes de ' + periodo.nome + ': o estoque de sangue costuma cair';
}

// dados: { nome, periodo, plano, hospital?, cidade? }  (hospital so quando a chamada vem de um hospital)
function html(dados) {
    const { nome, periodo, plano, hospital, cidade } = dados;
    const primeiro = String(nome || '').split(' ')[0];
    const link = process.env.FRONTEND_URL ? String(process.env.FRONTEND_URL).replace(/\/$/, '') + '/feriados' : null;
    const origem = hospital
        ? `<p><strong>${escaparHtml(hospital)}</strong>${cidade ? ', em ' + escaparHtml(cidade) : ''}, está se preparando para o feriado e chama quem pode doar antes dele.</p>`
        : '<p>Feriados prolongados costumam derrubar as doações: muita gente viaja e a demanda por sangue sobe.</p>';
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #c8102e;">🩸 Hemare</h2>
            <p>Olá, ${escaparHtml(primeiro)}!</p>
            <p><strong>${escaparHtml(periodo.nome)}</strong> começa em ${escaparHtml(formatarDia(periodo.inicio))}.</p>
            ${origem}
            <p>${escaparHtml(plano.mensagem)}</p>
            ${link ? `<p>Veja o seu plano em ${escaparHtml(link)}.</p>` : ''}
            <p style="color:#666; font-size:13px;">Você recebe no máximo um aviso por feriado.
            ${hospital ? 'Seu nome e seu contato continuam protegidos: o hospital não sabe quem recebeu este e-mail.' : 'Você pediu este aviso na sua área do Hemare; dá para desligar lá a qualquer momento.'}</p>
        </div>
    `;
}

module.exports = { assunto, html };
