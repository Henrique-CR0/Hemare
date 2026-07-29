// Hemare - Regra de compatibilidade sanguinea (quem pode doar para quem).
// A chave e o tipo do RECEPTOR; a lista sao os tipos de DOADOR aceitos.
const COMPATIVEIS = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

// Diz se um doador pode doar para um receptor.
function podeDoar(tipoDoador, tipoReceptor) {
    const aceitos = COMPATIVEIS[tipoReceptor];
    if (!aceitos) {
        return false; // tipo de receptor invalido
    }
    return aceitos.some(function (tipo) { return tipo === tipoDoador; });
}

// Dado o tipo do receptor, devolve a lista de tipos de doador compativeis.
function doadoresCompativeis(tipoReceptor) {
    const aceitos = COMPATIVEIS[tipoReceptor];
    if (!aceitos) {
        return [];
    }
    return aceitos;
}

module.exports = { podeDoar, doadoresCompativeis };