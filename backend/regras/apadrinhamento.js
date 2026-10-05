// Hemare - Regras do apadrinhamento: pacientes que precisam de transfusao de tempos em tempos
// (ex.: talassemia, anemia falciforme) ganham "padrinhos" — doadores compativeis que se
// comprometem a voltar a doar para eles.
//
// PRIVACIDADE: o caso e publico, entao ele NAO guarda nome, CPF, idade nem texto livre.
// So um apelido, o tipo sanguineo, uma condicao de uma lista fixa e a frequencia das transfusoes.
const { doadoresCompativeis, podeDoar } = require('./compatibilidade');
const { verificarElegibilidade } = require('./elegibilidade');
const { paraDia, diasEntre, DIAS_ENTRE_ALERTAS } = require('./alerta');

// Lista fixa: texto livre poderia acabar identificando o paciente.
const CONDICOES = [
    'Não informada',
    'Anemia falciforme',
    'Talassemia',
    'Hemofilia',
    'Tratamento oncológico',
    'Aplasia de medula',
    'Outra condição'
];

const FREQUENCIA_MINIMA = 14;    // dias entre transfusoes
const FREQUENCIA_MAXIMA = 120;
const META_MAXIMA = 30;
const MAX_AFILHADOS = 3;         // por doador: para ninguem prometer mais do que consegue cumprir
const DIAS_ENTRE_CHAMADAS = 7;   // o hospital chama os padrinhos de um caso no maximo 1 vez por semana
const INTERVALO_MEDIO_DOACAO = 90; // um doador volta a doar a cada 60 (homens) ou 90 (mulheres) dias
const BOLSAS_POR_TRANSFUSAO = 2;

// Quantos padrinhos cobrem o paciente: cada padrinho doa no maximo a cada ~90 dias,
// e cada transfusao usa ~2 bolsas. Ex.: transfusao a cada 30 dias -> 3 x 2 = 6 padrinhos.
function sugerirMeta(frequenciaDias) {
    const meta = Math.ceil(INTERVALO_MEDIO_DOACAO / frequenciaDias) * BOLSAS_POR_TRANSFUSAO;
    return Math.min(META_MAXIMA, Math.max(2, meta));
}

// Confere o apelido publico de um paciente (vale para apadrinhamento e campanhas de reposicao).
// Devolve { erro } ou { apelido } ja limpo.
function validarApelido(texto) {
    const apelido = typeof texto === 'string' ? texto.trim().replace(/\s+/g, ' ') : '';
    if (apelido.length < 2 || apelido.length > 30) {
        return { erro: 'Dê um apelido de 2 a 30 caracteres (nunca o nome verdadeiro).' };
    }
    if (!/^[\p{L}0-9 -]+$/u.test(apelido)) {
        return { erro: 'O apelido só pode ter letras, números, espaço e hífen.' };
    }
    // Poucos numeros: bloqueia CPF, telefone, prontuario e data de nascimento.
    if ((apelido.match(/[0-9]/g) || []).length > 3) {
        return { erro: 'O apelido não pode ter documentos ou telefones. Use algo como "Paciente Aurora".' };
    }
    return { apelido };
}

// Confere o que o hospital preencheu. Devolve { erro } ou { caso } ja limpo.
function validarCaso(corpo) {
    const c = corpo || {};

    if (c.autorizacao !== true) {
        return { erro: 'Confirme que o paciente ou o responsável autorizou divulgar este pedido.' };
    }

    const conferido = validarApelido(c.apelido);
    if (conferido.erro) return { erro: conferido.erro };
    const apelido = conferido.apelido;

    if (doadoresCompativeis(c.tipoSanguineo).length === 0) {
        return { erro: 'Escolha o tipo sanguíneo do paciente (O-, O+, A-, A+, B-, B+, AB- ou AB+).' };
    }

    const condicao = c.condicao === undefined || c.condicao === null || c.condicao === '' ? CONDICOES[0] : c.condicao;
    if (!CONDICOES.includes(condicao)) {
        return { erro: 'Escolha uma condição da lista.' };
    }

    const frequenciaDias = Number(c.frequenciaDias);
    if (!Number.isInteger(frequenciaDias) || frequenciaDias < FREQUENCIA_MINIMA || frequenciaDias > FREQUENCIA_MAXIMA) {
        return { erro: 'Informe de quantos em quantos dias o paciente precisa de sangue (' + FREQUENCIA_MINIMA + ' a ' + FREQUENCIA_MAXIMA + ').' };
    }

    let metaPadrinhos = sugerirMeta(frequenciaDias);
    if (c.metaPadrinhos !== undefined && c.metaPadrinhos !== null && c.metaPadrinhos !== '') {
        metaPadrinhos = Number(c.metaPadrinhos);
        if (!Number.isInteger(metaPadrinhos) || metaPadrinhos < 1 || metaPadrinhos > META_MAXIMA) {
            return { erro: 'A meta de padrinhos deve ser de 1 a ' + META_MAXIMA + '.' };
        }
    }

    return { caso: { apelido, tipoSanguineo: c.tipoSanguineo, condicao, frequenciaDias, metaPadrinhos } };
}

