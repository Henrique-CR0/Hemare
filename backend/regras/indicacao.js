// Hemare - Regra do "Traga um amigo": codigo de convite de cada doador.
// O convite so "conta" quando o amigo faz a primeira doacao confirmada por um hospital,
// entao criar contas falsas nao rende emblema.
const crypto = require('crypto');

// Sem 0/O e 1/I: o codigo pode ser lido em voz alta ou digitado a mao sem confusao.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 8;

// aleatorio(n) devolve um inteiro de 0 a n-1 (injetavel para testar).
function gerarCodigo(aleatorio = (n) => crypto.randomInt(n)) {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++) {
        codigo += ALFABETO[aleatorio(ALFABETO.length)];
    }
    return codigo;
}

// Aceita o codigo como o usuario digitou (minusculas, espacos) e devolve o formato
// padrao, ou null se nao for um codigo possivel. Assim texto qualquer nem chega ao banco.
function normalizarCodigo(texto) {
    if (typeof texto !== 'string') return null;
    const codigo = texto.trim().toUpperCase();
    return new RegExp('^[' + ALFABETO + ']{' + TAMANHO_CODIGO + '}$').test(codigo) ? codigo : null;
}

module.exports = { gerarCodigo, normalizarCodigo, ALFABETO, TAMANHO_CODIGO };
