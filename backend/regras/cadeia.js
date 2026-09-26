// Hemare - Cadeia de confianca: cada doacao carrega um hash ligado ao hash da doacao anterior.
// Se um registro antigo for alterado, o hash dele muda e a cadeia "quebra" - isso é o que da auditabilidade.
const crypto = require('crypto');

const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000'.slice(0, 64);

// Calcula o hash de um registro, com base no hash anterior + os dados da doacao.
function calcularHash(hashAnterior, doadorId, hospitalId, dataDoacao) {
    const conteudo = hashAnterior + '|' + doadorId + '|' + hospitalId + '|' + dataDoacao;
    return crypto.createHash('sha256').update(conteudo).digest('hex');
}

module.exports = { calcularHash, GENESIS };