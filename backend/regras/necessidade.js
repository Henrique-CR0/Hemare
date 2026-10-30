// Hemare - Regras da necessidade de sangue publicada pelo hospital: o que pode ser pedido e como ela muda de estado.
// Uma necessidade nasce 'aberta' e o hospital a fecha como 'atendida' (conseguiu o sangue) ou 'cancelada'.
// Fechada, ela deixa de contar como urgencia no canal de noticias e em qualquer painel.
const { TIPOS_SANGUINEOS } = require('./perfil');

const URGENCIAS = ['estavel', 'alerta', 'critico', 'emergencia'];
const STATUS = ['aberta', 'atendida', 'cancelada'];
const TIPOS_DOACAO = ['sangue', 'plaquetas', 'plasma'];

// Tipos que um hospital pode pedir (os 8 tipos comuns; "Rh nulo" tem a rede propria de sangue raro).
const TIPOS_PEDIDO = TIPOS_SANGUINEOS.filter((t) => /^(O|A|B|AB)[+-]$/.test(t));

// Publicar. Devolve { erro } ou { necessidade: { tipoSanguineo, tipoDoacao, urgencia } }.
function validarNecessidade(corpo) {
    const c = corpo || {};
    if (!TIPOS_PEDIDO.includes(c.tipoSanguineo)) return { erro: 'Escolha o tipo sanguíneo necessário (O+, O-, A+, A-, B+, B-, AB+ ou AB-).' };
    const urgencia = c.urgencia === undefined || c.urgencia === '' ? 'estavel' : c.urgencia;
    if (!URGENCIAS.includes(urgencia)) return { erro: 'Urgência inválida. Use estável, alerta, crítico ou emergência.' };
    const tipoDoacao = c.tipoDoacao === undefined || c.tipoDoacao === '' ? 'sangue' : c.tipoDoacao;
    if (!TIPOS_DOACAO.includes(tipoDoacao)) return { erro: 'Tipo de doação inválido. Use sangue, plaquetas ou plasma.' };
    return { necessidade: { tipoSanguineo: c.tipoSanguineo, tipoDoacao, urgencia } };
}

// Atualizar: so status e urgencia mudam (o tipo sanguineo nao: outro tipo e outra necessidade).
// Devolve { erro } ou { mudancas: { status?, urgencia? } }.
function validarAtualizacao(corpo) {
    const c = corpo || {};
    const mudancas = {};
    if (c.status !== undefined) {
        if (!STATUS.includes(c.status)) return { erro: 'Status inválido. Use aberta, atendida ou cancelada.' };
        mudancas.status = c.status;
    }
    if (c.urgencia !== undefined) {
        if (!URGENCIAS.includes(c.urgencia)) return { erro: 'Urgência inválida. Use estável, alerta, crítico ou emergência.' };
        mudancas.urgencia = c.urgencia;
    }
    if (Object.keys(mudancas).length === 0) return { erro: 'Informe o que mudar: status ou urgência.' };
    return { mudancas };
}

// So muda a urgencia de uma necessidade que ainda esta aberta.
function podeMudar(atual, mudancas) {
    if (mudancas.urgencia !== undefined && (mudancas.status === undefined ? atual.status : mudancas.status) !== 'aberta') {
        return { ok: false, erro: 'Só dá para mudar a urgência de uma necessidade aberta. Reabra antes.' };
    }
    return { ok: true };
}

module.exports = { URGENCIAS, STATUS, TIPOS_DOACAO, TIPOS_PEDIDO, validarNecessidade, validarAtualizacao, podeMudar };
