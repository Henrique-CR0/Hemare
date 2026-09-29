// Hemare - Regra de verificacao de hospitais (feita por um administrador).
// Um hospital so pode agir sobre dados de doadores depois de aprovado:
// ver contatos (match), confirmar doacoes, publicar necessidades e estoque.

// Tipos de conta que qualquer pessoa pode criar pelo site.
// "admin" NAO entra aqui: so e criado pelo script db/tornar-admin.js.
const TIPOS_CADASTRO = ['doador', 'hospital'];

// hospital: { aprovado, motivo_recusa } (linha da tabela hospitais)
// Devolve 'aprovado', 'recusado' ou 'pendente'.
function statusVerificacao(hospital) {
    if (!hospital) return 'pendente';
    if (hospital.aprovado === true) return 'aprovado';
    if (hospital.motivo_recusa) return 'recusado';
    return 'pendente';
}

// Mensagem mostrada quando um hospital nao aprovado tenta uma acao bloqueada.
function mensagemBloqueio(status) {
    if (status === 'recusado') {
        return 'O cadastro deste hospital foi recusado na verificação. Veja o motivo no seu painel.';
    }
    return 'Seu hospital ainda está em verificação. Esta ação será liberada assim que um administrador aprovar o cadastro.';
}

// Motivo de recusa precisa explicar o problema ao hospital.
function validarMotivoRecusa(motivo) {
    const texto = typeof motivo === 'string' ? motivo.trim() : '';
    if (texto.length < 10) {
        return { valido: false, erro: 'Explique o motivo da recusa (pelo menos 10 caracteres).' };
    }
    if (texto.length > 500) {
        return { valido: false, erro: 'O motivo pode ter no máximo 500 caracteres.' };
    }
    return { valido: true, motivo: texto };
}

module.exports = { TIPOS_CADASTRO, statusVerificacao, mensagemBloqueio, validarMotivoRecusa };
