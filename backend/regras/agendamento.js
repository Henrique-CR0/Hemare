// Hemare - Regras do agendamento de doacao e do historico "Minhas doacoes".
//
// O doador marca um horario num hemocentro/hospital APROVADO; o hospital abre as vagas (data, hora, capacidade),
// confirma quem compareceu (e ai a doacao entra na cadeia de confianca) e marca quem faltou.
//
// Escolhas de projeto:
// - Horario de Brasilia (UTC-3, sem horario de verao desde 2019): a vaga "2026-10-12 08:30" e sempre 08:30 la.
// - Uma pessoa so tem UM agendamento ativo por vez; so agenda para uma data em que JA estara apta (intervalo
//   de 60/90 dias e limite anual do art. 38 da Portaria 11.685/2026).
// - Vaga lotada nunca passa da capacidade: a reserva e feita com um UPDATE condicional no banco.
// - O hospital ve nome (social, se houver), tipo sanguineo e horario de quem agendou, nada alem disso.
const { verificarElegibilidade, INTERVALO_DIAS } = require('./elegibilidade');
const { paraDia, diasEntre } = require('./alerta');
const { somarDias, dataValida } = require('./campanha');

const FUSO = '-03:00';
const ANTECEDENCIA_MIN_HORAS = 2;     // nao da para agendar "daqui a pouco"
const MAX_DIAS_A_FRENTE = 60;         // ninguem agenda alem de 60 dias
const MAX_DIAS_DO_LOTE = 62;          // o hospital abre vagas de ate ~2 meses por vez
const MAX_VAGAS_POR_LOTE = 600;
const CAPACIDADE_MAXIMA = 20;         // pessoas ao mesmo tempo no mesmo horario
const MAX_HORARIOS_POR_DIA = 24;
const HORA_MIN = '05:00', HORA_MAX = '22:00';
const VIDAS_POR_DOACAO = 4;           // "ate 4 vidas" (o sangue e separado em componentes)
const LIMITE_ANUAL = { M: 4, F: 3 };  // art. 38 da Portaria 11.685/2026, em 12 meses

const STATUS = ['agendado', 'compareceu', 'faltou', 'cancelado'];

function pad(n) { return String(n).padStart(2, '0'); }

// Instante exato (ms) de uma vaga, no horario de Brasilia.
function momentoDaVaga(data, hora) {
    return Date.parse(paraDia(data) + 'T' + hora + ':00' + FUSO);
}

// 'AAAA-MM-DD' de hoje, no Brasil.
function hojeNoBrasil(agora) {
    const ms = (agora instanceof Date ? agora.getTime() : Number(agora || Date.now())) - 3 * 3600 * 1000;
    return new Date(ms).toISOString().slice(0, 10);
}

function horaValida(hora) {
    return typeof hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) && hora >= HORA_MIN && hora <= HORA_MAX;
}

function formatarDia(dia) {
    return paraDia(dia).slice(8, 10) + '/' + paraDia(dia).slice(5, 7);
}

function diaDaSemana(dia) {
    return new Date(paraDia(dia) + 'T00:00:00Z').getUTCDay();
}

// ===================== HOSPITAL: abrir vagas =====================

