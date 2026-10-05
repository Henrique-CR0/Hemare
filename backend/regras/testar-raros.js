// Testes das regras da Rede de sangue raro. Rode: node regras/testar-raros.js
const {
    FENOTIPOS, fenotipoValido, rotuloFenotipo, validarParticipacao, validarPedido, noAlcance,
    selecionarDoadoresRaros, descreverResultado, estadoDoPedido, expiraEm, validarResposta
} = require('./raros');
const { calcularConquistas } = require('./gamificacao');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const HOJE = '2026-10-05';

console.log('--- Fenotipos ---');
verificar('cinco fenotipos', FENOTIPOS.length, 5);
verificar('rh-nulo valido', fenotipoValido('rh-nulo'), true);
verificar('texto qualquer nao vale', fenotipoValido('O-'), false);
verificar('rotulo do bombay', rotuloFenotipo('bombay'), 'Bombay (Oh)');
verificar('rotulo desconhecido: null', rotuloFenotipo('x'), null);

console.log('--- Participacao do doador ---');
const ok = { participar: true, fenotipo: 'rh-nulo', alcance: 'estado', consentimento: true };
verificar('participacao valida', validarParticipacao(ok).participacao, { participar: true, fenotipo: 'rh-nulo', alcance: 'estado' });
verificar('sair da rede', validarParticipacao({ participar: false }).participacao, { participar: false });
verificar('sem dizer se participa: recusa', typeof validarParticipacao({}).erro, 'string');
verificar('fenotipo fora da lista: recusa', typeof validarParticipacao({ ...ok, fenotipo: 'O-' }).erro, 'string');
verificar('alcance invalido: recusa', typeof validarParticipacao({ ...ok, alcance: 'mundo' }).erro, 'string');
verificar('sem consentimento: recusa', typeof validarParticipacao({ ...ok, consentimento: false }).erro, 'string');
verificar('consentimento em texto nao vale', typeof validarParticipacao({ ...ok, consentimento: 'true' }).erro, 'string');
verificar('corpo vazio nao quebra', typeof validarParticipacao(undefined).erro, 'string');

console.log('--- Pedido do hospital ---');
const pedido = { fenotipo: 'bombay', motivo: 'Paciente em cirurgia cardíaca sem unidade compatível no estoque.' };
verificar('pedido valido', validarPedido(pedido).pedido, { fenotipo: 'bombay', motivo: 'Paciente em cirurgia cardíaca sem unidade compatível no estoque.', apelidoPaciente: null });
verificar('apelido do paciente opcional', validarPedido({ ...pedido, apelidoPaciente: 'Paciente Aurora' }).pedido.apelidoPaciente, 'Paciente Aurora');
verificar('apelido com CPF: recusa', typeof validarPedido({ ...pedido, apelidoPaciente: 'Ana 12345678901' }).erro, 'string');
verificar('fenotipo invalido: recusa', typeof validarPedido({ ...pedido, fenotipo: 'A+' }).erro, 'string');
verificar('motivo curto: recusa', typeof validarPedido({ ...pedido, motivo: 'urgente' }).erro, 'string');
verificar('motivo longo demais: recusa', typeof validarPedido({ ...pedido, motivo: 'x'.repeat(301) }).erro, 'string');
verificar('corpo vazio nao quebra', typeof validarPedido(undefined).erro, 'string');

console.log('--- Alcance ---');
const hosp = { cidade: 'Recife', estado: 'PE' };
const d = (extra) => ({ cidade: 'Recife', estado: 'PE', raro_alcance: 'cidade', ...extra });
verificar('cidade: mesma cidade (sem acento/maiuscula)', noAlcance(d({ cidade: ' recife ' }), hosp), true);
verificar('cidade: outra cidade', noAlcance(d({ cidade: 'Olinda' }), hosp), false);
verificar('estado: mesmo estado, outra cidade', noAlcance(d({ raro_alcance: 'estado', cidade: 'Caruaru' }), hosp), true);
verificar('estado: outro estado', noAlcance(d({ raro_alcance: 'estado', cidade: 'Natal', estado: 'RN' }), hosp), false);
verificar('estado sem estado informado: so a mesma cidade', [noAlcance(d({ raro_alcance: 'estado', estado: null, cidade: 'Caruaru' }), hosp), noAlcance(d({ raro_alcance: 'estado', estado: null }), hosp)], [false, true]);
verificar('pais: qualquer lugar', noAlcance(d({ raro_alcance: 'pais', cidade: 'Manaus', estado: 'AM' }), hosp), true);
verificar('alcance desconhecido: nao chama', noAlcance(d({ raro_alcance: 'x' }), hosp), false);
verificar('cidade vazia nunca casa', noAlcance(d({ cidade: '' }), { cidade: '', estado: 'PE' }), false);

