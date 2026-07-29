// Hemare - Regra de elegibilidade: a pessoa esta apta a doar hoje?
// Intervalo minimo entre doacoes de sangue total (Brasil):
// homens a cada 60 dias, mulheres a cada 90 dias.

const INTERVALO_DIAS = { M: 60, F: 90 };

// Recebe a data da ultima doacao (texto 'AAAA-MM-DD' ou null) e o sexo ('M'/'F').
// Devolve um objeto dizendo se esta apto e, se nao, quantos dias faltam.
function verificarElegibilidade(dataUltimaDoacao, sexo, hoje) {
    const intervalo = INTERVALO_DIAS[sexo];
    if (!intervalo) {
        return { apto: false, motivo: 'Sexo invalido', diasRestantes: null };
    }

    // Se nunca doou, esta apto.
    if (!dataUltimaDoacao) {
        return { apto: true, motivo: 'Primeira doacao', diasRestantes: 0 };
    }

    // 'hoje' e opcional: se nao vier, usa a data atual. (Ajuda a testar.)
    const dataHoje = hoje ? new Date(hoje) : new Date();
    const dataUltima = new Date(dataUltimaDoacao);

    // Diferenca em dias entre hoje e a ultima doacao.
    const umDia = 1000 * 60 * 60 * 24;
    const diasPassados = Math.floor((dataHoje - dataUltima) / umDia);

    if (diasPassados >= intervalo) {
        return { apto: true, motivo: 'Intervalo cumprido', diasRestantes: 0 };
    }

    return {
        apto: false,
        motivo: 'Aguardando intervalo',
        diasRestantes: intervalo - diasPassados
    };
}

module.exports = { verificarElegibilidade };