// corpo: { de, ate, diasSemana: [0..6], horarios: ['08:00', ...], capacidade }
// Devolve { erro } ou { vagas: [{ data, hora, capacidade }] }.
function validarLote(corpo, hoje) {
    const c = corpo || {};
    const dia = paraDia(hoje || new Date());

    if (!dataValida(c.de) || !dataValida(c.ate)) return { erro: 'Informe as datas inicial e final (AAAA-MM-DD).' };
    if (c.de < dia) return { erro: 'A data inicial não pode ser no passado.' };
    if (c.ate < c.de) return { erro: 'A data final precisa ser igual ou depois da inicial.' };
    if (diasEntre(c.de, c.ate) > MAX_DIAS_DO_LOTE) return { erro: 'Abra no máximo ' + MAX_DIAS_DO_LOTE + ' dias por vez.' };
    if (diasEntre(dia, c.ate) > MAX_DIAS_A_FRENTE) return { erro: 'As vagas só podem ser abertas até ' + MAX_DIAS_A_FRENTE + ' dias à frente.' };

    if (!Array.isArray(c.diasSemana) || c.diasSemana.length === 0 || !c.diasSemana.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
        return { erro: 'Escolha os dias da semana (0 = domingo ... 6 = sábado).' };
    }
    const dias = [...new Set(c.diasSemana)];

    if (!Array.isArray(c.horarios) || c.horarios.length === 0) return { erro: 'Informe ao menos um horário.' };
    if (c.horarios.length > MAX_HORARIOS_POR_DIA) return { erro: 'No máximo ' + MAX_HORARIOS_POR_DIA + ' horários por dia.' };
    if (!c.horarios.every(horaValida)) return { erro: 'Horários devem estar no formato HH:MM, entre ' + HORA_MIN + ' e ' + HORA_MAX + '.' };
    const horarios = [...new Set(c.horarios)].sort();

    if (!Number.isInteger(c.capacidade) || c.capacidade < 1 || c.capacidade > CAPACIDADE_MAXIMA) {
        return { erro: 'A capacidade de cada horário deve ser de 1 a ' + CAPACIDADE_MAXIMA + ' pessoas.' };
    }

    const vagas = [];
    for (let d = c.de; d <= c.ate; d = somarDias(d, 1)) {
        if (!dias.includes(diaDaSemana(d))) continue;
        for (const hora of horarios) vagas.push({ data: d, hora, capacidade: c.capacidade });
    }
    if (vagas.length === 0) return { erro: 'Nenhum dia do período cai nos dias da semana escolhidos.' };
    if (vagas.length > MAX_VAGAS_POR_LOTE) return { erro: 'Isso daria ' + vagas.length + ' vagas; o máximo é ' + MAX_VAGAS_POR_LOTE + ' por vez.' };
    return { vagas };
}

// Mudar a capacidade de uma vaga: nunca abaixo de quem ja reservou.
function validarCapacidade(valor, reservadas) {
    if (!Number.isInteger(valor) || valor < 1 || valor > CAPACIDADE_MAXIMA) {
        return { erro: 'A capacidade deve ser de 1 a ' + CAPACIDADE_MAXIMA + ' pessoas.' };
    }
    if (valor < (reservadas || 0)) {
        return { erro: 'Já há ' + reservadas + ' pessoa(s) agendada(s) neste horário. Cancele os agendamentos antes de reduzir.' };
    }
    return { capacidade: valor };
}

// So se apaga uma vaga sem ninguem agendado (quem tem gente, cancela os agendamentos primeiro).
function podeApagarVaga(vaga) {
    if ((vaga.reservadas || 0) > 0) return { ok: false, erro: 'Há pessoas agendadas neste horário. Cancele os agendamentos antes de apagar.' };
    return { ok: true };
}

// ===================== DOADOR: agendar =====================

// Em que dia a pessoa fica apta (nunca antes de 'a partir de').
function aptoEmDia(doador, aPartirDe) {
    const e = verificarElegibilidade(doador.ultima_doacao ? paraDia(doador.ultima_doacao) : null, doador.sexo, paraDia(aPartirDe));
    if (e.diasRestantes === null || e.diasRestantes === undefined) return null;
    return somarDias(paraDia(aPartirDe), e.diasRestantes);
}

// Quantas doacoes nos ultimos 12 meses (para o limite anual).
function doacoesNosUltimos12Meses(datas, hoje) {
    const dia = paraDia(hoje);
    return (datas || []).filter((d) => {
        const n = diasEntre(paraDia(d), dia);
        return n >= 0 && n < 365;
    }).length;
}