console.log('--- Quem e chamado ---');
const base = {
    raro_fenotipo: 'rh-nulo', raro_status: 'confirmado', raro_consentimento: true, raro_alcance: 'estado',
    email: 'x@x.com', sexo: 'M', ultima_doacao: null, raro_ultima_notificacao: null, cidade: 'Recife', estado: 'PE'
};
const doadores = [
    { id: 1, ...base },                                                              // chamado
    { id: 2, ...base, raro_status: 'declarado' },                                    // ainda nao confirmado
    { id: 3, ...base, raro_consentimento: false },                                   // saiu da rede
    { id: 4, ...base, raro_fenotipo: 'bombay' },                                     // outro fenotipo
    { id: 5, ...base, cidade: 'Natal', estado: 'RN' },                               // fora do alcance
    { id: 6, ...base, email: null },                                                 // sem email
    { id: 7, ...base, ultima_doacao: '2026-09-20' },                                 // doou ha 15 dias
    { id: 8, ...base, raro_ultima_notificacao: '2026-10-01' },                       // chamado ha 4 dias
    { id: 9, ...base, raro_ultima_notificacao: '2026-09-28' }                        // chamado ha 7 dias: pode
];
const r = selecionarDoadoresRaros(doadores, { fenotipo: 'rh-nulo' }, hosp, HOJE);
verificar('so quem esta confirmado, ao alcance, apto e sem chamado recente', r.convocados.map((x) => x.id), [1, 9]);
verificar('resumo de cada etapa', r.resumo, { naRede: 6, noAlcance: 5, aptos: 3, convocados: 2, poupadosPorChamadoRecente: 1 });
verificar('sem doadores nao quebra', selecionarDoadoresRaros([], { fenotipo: 'rh-nulo' }, hosp, HOJE).resumo.convocados, 0);
verificar('sem argumentos nao quebra', selecionarDoadoresRaros().convocados.length, 0);
verificar('mensagem: chamou 2', descreverResultado(r.resumo).includes('2 doadores compatíveis'), true);
verificar('mensagem: rede vazia', descreverResultado({ naRede: 0, noAlcance: 0, aptos: 0, convocados: 0 }), 'Ainda não há doadores confirmados com esse fenótipo na rede.');
verificar('mensagem: ninguem ao alcance', descreverResultado({ naRede: 3, noAlcance: 0, aptos: 0, convocados: 0 }).includes('chegar'), true);
verificar('mensagem: ninguem apto', descreverResultado({ naRede: 3, noAlcance: 2, aptos: 0, convocados: 0 }).includes('apto'), true);
verificar('mensagem: chamados recentes', descreverResultado({ naRede: 3, noAlcance: 2, aptos: 2, convocados: 0 }).includes('últimos 7 dias'), true);

console.log('--- Validade do pedido ---');
const agora = '2026-10-05T12:00:00Z';
verificar('72 horas depois', expiraEm(agora).toISOString(), '2026-10-08T12:00:00.000Z');
verificar('aberto, 60h restantes', estadoDoPedido({ status: 'aberto', expira_em: '2026-10-08T00:00:00Z' }, agora), { aberto: true, motivo: null, horasRestantes: 60 });
verificar('passou do prazo: expirado', estadoDoPedido({ status: 'aberto', expira_em: '2026-10-05T11:59:00Z' }, agora), { aberto: false, motivo: 'expirado', horasRestantes: 0 });
verificar('encerrado pelo hospital', estadoDoPedido({ status: 'encerrado', expira_em: '2026-10-08T00:00:00Z' }, agora).motivo, 'encerrado');
verificar('resposta valida', [validarResposta('disponivel'), validarResposta('indisponivel')], ['disponivel', 'indisponivel']);
verificar('resposta invalida', validarResposta('talvez'), null);

console.log('--- Emblema ---');
function ganhos(dados) {
    return calcularConquistas(dados).emblemas.filter((e) => e.conquistado).map((e) => e.id);
}
verificar('fora da rede: sem emblema', ganhos({ totalDoacoes: 0, redeRara: false }), []);
verificar('na rede (confirmado): emblema', ganhos({ totalDoacoes: 0, redeRara: true }), ['rede-rara']);
verificar('valor invalido nao quebra', ganhos({ totalDoacoes: 0 }), []);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
