// Hemare - Regra do lembrete de retorno: avisar o doador quando ele pode doar de novo.
// Ataca a raiz do problema: 38% dos doadores doam uma vez so e nao voltam.
// So recebe quem PEDIU o lembrete (opt-in, LGPD), e so UM lembrete por ciclo de doacao.
const { verificarElegibilidade } = require('./elegibilidade');

// Converte para 'AAAA-MM-DD' (Date do banco vem a meia-noite local).
function paraDia(valor) {
    if (!valor) return null;
    if (valor instanceof Date) {
        const m = String(valor.getMonth() + 1).padStart(2, '0');
        const d = String(valor.getDate()).padStart(2, '0');
        return valor.getFullYear() + '-' + m + '-' + d;
    }
    return String(valor).slice(0, 10);
}

// doador: { quer_lembrete, email, sexo, ultima_doacao, lembrete_enviado_em }
function precisaLembrete(doador, hoje) {
    if (!doador || doador.quer_lembrete !== true || !doador.email) return false;

    const ultimaDoacao = paraDia(doador.ultima_doacao);
    if (!ultimaDoacao) return false; // nunca doou: nao ha "retorno" para lembrar

    // Ja lembrado depois da ultima doacao? Entao este ciclo ja foi avisado.
    const lembrado = paraDia(doador.lembrete_enviado_em);
    if (lembrado && lembrado >= ultimaDoacao) return false;

    return verificarElegibilidade(ultimaDoacao, doador.sexo, paraDia(hoje || new Date())).apto;
}

module.exports = { precisaLembrete };