// contexto: { doador: { sexo, ultima_doacao }, vaga: { data, hora, capacidade, reservadas }, ativo: agendamento ativo
//             de OUTRA vaga (ou null), datasDeDoacao: ['AAAA-MM-DD', ...] }
// Devolve { ok: true } ou { ok: false, status, erro }.
function podeAgendar(contexto, agora) {
    const { doador, vaga, ativo, datasDeDoacao } = contexto;
    const instante = agora instanceof Date ? agora : new Date(agora || Date.now());
    const hoje = hojeNoBrasil(instante);

    if (!doador || (doador.sexo !== 'M' && doador.sexo !== 'F')) {
        return { ok: false, status: 400, erro: 'Complete seu perfil (informe o sexo) para agendar.' };
    }
    if (!vaga) return { ok: false, status: 404, erro: 'Horário não encontrado.' };

    const momento = momentoDaVaga(vaga.data, vaga.hora);
    if (momento < instante.getTime() + ANTECEDENCIA_MIN_HORAS * 3600 * 1000) {
        return { ok: false, status: 400, erro: 'Escolha um horário com pelo menos ' + ANTECEDENCIA_MIN_HORAS + ' horas de antecedência.' };
    }
    if (diasEntre(hoje, paraDia(vaga.data)) > MAX_DIAS_A_FRENTE) {
        return { ok: false, status: 400, erro: 'Só dá para agendar até ' + MAX_DIAS_A_FRENTE + ' dias à frente.' };
    }
    if ((vaga.reservadas || 0) >= vaga.capacidade) {
        return { ok: false, status: 409, erro: 'Este horário já está lotado. Escolha outro.' };
    }

    if (ativo) {
        return { ok: false, status: 409, erro: 'Você já tem um agendamento (' + formatarDia(ativo.data) + ' às ' + ativo.hora + '). Reagende ou cancele antes de marcar outro.' };
    }

    const aptoEm = aptoEmDia(doador, vaga.data);
    if (aptoEm && aptoEm > paraDia(vaga.data)) {
        return { ok: false, status: 400, erro: 'Nesta data você ainda não estará apto. Você fica apto em ' + formatarDia(aptoEm) + ': escolha esse dia ou depois.' };
    }

    const limite = LIMITE_ANUAL[doador.sexo];
    if (doacoesNosUltimos12Meses(datasDeDoacao, vaga.data) >= limite) {
        return { ok: false, status: 400, erro: 'Você já atingiu o limite de ' + limite + ' doações em 12 meses. Escolha uma data mais à frente.' };
    }
    return { ok: true };
}

// O doador cancela/reagenda o proprio agendamento enquanto o horario nao chegou.
function podeCancelar(agendamento, vaga, agora) {
    const instante = agora instanceof Date ? agora : new Date(agora || Date.now());
    if (!agendamento || agendamento.status !== 'agendado') {
        return { ok: false, status: 409, erro: 'Este agendamento já foi encerrado.' };
    }
    if (momentoDaVaga(vaga.data, vaga.hora) <= instante.getTime()) {
        return { ok: false, status: 409, erro: 'O horário já passou.' };
    }
    return { ok: true };
}

// ===================== HOSPITAL: acompanhar quem veio =====================

// O hospital muda o status de um agendamento (a doacao so entra na cadeia quando "compareceu").
function podeMudarStatus(agendamento, novoStatus, vaga, agora) {
    const instante = agora instanceof Date ? agora : new Date(agora || Date.now());
    if (!['compareceu', 'faltou', 'cancelado'].includes(novoStatus)) {
        return { ok: false, status: 400, erro: 'Status inválido. Use "compareceu", "faltou" ou "cancelado".' };
    }
    if (!agendamento) return { ok: false, status: 404, erro: 'Agendamento não encontrado.' };
    if (agendamento.status !== 'agendado') {
        return { ok: false, status: 409, erro: 'Este agendamento já foi encerrado (' + agendamento.status + ').' };
    }
    if (novoStatus === 'compareceu' && paraDia(vaga.data) !== hojeNoBrasil(instante)) {
        return { ok: false, status: 400, erro: 'Só dá para confirmar a presença no dia da doação.' };
    }
    if (novoStatus === 'faltou' && momentoDaVaga(vaga.data, vaga.hora) > instante.getTime()) {
        return { ok: false, status: 400, erro: 'O horário ainda não passou.' };
    }
    return { ok: true };
}

// O que o hospital enxerga de quem agendou (so o necessario para receber a pessoa).
// linha: { nome, nome_social, tipo_sanguineo, visibilidade, telefone }
function visaoDoAgendado(linha) {
    const identificado = linha.visibilidade === 'identificado';
    return {
        nome: linha.nome_social || linha.nome,
        tipoSanguineo: linha.tipo_sanguineo,
        telefone: identificado ? (linha.telefone || null) : null
    };
}

// ===================== HISTORICO =====================

