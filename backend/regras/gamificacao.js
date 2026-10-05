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
      condicao: (d) => typeof d.tipoSanguineo === 'string' && d.tipoSanguineo.startsWith('Rh nulo') },
    { id: 'recrutador',   icone: '🤝', nome: 'Recrutador',        descricao: 'Um amigo que você convidou fez a primeira doação.',
      condicao: (d) => d.amigosQueDoaram >= 1 },
    { id: 'multiplicador', icone: '📈', nome: 'Multiplicador',    descricao: 'Três amigos que você convidou já doaram.',
      condicao: (d) => d.amigosQueDoaram >= 3 },
    { id: 'padrinho',     icone: '💝', nome: 'Padrinho',          descricao: 'Apadrinhou um paciente que precisa de transfusões regulares.',
      condicao: (d) => d.afilhados >= 1 },
    { id: 'solidario',    icone: '🤲', nome: 'Solidário',         descricao: 'Doou por alguém em uma campanha de reposição.',
      condicao: (d) => d.doacoesEmCampanha >= 1 },
    { id: 'rede-rara',    icone: '💎', nome: 'Rede de sangue raro', descricao: 'Faz parte da rede de emergência de fenótipos raros, confirmada por um hospital.',
      condicao: (d) => d.redeRara === true }
];

// dados: { totalDoacoes, doacoesUltimoAno, tipoSanguineo, visibilidade, amigosQueDoaram, afilhados, doacoesEmCampanha, redeRara }
function calcularConquistas(dados) {
    const total = Math.max(0, Number(dados.totalDoacoes) || 0);
    const doador = {
        totalDoacoes: total,
        doacoesUltimoAno: Math.max(0, Number(dados.doacoesUltimoAno) || 0),
        tipoSanguineo: dados.tipoSanguineo || null,
        visibilidade: dados.visibilidade || 'anonimo',
        amigosQueDoaram: Math.max(0, Number(dados.amigosQueDoaram) || 0),
        afilhados: Math.max(0, Number(dados.afilhados) || 0),
        doacoesEmCampanha: Math.max(0, Number(dados.doacoesEmCampanha) || 0),
        redeRara: dados.redeRara === true
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

// ===== Placar das cidades (publico) =====
// So aparecem cidades com pelo menos 3 doadores: com menos, daria para
// adivinhar quem e quem (LGPD). Os totais gerais contam todas as cidades.
const MINIMO_DOADORES_PLACAR = 3;
const TAMANHO_PLACAR = 10;

// linhas: [{ cidade, doadores, doacoes }] (uma por cidade, vindas do banco)
function montarPlacar(linhas) {
    const lista = (linhas || []).map((l) => ({
        cidade: l.cidade,
        doadores: Number(l.doadores) || 0,
        doacoes: Number(l.doacoes) || 0
    }));

    const totalDoacoes = lista.reduce((soma, l) => soma + l.doacoes, 0);

    const cidades = lista
        .filter((l) => l.doadores >= MINIMO_DOADORES_PLACAR && l.doacoes > 0)
        .sort((a, b) => b.doacoes - a.doacoes || b.doadores - a.doadores || a.cidade.localeCompare(b.cidade))
        .slice(0, TAMANHO_PLACAR)
        .map((l, i) => ({
            posicao: i + 1,
            cidade: l.cidade,
            doadores: l.doadores,
            doacoes: l.doacoes,
            vidasSalvas: l.doacoes * VIDAS_POR_DOACAO
        }));

    return {
        totalDoacoes,
        totalVidas: totalDoacoes * VIDAS_POR_DOACAO,
        totalDoadores: lista.reduce((soma, l) => soma + l.doadores, 0),
        cidades
    };
}

module.exports = { calcularConquistas, montarPlacar, NIVEIS, VIDAS_POR_DOACAO, MINIMO_DOADORES_PLACAR };
