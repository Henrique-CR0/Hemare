// Hemare - Regra do alerta de emergencia inteligente: QUEM deve receber o chamado.
// Antes o alerta ia para todo doador compativel e identificado, mesmo quem doou
// semana passada ou mora em outro estado. Agora so vai para quem:
//   1. tem tipo sanguineo compativel com o pedido;
//   2. aceitou ser identificado (LGPD) e tem email;
//   3. esta APTO a doar hoje (intervalo de 60/90 dias cumprido);
//   4. mora na MESMA cidade do hospital;
//   5. nao recebeu outro alerta nos ultimos dias (para nao cansar o doador).
const { verificarElegibilidade } = require('./elegibilidade');

// Um doador recebe no maximo 1 alerta a cada 3 dias.
const DIAS_ENTRE_ALERTAS = 3;

// "São Paulo " e "sao paulo" viram a mesma coisa.
function normalizarCidade(cidade) {
    return String(cidade || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

// Converte para 'AAAA-MM-DD' (o banco devolve DATE como Date a meia-noite local;
// usar so o dia do calendario evita erro de 1 dia por causa de fuso horario).
function paraDia(valor) {
    if (valor instanceof Date) {
        const m = String(valor.getMonth() + 1).padStart(2, '0');
        const d = String(valor.getDate()).padStart(2, '0');
        return valor.getFullYear() + '-' + m + '-' + d;
    }
    return String(valor).slice(0, 10);
}

// Diferenca em dias (de calendario) entre duas datas.
function diasEntre(dataAntiga, dataNova) {
    const umDia = 1000 * 60 * 60 * 24;
    return Math.round((Date.parse(paraDia(dataNova)) - Date.parse(paraDia(dataAntiga))) / umDia);
}

// doadores: [{ id, nome, email, tipo_sanguineo, sexo, cidade, visibilidade, ultima_doacao, ultimo_alerta }]
// opcoes:   { tiposCompativeis: ['O-', ...], cidadeHospital: 'Recife', hoje: '2026-09-29' (opcional) }
// Devolve quem convocar e um resumo de quantos ficaram de fora em cada etapa.
function selecionarDoadoresParaAlerta(doadores, opcoes) {
    const hoje = paraDia(opcoes.hoje || new Date());
    const cidadeAlvo = normalizarCidade(opcoes.cidadeHospital);
    const tipos = opcoes.tiposCompativeis || [];

    const compativeis = (doadores || []).filter((d) =>
        tipos.includes(d.tipo_sanguineo) && d.visibilidade === 'identificado' && d.email
    );
    const aptos = compativeis.filter((d) => verificarElegibilidade(d.ultima_doacao, d.sexo, hoje).apto);
    const naCidade = aptos.filter((d) => cidadeAlvo && normalizarCidade(d.cidade) === cidadeAlvo);
    const convocados = naCidade.filter((d) =>
        !d.ultimo_alerta || diasEntre(d.ultimo_alerta, hoje) >= DIAS_ENTRE_ALERTAS
    );

    return {
        convocados,
        resumo: {
            compativeis: compativeis.length,
            aptos: aptos.length,
            naCidade: naCidade.length,
            convocados: convocados.length,
            poupadosPorAlertaRecente: naCidade.length - convocados.length
        }
    };
}

// Mensagem para o hospital entender o que aconteceu com o alerta.
function descreverAlerta(resumo, cidade) {
    if (resumo.convocados > 0) {
        const pessoas = resumo.convocados === 1 ? '1 doador compatível e apto' : resumo.convocados + ' doadores compatíveis e aptos';
        return '🚨 Alerta enviado para ' + pessoas + ' em ' + cidade + '.';
    }
    if (resumo.naCidade > 0) {
        return 'Os doadores aptos em ' + cidade + ' já receberam um alerta nos últimos ' + DIAS_ENTRE_ALERTAS
            + ' dias; por isso não foram chamados de novo agora.';
    }
    return 'Nenhum doador compatível, identificado e apto hoje em ' + cidade
        + '. A necessidade fica publicada e visível no painel.';
}

module.exports = { selecionarDoadoresParaAlerta, descreverAlerta, normalizarCidade, DIAS_ENTRE_ALERTAS };
