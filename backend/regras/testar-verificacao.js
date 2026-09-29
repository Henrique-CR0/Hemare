// Teste rapido da regra de verificacao de hospitais.
const { TIPOS_CADASTRO, statusVerificacao, mensagemBloqueio, validarMotivoRecusa } = require('./verificacao');

function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(obtido));
}

console.log('--- Testes de verificacao de hospitais ---');

verificar('Aprovado', statusVerificacao({ aprovado: true, motivo_recusa: null }), 'aprovado');
verificar('Recem-cadastrado: pendente', statusVerificacao({ aprovado: false, motivo_recusa: null }), 'pendente');
verificar('Recusado com motivo', statusVerificacao({ aprovado: false, motivo_recusa: 'CNES nao confere' }), 'recusado');
verificar('Sem perfil: pendente', statusVerificacao(null), 'pendente');
verificar('aprovado nulo (coluna vazia): pendente', statusVerificacao({ aprovado: null }), 'pendente');
verificar('aprovado como texto "true" nao passa', statusVerificacao({ aprovado: 'true' }), 'pendente');

verificar('Cadastro aceita doador e hospital', TIPOS_CADASTRO, ['doador', 'hospital']);
verificar('Cadastro NAO aceita admin', TIPOS_CADASTRO.includes('admin'), false);

verificar('Mensagem de bloqueio (recusado) cita recusa',
    mensagemBloqueio('recusado').includes('recusado'), true);
verificar('Mensagem de bloqueio (pendente) cita verificacao',
    mensagemBloqueio('pendente').includes('verificação'), true);

verificar('Motivo curto e recusado', validarMotivoRecusa('ruim').valido, false);
verificar('Motivo vazio e recusado', validarMotivoRecusa('   ').valido, false);
verificar('Motivo ausente e recusado', validarMotivoRecusa(undefined).valido, false);
verificar('Motivo longo demais e recusado', validarMotivoRecusa('x'.repeat(501)).valido, false);
verificar('Motivo valido (espacos removidos)',
    validarMotivoRecusa('  CNES nao encontrado no DATASUS  '), { valido: true, motivo: 'CNES nao encontrado no DATASUS' });
