// Hemare - Regras da campanha de reposicao ("Quem doa por mim").
//
// O problema: quando alguem esta internado, o hospital pede que a familia "reponha" o sangue, e a familia
// sai pedindo doadores por mensagem, sem saber quantos ja foram nem se a doacao foi contada.
// Aqui a familia (via hospital) ganha um LINK com a meta e o progresso; cada amigo promete uma data,
// e so vira "doada" quando o hospital confirma (entrando na cadeia de confianca). O paciente aparece
// so por apelido: nada de nome, CPF ou diagnostico.
const { validarApelido } = require('./apadrinhamento');
const { verificarElegibilidade } = require('./elegibilidade');
const { paraDia, diasEntre } = require('./alerta');

const META_MAXIMA = 30;      // bolsas
const PRAZO_PADRAO = 15;     // dias de campanha
const PRAZO_MAXIMO = 60;
const JANELA_PROMESSA = 30;  // ninguem promete data alem de 30 dias a frente

// 'AAAA-MM-DD' + n dias (calculo em UTC, sem surpresa de fuso ou horario de verao).
function somarDias(dia, n) {
    const d = new Date(Date.parse(paraDia(dia) + 'T00:00:00Z') + n * 86400000);
    return d.toISOString().slice(0, 10);
}

// Data valida no formato 'AAAA-MM-DD'? (recusa "2026-02-31", "amanha", numeros...)
function dataValida(texto) {
    if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const d = new Date(texto + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

// Confere o que o hospital preencheu. Devolve { erro } ou { campanha } ja limpo.
function validarCampanha(corpo) {
    const c = corpo || {};

    if (c.autorizacao !== true) {
        return { erro: 'Confirme que o paciente ou a família autorizou divulgar este pedido.' };
    }

    const conferido = validarApelido(c.apelido);
    if (conferido.erro) return { erro: conferido.erro };

    const metaBolsas = Number(c.metaBolsas);
    if (!Number.isInteger(metaBolsas) || metaBolsas < 1 || metaBolsas > META_MAXIMA) {
        return { erro: 'Informe quantas bolsas o hospital pediu (de 1 a ' + META_MAXIMA + ').' };
    }

    let prazoDias = PRAZO_PADRAO;
    if (c.prazoDias !== undefined && c.prazoDias !== null && c.prazoDias !== '') {
        prazoDias = Number(c.prazoDias);
        if (!Number.isInteger(prazoDias) || prazoDias < 1 || prazoDias > PRAZO_MAXIMO) {
            return { erro: 'O prazo da campanha deve ser de 1 a ' + PRAZO_MAXIMO + ' dias.' };
        }
    }

    return { campanha: { apelido: conferido.apelido, metaBolsas, prazoDias } };
}

// dados: { metaBolsas, confirmadas, prometidas, expiraEm, ativo }
// status: 'aberta' | 'meta-atingida' | 'expirada' | 'encerrada'
function situacaoCampanha(dados, hoje) {
    const dia = paraDia(hoje || new Date());
    const meta = Math.max(1, Number(dados.metaBolsas) || 1);
    const confirmadas = Math.max(0, Number(dados.confirmadas) || 0);
    const prometidas = Math.max(0, Number(dados.prometidas) || 0);
    const expiraEm = paraDia(dados.expiraEm);

    let status = 'aberta';
    if (dados.ativo === false) status = 'encerrada';
    else if (diasEntre(dia, expiraEm) < 0) status = 'expirada';
    else if (confirmadas >= meta) status = 'meta-atingida';

    return {
        status,
        metaBolsas: meta,
        confirmadas,
        prometidas,
        faltam: Math.max(0, meta - confirmadas),
        porcentagem: Math.min(100, Math.round((confirmadas / meta) * 100)),
        diasRestantes: Math.max(0, diasEntre(dia, expiraEm)),
        aceitaPromessas: status === 'aberta' || status === 'meta-atingida'
    };
}

// Um doador pode prometer doar nesta data?
// doador: { ultima_doacao, sexo }; situacao: resultado de situacaoCampanha; expiraEm: 'AAAA-MM-DD'
function validarPromessa({ data, hoje, situacao, expiraEm, jaPrometeu, doador }) {
    const dia = paraDia(hoje || new Date());

    if (!situacao.aceitaPromessas) return { pode: false, erro: 'Esta campanha não está mais recebendo promessas.' };
    if (jaPrometeu) return { pode: false, erro: 'Você já prometeu doar por este paciente.' };
    if (!dataValida(data)) return { pode: false, erro: 'Escolha a data em que você vai doar.' };
    if (diasEntre(dia, data) < 0) return { pode: false, erro: 'A data não pode ser no passado.' };
    if (diasEntre(dia, data) > JANELA_PROMESSA) {
        return { pode: false, erro: 'Escolha uma data dentro dos próximos ' + JANELA_PROMESSA + ' dias.' };
    }
    if (diasEntre(data, paraDia(expiraEm)) < 0) {
        return { pode: false, erro: 'A campanha termina antes dessa data. Escolha um dia até ' + paraDia(expiraEm).split('-').reverse().join('/') + '.' };
    }

    // So promete quem vai estar apto naquele dia (60/90 dias desde a ultima doacao).
    const elegibilidade = verificarElegibilidade(doador.ultima_doacao, doador.sexo, data);
    if (!elegibilidade.apto) {
        return {
            pode: false,
            erro: elegibilidade.diasRestantes
                ? 'Nessa data você ainda estará no intervalo entre doações (faltam ' + elegibilidade.diasRestantes + ' dias). Escolha uma data mais à frente.'
                : 'Informe o sexo no seu perfil para conferir a data.'
        };
    }
    return { pode: true, erro: null };
}

// Texto para a familia divulgar (WhatsApp, redes).
function mensagemCompartilhar({ apelido, hospital, cidade, faltam, link }) {
    const quanto = faltam > 0
        ? 'Faltam ' + faltam + (faltam === 1 ? ' doação' : ' doações') + '. '
        : 'A meta já foi atingida, mas toda doação ajuda! ';
    return '🩸 Doe por ' + apelido + '. O ' + hospital + ' (' + cidade + ') pediu reposição de sangue. ' + quanto
        + 'Prometa sua doação e acompanhe o progresso: ' + link;
}

module.exports = {
    META_MAXIMA, PRAZO_PADRAO, PRAZO_MAXIMO, JANELA_PROMESSA,
    somarDias, dataValida, validarCampanha, situacaoCampanha, validarPromessa, mensagemCompartilhar
};