// doacoes: [{ id, data_doacao, hospital, cidade, hash }]
// agendamentos: [{ id, status, data, hora, hospital, cidade }]
// doador: { sexo, ultima_doacao, total_doacoes }
function montarHistorico(doacoes, agendamentos, doador, hoje) {
    const dia = paraDia(hoje || new Date());
    const lista = (doacoes || []).map((d) => ({ ...d, data: paraDia(d.data_doacao) })).sort((a, b) => (a.data < b.data ? 1 : -1));
    const ags = agendamentos || [];

    const total = Math.max(lista.length, Number(doador && doador.total_doacoes) || 0);
    const datas = lista.map((d) => d.data);
    const ultima = lista.length > 0 ? lista[0].data : (doador && doador.ultima_doacao ? paraDia(doador.ultima_doacao) : null);

    const sexo = doador && doador.sexo;
    const limite = LIMITE_ANUAL[sexo] || null;
    const noAno = doacoesNosUltimos12Meses(datas, dia);
    // Data em que a pessoa fica (ou ficou) apta: ultima doacao + intervalo. Sem doacao e sem sexo, nao ha data.
    const intervalo = INTERVALO_DIAS[sexo];
    const aptoEm = !intervalo ? null : (ultima ? somarDias(ultima, intervalo) : dia);

    const porAno = {};
    for (const d of lista) { const a = d.data.slice(0, 4); porAno[a] = (porAno[a] || 0) + 1; }

    const contagem = { agendado: 0, compareceu: 0, faltou: 0, cancelado: 0 };
    for (const a of ags) if (contagem[a.status] !== undefined) contagem[a.status]++;
    const encerrados = contagem.compareceu + contagem.faltou;
    const proximo = ags.filter((a) => a.status === 'agendado').sort((a, b) => ((paraDia(a.data) + a.hora) < (paraDia(b.data) + b.hora) ? -1 : 1))[0] || null;

    const linhaDoTempo = [
        ...lista.map((d) => ({ tipo: 'doacao', data: d.data, hospital: d.hospital, cidade: d.cidade, selo: d.hash ? String(d.hash).slice(0, 12) : null })),
        ...ags.filter((a) => a.status !== 'compareceu').map((a) => ({
            tipo: 'agendamento', data: paraDia(a.data), hora: a.hora, status: a.status, hospital: a.hospital, cidade: a.cidade, id: a.id
        }))
    ].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

    return {
        resumo: {
            totalDoacoes: total,
            vidasAte: total * VIDAS_POR_DOACAO,
            primeiraDoacao: lista.length > 0 ? lista[lista.length - 1].data : null,
            ultimaDoacao: ultima,
            aptoAgora: aptoEm !== null && aptoEm <= dia,
            aptoEm: aptoEm,
            nosUltimos12Meses: noAno,
            limiteAnual: limite,
            restantesNoAno: limite === null ? null : Math.max(0, limite - noAno),
            porAno,
            agendamentos: { ...contagem, taxaDeComparecimento: encerrados > 0 ? Math.round((contagem.compareceu / encerrados) * 100) : null },
            proximoAgendamento: proximo ? { id: proximo.id, data: paraDia(proximo.data), hora: proximo.hora, hospital: proximo.hospital, cidade: proximo.cidade } : null
        },
        linhaDoTempo
    };
}

// Texto curto para a tela do doador sobre o que fazer agora.
function proximoPasso(resumo) {
    if (resumo.proximoAgendamento) {
        return 'Seu próximo agendamento é em ' + formatarDia(resumo.proximoAgendamento.data) + ' às ' + resumo.proximoAgendamento.hora + '.';
    }
    if (resumo.restantesNoAno === 0) return 'Você atingiu o limite de doações em 12 meses. Você volta a poder doar quando a doação mais antiga completar 1 ano.';
    if (resumo.aptoAgora) return 'Você já pode doar! Que tal agendar um horário?';
    if (resumo.aptoEm) return 'Você fica apto em ' + formatarDia(resumo.aptoEm) + '. Já dá para agendar para esse dia ou depois.';
    return 'Complete seu perfil para ver quando você pode doar.';
}

module.exports = {
    STATUS, FUSO, ANTECEDENCIA_MIN_HORAS, MAX_DIAS_A_FRENTE, MAX_VAGAS_POR_LOTE, CAPACIDADE_MAXIMA, VIDAS_POR_DOACAO, LIMITE_ANUAL,
    momentoDaVaga, hojeNoBrasil, horaValida, formatarDia, validarLote, validarCapacidade, podeApagarVaga, aptoEmDia,
    doacoesNosUltimos12Meses, podeAgendar, podeCancelar, podeMudarStatus, visaoDoAgendado, montarHistorico, proximoPasso
};