// Um doador pode apadrinhar este paciente?
function podeApadrinhar({ tipoDoador, tipoPaciente, afilhadosAtuais, jaEPadrinho, casoAtivo }) {
    if (!casoAtivo) return { pode: false, motivo: 'Este pedido já foi encerrado.' };
    if (jaEPadrinho) return { pode: false, motivo: 'Você já é padrinho ou madrinha deste paciente.' };
    if (!podeDoar(tipoDoador, tipoPaciente)) {
        return { pode: false, motivo: 'Seu tipo sanguíneo (' + tipoDoador + ') não é compatível com ' + tipoPaciente + '.' };
    }
    if ((Number(afilhadosAtuais) || 0) >= MAX_AFILHADOS) {
        return { pode: false, motivo: 'Você já apadrinha ' + MAX_AFILHADOS + ' pacientes, o máximo por pessoa.' };
    }
    return { pode: true, motivo: null };
}

// Progresso do caso: quantos padrinhos ja tem em relacao a meta.
function situacaoMeta(padrinhos, meta) {
    const qtd = Math.max(0, Number(padrinhos) || 0);
    const alvo = Math.max(1, Number(meta) || 1);
    return { padrinhos: qtd, meta: alvo, porcentagem: Math.min(100, Math.round((qtd / alvo) * 100)), completo: qtd >= alvo };
}

// O hospital ja pode chamar os padrinhos de novo?
function podeChamarAgora(ultimaChamada, hoje) {
    if (!ultimaChamada) return { pode: true, diasRestantes: 0 };
    const passados = diasEntre(ultimaChamada, paraDia(hoje || new Date()));
    return passados >= DIAS_ENTRE_CHAMADAS
        ? { pode: true, diasRestantes: 0 }
        : { pode: false, diasRestantes: DIAS_ENTRE_CHAMADAS - passados };
}

// padrinhos: [{ id, nome, email, sexo, ultima_doacao, ultimo_alerta }]
// Quem convocar: com email, apto hoje e que nao recebeu outro chamado nos ultimos dias.
// Nao exige "identificado" nem mesma cidade: o padrinho ja aceitou ajudar este paciente.
function selecionarPadrinhosParaChamada(padrinhos, hoje) {
    const dia = paraDia(hoje || new Date());
    const lista = padrinhos || [];
    const comEmail = lista.filter((p) => p.email);
    const aptos = comEmail.filter((p) => verificarElegibilidade(p.ultima_doacao, p.sexo, dia).apto);
    const convocados = aptos.filter((p) => !p.ultimo_alerta || diasEntre(p.ultimo_alerta, dia) >= DIAS_ENTRE_ALERTAS);
    return {
        convocados,
        resumo: {
            padrinhos: lista.length,
            aptos: aptos.length,
            convocados: convocados.length,
            poupadosPorAlertaRecente: aptos.length - convocados.length
        }
    };
}

function descreverChamada(resumo) {
    if (resumo.convocados > 0) {
        return '💌 Chamado enviado para ' + (resumo.convocados === 1 ? '1 padrinho apto' : resumo.convocados + ' padrinhos aptos') + '.';
    }
    if (resumo.padrinhos === 0) return 'Este paciente ainda não tem padrinhos.';
    if (resumo.aptos > 0) return 'Os padrinhos aptos já receberam um chamado nos últimos ' + DIAS_ENTRE_ALERTAS + ' dias.';
    return 'Nenhum padrinho está apto a doar hoje (todos ainda estão no intervalo entre doações).';
}

module.exports = {
    CONDICOES, FREQUENCIA_MINIMA, FREQUENCIA_MAXIMA, META_MAXIMA, MAX_AFILHADOS, DIAS_ENTRE_CHAMADAS,
    sugerirMeta, validarApelido, validarCaso, podeApadrinhar, situacaoMeta, podeChamarAgora,
    selecionarPadrinhosParaChamada, descreverChamada
};
