// Hemare - Regras da Rede de sangue raro.
//
// Quem tem um fenotipo raro (Rh nulo, Bombay...) e muito dificil de encontrar numa emergencia. A rede junta
// esses doadores, mas protegendo-os:
//   * o doador ENTRA porque quer (consentimento) e escolhe ate onde pode ir (cidade, estado ou pais);
//   * o fenotipo comeca "declarado" e so vira "confirmado" quando um hospital confere o laudo pessoalmente;
//   * o hospital NUNCA ve a lista: ele descreve a emergencia, o Hemare chama os doadores compativeis e o
//     hospital so passa a ver nome e telefone de quem responde "posso ajudar";
//   * cada doador recebe no maximo um chamado por semana e todo pedido fica registrado e expira em 72h.
// A decisao clinica e sempre da equipe medica: a rede so ajuda a encontrar quem pode ajudar.
const { normalizarCidade, paraDia, diasEntre } = require('./alerta');
const { verificarElegibilidade } = require('./elegibilidade');
const { validarApelido } = require('./apadrinhamento');

const FENOTIPOS = [
    { valor: 'rh-nulo', rotulo: 'Rh nulo (sangue dourado)' },
    { valor: 'bombay', rotulo: 'Bombay (Oh)' },
    { valor: 'vel-negativo', rotulo: 'Vel negativo' },
    { valor: 'jk-nulo', rotulo: 'Jk(a-b-) (Kidd nulo)' },
    { valor: 'kell-nulo', rotulo: 'Kell nulo (K0)' }
];

const ALCANCES = [
    { valor: 'cidade', rotulo: 'Só na minha cidade' },
    { valor: 'estado', rotulo: 'No meu estado' },
    { valor: 'pais', rotulo: 'Em qualquer lugar do Brasil' }
];

const DIAS_ENTRE_CHAMADOS = 7;   // um doador raro e chamado no maximo 1 vez por semana
const VALIDADE_PEDIDO_HORAS = 72;
const MAX_PEDIDOS_ABERTOS = 3;   // por hospital

function limpar(texto) {
    return typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim() : '';
}

function fenotipoValido(valor) {
    return FENOTIPOS.some((f) => f.valor === valor);
}

function rotuloFenotipo(valor) {
    const f = FENOTIPOS.find((x) => x.valor === valor);
    return f ? f.rotulo : null;
}

// Participacao do doador. Devolve { erro } ou { participacao }.
function validarParticipacao(corpo) {
    const c = corpo || {};
    if (c.participar !== true && c.participar !== false) return { erro: 'Informe se quer participar da rede (true ou false).' };
    if (c.participar === false) return { participacao: { participar: false } };

    if (!fenotipoValido(c.fenotipo)) return { erro: 'Escolha o seu fenótipo raro na lista.' };
    if (!ALCANCES.some((a) => a.valor === c.alcance)) return { erro: 'Escolha até onde você pode ir.' };
    if (c.consentimento !== true) {
        return { erro: 'Para entrar na rede, confirme que autoriza hospitais aprovados a contatar você em emergências reais.' };
    }
    return { participacao: { participar: true, fenotipo: c.fenotipo, alcance: c.alcance } };
}

// Pedido de emergencia do hospital. Devolve { erro } ou { pedido }.
function validarPedido(corpo) {
    const c = corpo || {};
    if (!fenotipoValido(c.fenotipo)) return { erro: 'Escolha o fenótipo que o paciente precisa.' };

    const motivo = limpar(c.motivo);
    if (motivo.length < 20 || motivo.length > 300) {
        return { erro: 'Descreva a emergência em 20 a 300 caracteres (sem nome do paciente). O registro fica guardado para auditoria.' };
    }

    let apelidoPaciente = null;
    if (limpar(c.apelidoPaciente)) {
        const a = validarApelido(c.apelidoPaciente);
        if (a.erro) return { erro: a.erro };
        apelidoPaciente = a.apelido;
    }
    return { pedido: { fenotipo: c.fenotipo, motivo, apelidoPaciente } };
}

