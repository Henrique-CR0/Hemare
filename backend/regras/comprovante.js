// Hemare - Regras do comprovante de doacao verificavel.

// O link do comprovante e o proprio hash da doacao (64 caracteres hexadecimais).
function hashValido(hash) {
    return typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
}

// Mostra so o miolo do CPF (LGPD): "123.456.789-00" -> "***.456.789-**".
// Quem confere o comprovante (ex.: o RH) compara com o documento da pessoa.
function mascararCpf(cpf) {
    const numeros = String(cpf || '').replace(/\D/g, '');
    if (numeros.length !== 11) return null;
    return '***.' + numeros.slice(3, 6) + '.' + numeros.slice(6, 9) + '-**';
}

module.exports = { hashValido, mascararCpf };
