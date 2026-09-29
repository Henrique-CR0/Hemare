// Hemare - Regra de gamificacao: niveis e emblemas do doador.
// Objetivo: incentivar o doador a VOLTAR (38% doam uma vez so, por reposicao).
// Funcao pura: recebe os dados do doador e devolve nivel, progresso e emblemas.

// Cada doacao pode salvar ate 4 vidas.
const VIDAS_POR_DOACAO = 4;

// Niveis por numero de doacoes confirmadas (do menor para o maior).
const NIVEIS = [
    { minimo: 0,  nome: 'Futuro doador',        icone: '🌱' },
    { minimo: 1,  nome: 'Gota de esperança',    icone: '💧' },
    { minimo: 3,  nome: 'Doador frequente',     icone: '🩸' },
    { minimo: 5,  nome: 'Guardião da vida',     icone: '🛡️' },
    { minimo: 10, nome: 'Herói do sangue',      icone: '🦸' },
    { minimo: 20, nome: 'Lenda Hemare',         icone: '🏆' }
];

// Emblemas: cada um tem uma condicao sobre os dados do doador.
const EMBLEMAS = [
    { id: 'primeira',     icone: '🎉', nome: 'Primeira doação',   descricao: 'Fez a primeira doação confirmada.',
      condicao: (d) => d.totalDoacoes >= 1 },
    { id: 'regular',      icone: '📅', nome: 'Doador regular',    descricao: 'Doou 2 ou mais vezes nos últimos 12 meses.',
      condicao: (d) => d.doacoesUltimoAno >= 2 },
    { id: 'vidas-20',     icone: '❤️', nome: '20 vidas',          descricao: 'Suas doações podem ter salvado 20 vidas.',
      condicao: (d) => d.totalDoacoes * VIDAS_POR_DOACAO >= 20 },
    { id: 'identificado', icone: '📣', nome: 'Pronto para chamar', descricao: 'Aceitou ser avisado em emergências.',
      condicao: (d) => d.visibilidade === 'identificado' },
    { id: 'universal',    icone: '🌍', nome: 'Doador universal',  descricao: 'Tipo O-: seu sangue serve para todos.',
      condicao: (d) => d.tipoSanguineo === 'O-' },
    { id: 'dourado',      icone: '🌟', nome: 'Sangue dourado',    descricao: 'Rh nulo: um dos sangues mais raros do mundo.',
      condicao: (d) => typeof d.tipoSanguineo === 'string' && d.tipoSanguineo.startsWith('Rh nulo') }
];

// dados: { totalDoacoes, doacoesUltimoAno, tipoSanguineo, visibilidade }
function calcularConquistas(dados) {
    const total = Math.max(0, Number(dados.totalDoacoes) || 0);
    const doador = {
        totalDoacoes: total,
        doacoesUltimoAno: Math.max(0, Number(dados.doacoesUltimoAno) || 0),
        tipoSanguineo: dados.tipoSanguineo || null,
        visibilidade: dados.visibilidade || 'anonimo'
    };

    // Nivel atual = o ultimo nivel cujo minimo foi alcancado.
    let indice = 0;
    for (let i = 0; i < NIVEIS.length; i++) {
        if (total >= NIVEIS[i].minimo) indice = i;
    }
    const atual = NIVEIS[indice];
    const proximo = NIVEIS[indice + 1] || null;

    // Progresso (0 a 100) entre o nivel atual e o proximo.
    const progresso = proximo
        ? Math.round(((total - atual.minimo) / (proximo.minimo - atual.minimo)) * 100)
        : 100;

    return {
        totalDoacoes: total,
        vidasSalvas: total * VIDAS_POR_DOACAO,
        nivel: { numero: indice + 1, nome: atual.nome, icone: atual.icone },
        proximoNivel: proximo
            ? { nome: proximo.nome, icone: proximo.icone, faltam: proximo.minimo - total }
            : null,
        progresso,
        emblemas: EMBLEMAS.map((e) => ({
            id: e.id,
            icone: e.icone,
            nome: e.nome,
            descricao: e.descricao,
            conquistado: e.condicao(doador)
        }))
    };
}

module.exports = { calcularConquistas, NIVEIS, VIDAS_POR_DOACAO };