// O doador esta ao alcance do hospital?
function noAlcance(doador, hospital) {
    if (doador.raro_alcance === 'pais') return true;
    const mesmaCidade = normalizarCidade(doador.cidade) !== '' && normalizarCidade(doador.cidade) === normalizarCidade(hospital.cidade);
    if (doador.raro_alcance === 'cidade') return mesmaCidade;
    if (doador.raro_alcance === 'estado') {
        const a = String(doador.estado || '').toUpperCase();
        const b = String(hospital.estado || '').toUpperCase();
        // Doador antigo sem estado informado: cai para a mesma cidade (nunca chama de longe sem ter certeza).
        return a !== '' && b !== '' ? a === b : mesmaCidade;
    }
    return false;
}

// Quem chamar para um pedido. doadores: linhas de doadores (com nome/email do usuario).
// pedido: { fenotipo }; hospital: { cidade, estado }. Devolve { convocados, resumo }.
// "confirmados" conta a rede toda (sem identificar ninguem); os demais, as etapas ate o chamado.
function selecionarDoadoresRaros(doadores, pedido, hospital, hoje) {
    const dia = paraDia(hoje || new Date());
    const lista = doadores || [];

    const confirmados = lista.filter((d) =>
        d.raro_fenotipo === pedido.fenotipo && d.raro_status === 'confirmado' && d.raro_consentimento === true
    );
    const ao_alcance = confirmados.filter((d) => noAlcance(d, hospital));
    const comEmail = ao_alcance.filter((d) => d.email);
    const aptos = comEmail.filter((d) => verificarElegibilidade(d.ultima_doacao, d.sexo, dia).apto);
    const convocados = aptos.filter((d) => !d.raro_ultima_notificacao || diasEntre(d.raro_ultima_notificacao, dia) >= DIAS_ENTRE_CHAMADOS);

    return {
        convocados,
        resumo: {
            naRede: confirmados.length,
            noAlcance: ao_alcance.length,
            aptos: aptos.length,
            convocados: convocados.length,
            poupadosPorChamadoRecente: aptos.length - convocados.length
        }
    };
}

// Texto para o hospital entender o que aconteceu.
function descreverResultado(resumo) {
    if (resumo.convocados > 0) {
        return '🆘 Chamado enviado para ' + (resumo.convocados === 1 ? '1 doador compatível' : resumo.convocados + ' doadores compatíveis')
            + '. Quem responder "posso ajudar" aparece aqui com nome e telefone.';
    }
    if (resumo.naRede === 0) return 'Ainda não há doadores confirmados com esse fenótipo na rede.';
    if (resumo.noAlcance === 0) return 'Há doadores na rede, mas nenhum que possa chegar até a sua cidade.';
    if (resumo.aptos === 0) return 'Há doadores ao alcance, mas nenhum está apto a doar hoje (intervalo entre doações ou sem e-mail).';
    return 'Os doadores aptos já receberam um chamado de sangue raro nos últimos ' + DIAS_ENTRE_CHAMADOS + ' dias.';
}

// O pedido ainda esta valendo? pedido: { status, expira_em }
function estadoDoPedido(pedido, agora) {
    const t = (agora ? new Date(agora) : new Date()).getTime();
    if (pedido.status !== 'aberto') return { aberto: false, motivo: 'encerrado', horasRestantes: 0 };
    const restante = new Date(pedido.expira_em).getTime() - t;
    if (restante <= 0) return { aberto: false, motivo: 'expirado', horasRestantes: 0 };
    return { aberto: true, motivo: null, horasRestantes: Math.ceil(restante / 3600000) };
}

function expiraEm(agora) {
    return new Date((agora ? new Date(agora) : new Date()).getTime() + VALIDADE_PEDIDO_HORAS * 3600000);
}

// A resposta do doador a um chamado.
function validarResposta(texto) {
    return texto === 'disponivel' || texto === 'indisponivel' ? texto : null;
}

module.exports = {
    FENOTIPOS, ALCANCES, DIAS_ENTRE_CHAMADOS, VALIDADE_PEDIDO_HORAS, MAX_PEDIDOS_ABERTOS,
    fenotipoValido, rotuloFenotipo, validarParticipacao, validarPedido, noAlcance, selecionarDoadoresRaros,
    descreverResultado, estadoDoPedido, expiraEm, validarResposta
};
