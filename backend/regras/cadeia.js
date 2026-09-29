// Hemare - Cadeia de confianca: cada doacao carrega um hash ligado ao hash da doacao anterior.
// Se um registro antigo for alterado, o hash dele muda e a cadeia "quebra" - isso é o que da auditabilidade.
const crypto = require('crypto');

const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000'.slice(0, 64);

// Calcula o hash de um registro, com base no hash anterior + os dados da doacao.
function calcularHash(hashAnterior, doadorId, hospitalId, dataDoacao) {
    const conteudo = hashAnterior + '|' + doadorId + '|' + hospitalId + '|' + dataDoacao;
    return crypto.createHash('sha256').update(conteudo).digest('hex');
}

// A data entra no hash sempre no formato AAAA-MM-DD (igual a rota /hospital/cadeia/verificar).
function formatarDataRegistro(dataDoacao) {
    return new Date(dataDoacao).toISOString().slice(0, 10);
}

// Verifica UM registro: (1) o conteudo nao foi alterado (o hash recalculado bate) e
// (2) ele esta ligado ao registro anterior da cadeia (hash_anterior confere).
// registro: { hash, hash_anterior, doador_id, hospital_id, data_doacao }
// hashDoAnterior: hash do registro anterior na cadeia (ou GENESIS se for o primeiro)
function verificarRegistro(registro, hashDoAnterior) {
    const recalculado = calcularHash(
        registro.hash_anterior, registro.doador_id, registro.hospital_id, formatarDataRegistro(registro.data_doacao)
    );
    const conteudoIntegro = recalculado === registro.hash;
    const encadeado = registro.hash_anterior === hashDoAnterior;
    return { valido: conteudoIntegro && encadeado, conteudoIntegro, encadeado };
}

module.exports = { calcularHash, GENESIS, formatarDataRegistro, verificarRegistro };