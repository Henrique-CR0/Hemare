// Testes das regras de agendamento e do historico de doacoes. Rode: node regras/testar-agendamento.js
const A = require('./agendamento');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const AGORA = new Date('2026-10-05T12:00:00-03:00'); // segunda-feira, meio-dia em Brasilia
const HOJE = '2026-10-05';
const vaga = (data, hora, extra) => ({ data, hora, capacidade: 2, reservadas: 0, ...extra });
const mulher = { sexo: 'F', ultima_doacao: null };

console.log('--- Horario de Brasilia ---');
verificar('vaga das 08:30 em Brasilia = 11:30 UTC', A.momentoDaVaga('2026-10-12', '08:30'), Date.parse('2026-10-12T11:30:00Z'));
verificar('23:30 em Brasilia ainda e o dia 5 (02:30 UTC do dia 6)', A.hojeNoBrasil(new Date('2026-10-06T02:30:00Z')), '2026-10-05');
verificar('00:00 em Brasilia ja e o dia 6 (03:00 UTC)', A.hojeNoBrasil(new Date('2026-10-06T03:00:00Z')), '2026-10-06');
verificar('hora 08:00 vale', A.horaValida('08:00'), true);
verificar('hora sem zero (4:00) nao vale', A.horaValida('4:00'), false);
verificar('hora 25:00 nao vale', A.horaValida('25:00'), false);
verificar('antes das 05:00 nao vale', A.horaValida('04:59'), false);
verificar('22:00 vale e 22:01 nao', [A.horaValida('22:00'), A.horaValida('22:01')], [true, false]);
verificar('numero no lugar de texto nao vale', A.horaValida(800), false);
verificar('formatarDia', A.formatarDia('2026-10-09'), '09/10');

console.log('--- Abrir vagas (lote do hospital) ---');
const lote = { de: '2026-10-12', ate: '2026-10-16', diasSemana: [1, 3, 5], horarios: ['08:30', '08:00', '08:00'], capacidade: 2 };
const gerado = A.validarLote(lote, HOJE);
verificar('seg, qua e sex x 2 horarios = 6 vagas, horarios em ordem e sem repetir', gerado.vagas && gerado.vagas.map((v) => v.data + ' ' + v.hora),
    ['2026-10-12 08:00', '2026-10-12 08:30', '2026-10-14 08:00', '2026-10-14 08:30', '2026-10-16 08:00', '2026-10-16 08:30']);
verificar('cada vaga leva a capacidade', gerado.vagas.every((v) => v.capacidade === 2), true);
verificar('data no passado: recusa', typeof A.validarLote({ ...lote, de: '2026-10-01' }, HOJE).erro, 'string');
verificar('data inicial de hoje vale', A.validarLote({ ...lote, de: HOJE, ate: HOJE, diasSemana: [1] }, HOJE).vagas.length, 2);
verificar('final antes da inicial: recusa', typeof A.validarLote({ ...lote, ate: '2026-10-10' }, HOJE).erro, 'string');
verificar('data que nao existe: recusa', typeof A.validarLote({ ...lote, ate: '2026-02-31' }, HOJE).erro, 'string');
verificar('periodo maior que 62 dias: recusa', typeof A.validarLote({ ...lote, de: '2026-10-06', ate: '2026-12-31' }, HOJE).erro, 'string');
verificar('alem de 60 dias a frente: recusa', typeof A.validarLote({ ...lote, de: '2026-12-01', ate: '2026-12-10' }, HOJE).erro, 'string');
verificar('sem dias da semana: recusa', typeof A.validarLote({ ...lote, diasSemana: [] }, HOJE).erro, 'string');
verificar('dia da semana 7: recusa', typeof A.validarLote({ ...lote, diasSemana: [7] }, HOJE).erro, 'string');
verificar('sem horarios: recusa', typeof A.validarLote({ ...lote, horarios: [] }, HOJE).erro, 'string');
verificar('horario mal escrito: recusa', typeof A.validarLote({ ...lote, horarios: ['8h'] }, HOJE).erro, 'string');
verificar('capacidade 0: recusa', typeof A.validarLote({ ...lote, capacidade: 0 }, HOJE).erro, 'string');
verificar('capacidade 21: recusa', typeof A.validarLote({ ...lote, capacidade: 21 }, HOJE).erro, 'string');
verificar('capacidade 1.5: recusa', typeof A.validarLote({ ...lote, capacidade: 1.5 }, HOJE).erro, 'string');
verificar('capacidade em texto: recusa', typeof A.validarLote({ ...lote, capacidade: '2' }, HOJE).erro, 'string');
verificar('nenhum dia cai nos dias escolhidos: recusa', typeof A.validarLote({ ...lote, de: '2026-10-12', ate: '2026-10-12', diasSemana: [0] }, HOJE).erro, 'string');
const horas24 = Array.from({ length: 17 }, (_, i) => String(i + 5).padStart(2, '0') + ':00');
verificar('lote enorme (mais de 600 vagas): recusa', /máximo é 600/.test(A.validarLote({ de: '2026-10-06', ate: '2026-12-04', diasSemana: [0, 1, 2, 3, 4, 5, 6], horarios: horas24, capacidade: 1 }, HOJE).erro || ''), true);
verificar('corpo vazio: recusa', typeof A.validarLote(undefined, HOJE).erro, 'string');

console.log('--- Mudar capacidade e apagar vaga ---');
verificar('capacidade nova valida', A.validarCapacidade(5, 2), { capacidade: 5 });
verificar('nao pode ficar abaixo de quem ja reservou', typeof A.validarCapacidade(1, 2).erro, 'string');
verificar('igual ao numero de reservas vale', A.validarCapacidade(2, 2), { capacidade: 2 });
verificar('capacidade fora da faixa', typeof A.validarCapacidade(30, 0).erro, 'string');
verificar('vaga vazia pode ser apagada', A.podeApagarVaga({ reservadas: 0 }).ok, true);
verificar('vaga com gente nao pode ser apagada', A.podeApagarVaga({ reservadas: 1 }).ok, false);

console.log('--- Agendar: quando pode ---');
const contexto = (extra) => ({ doador: mulher, vaga: vaga('2026-10-12', '08:30'), ativo: null, datasDeDoacao: [], ...extra });
verificar('quem nunca doou agenda na semana que vem', A.podeAgendar(contexto(), AGORA), { ok: true });
verificar('perfil sem sexo: 400', A.podeAgendar(contexto({ doador: { sexo: null } }), AGORA).status, 400);
verificar('horario inexistente: 404', A.podeAgendar(contexto({ vaga: null }), AGORA).status, 404);
verificar('vaga lotada: 409', A.podeAgendar(contexto({ vaga: vaga('2026-10-12', '08:30', { reservadas: 2 }) }), AGORA).status, 409);
verificar('vaga com 1 lugar sobrando: ok', A.podeAgendar(contexto({ vaga: vaga('2026-10-12', '08:30', { reservadas: 1 }) }), AGORA).ok, true);
verificar('daqui a 1 hora: recusa (precisa de 2 horas)', A.podeAgendar(contexto({ vaga: vaga('2026-10-05', '13:00') }), AGORA).status, 400);
verificar('daqui a 2h30: vale', A.podeAgendar(contexto({ vaga: vaga('2026-10-05', '14:30') }), AGORA).ok, true);
verificar('horario que ja passou: recusa', A.podeAgendar(contexto({ vaga: vaga('2026-10-05', '09:00') }), AGORA).status, 400);
verificar('exatamente 60 dias a frente: vale', A.podeAgendar(contexto({ vaga: vaga('2026-12-04', '08:00') }), AGORA).ok, true);
verificar('61 dias a frente: recusa', A.podeAgendar(contexto({ vaga: vaga('2026-12-05', '08:00') }), AGORA).status, 400);
const comAtivo = A.podeAgendar(contexto({ ativo: { data: '2026-10-09', hora: '10:00' } }), AGORA);
verificar('ja tem um agendamento: 409 dizendo qual', [comAtivo.status, /09\/10 às 10:00/.test(comAtivo.erro)], [409, true]);

console.log('--- Agendar: intervalo entre doacoes e limite anual ---');
const recente = { sexo: 'F', ultima_doacao: '2026-09-20' }; // apta em 19/12
const r1 = A.podeAgendar(contexto({ doador: recente }), AGORA);
verificar('ainda nao apta na data: 400 dizendo quando fica', [r1.status, /19\/12/.test(r1.erro)], [400, true]);
const quase = { sexo: 'F', ultima_doacao: '2026-08-20' };    // apta em 18/11
verificar('um dia antes de ficar apta: recusa', A.podeAgendar(contexto({ doador: quase, vaga: vaga('2026-11-17', '08:00') }), AGORA).ok, false);
verificar('no dia exato em que fica apta: vale', A.podeAgendar(contexto({ doador: quase, vaga: vaga('2026-11-18', '08:00') }), AGORA).ok, true);
verificar('homem doa de 60 em 60 dias: 01/08 -> 30/09', A.podeAgendar(contexto({ doador: { sexo: 'M', ultima_doacao: '2026-08-01' }, vaga: vaga('2026-10-12', '08:00') }), AGORA).ok, true);
verificar('aptoEmDia de quem nunca doou e a propria data', A.aptoEmDia(mulher, '2026-10-12'), '2026-10-12');
verificar('aptoEmDia da mulher que doou em 20/09 e 19/12', A.aptoEmDia(recente, HOJE), '2026-12-19');
const quatro = ['2025-11-10', '2026-01-10', '2026-03-10', '2026-07-01'];
const l1 = A.podeAgendar(contexto({ doador: { sexo: 'M', ultima_doacao: '2026-07-01' }, datasDeDoacao: quatro }), AGORA);
verificar('homem com 4 doacoes em 12 meses: atingiu o limite', [l1.status, /limite de 4/.test(l1.erro)], [400, true]);
verificar('mulher com 3 doacoes em 12 meses: limite de 3', /limite de 3/.test(A.podeAgendar(contexto({ doador: { sexo: 'F', ultima_doacao: '2026-07-01' }, datasDeDoacao: ['2025-11-10', '2026-03-10', '2026-07-01'] }), AGORA).erro || ''), true);
verificar('a doacao de mais de 1 ano atras sai da conta', A.podeAgendar(contexto({ doador: { sexo: 'F', ultima_doacao: '2026-07-01' }, datasDeDoacao: ['2025-10-01', '2026-01-10', '2026-07-01'] }), AGORA).ok, true);
verificar('doacoes nos ultimos 12 meses (borda de 365 dias)', A.doacoesNosUltimos12Meses(['2025-10-06', '2025-10-05', '2026-10-05'], HOJE), 2);

console.log('--- Cancelar ---');
verificar('agendado e no futuro: pode', A.podeCancelar({ status: 'agendado' }, vaga('2026-10-12', '08:30'), AGORA).ok, true);
verificar('horario ja passou: 409', A.podeCancelar({ status: 'agendado' }, vaga('2026-10-05', '09:00'), AGORA).status, 409);
verificar('ja cancelado: 409', A.podeCancelar({ status: 'cancelado' }, vaga('2026-10-12', '08:30'), AGORA).status, 409);
verificar('ja compareceu: 409', A.podeCancelar({ status: 'compareceu' }, vaga('2026-10-12', '08:30'), AGORA).status, 409);
verificar('agendamento inexistente: 409', A.podeCancelar(null, vaga('2026-10-12', '08:30'), AGORA).status, 409);

console.log('--- Hospital muda o status ---');
const ag = { status: 'agendado' };
verificar('compareceu no dia da vaga: pode', A.podeMudarStatus(ag, 'compareceu', vaga('2026-10-05', '09:00'), AGORA).ok, true);
verificar('compareceu em outro dia: recusa', A.podeMudarStatus(ag, 'compareceu', vaga('2026-10-06', '09:00'), AGORA).status, 400);
verificar('compareceu ontem: recusa (a doacao entra com a data de hoje)', A.podeMudarStatus(ag, 'compareceu', vaga('2026-10-04', '09:00'), AGORA).status, 400);
verificar('faltou depois do horario: pode', A.podeMudarStatus(ag, 'faltou', vaga('2026-10-05', '09:00'), AGORA).ok, true);
verificar('faltou antes do horario: recusa', A.podeMudarStatus(ag, 'faltou', vaga('2026-10-05', '15:00'), AGORA).status, 400);
verificar('cancelar pelo hospital: pode', A.podeMudarStatus(ag, 'cancelado', vaga('2026-10-12', '08:30'), AGORA).ok, true);
verificar('status inventado: 400', A.podeMudarStatus(ag, 'apagado', vaga('2026-10-05', '09:00'), AGORA).status, 400);
verificar('ja encerrado: 409', A.podeMudarStatus({ status: 'faltou' }, 'compareceu', vaga('2026-10-05', '09:00'), AGORA).status, 409);
verificar('inexistente: 404', A.podeMudarStatus(null, 'compareceu', vaga('2026-10-05', '09:00'), AGORA).status, 404);
verificar('meia-noite no Brasil: 02:30 UTC do dia 6 ainda e dia 5', A.podeMudarStatus(ag, 'compareceu', vaga('2026-10-05', '20:00'), new Date('2026-10-06T02:30:00Z')).ok, true);

console.log('--- O que o hospital ve de quem agendou ---');
const linha = { nome: 'Ana Maria', nome_social: 'Mariana', tipo_sanguineo: 'O+', visibilidade: 'identificado', telefone: '(81) 99999-0001', cpf: '1', email: 'a@x.com' };
verificar('identificado: nome social, tipo e telefone', A.visaoDoAgendado(linha), { nome: 'Mariana', tipoSanguineo: 'O+', telefone: '(81) 99999-0001' });
verificar('anonimo: so nome e tipo, telefone protegido', A.visaoDoAgendado({ ...linha, visibilidade: 'anonimo' }), { nome: 'Mariana', tipoSanguineo: 'O+', telefone: null });
verificar('sem nome social usa o nome', A.visaoDoAgendado({ ...linha, nome_social: null }).nome, 'Ana Maria');
verificar('nunca devolve CPF nem e-mail', /cpf|email|a@x/.test(JSON.stringify(A.visaoDoAgendado(linha))), false);

console.log('--- Historico "Minhas doacoes" ---');
const doacoes = [
    { id: 1, data_doacao: '2025-09-10', hospital: 'Hemope', cidade: 'Recife', hash: 'a'.repeat(64) },
    { id: 2, data_doacao: '2026-01-15', hospital: 'Hemope', cidade: 'Recife', hash: 'b'.repeat(64) },
    { id: 3, data_doacao: '2026-07-01', hospital: 'HC', cidade: 'Recife', hash: 'c'.repeat(64) }
];
const agendamentos = [
    { id: 10, status: 'compareceu', data: '2026-07-01', hora: '08:00', hospital: 'HC', cidade: 'Recife' },
    { id: 11, status: 'faltou', data: '2026-03-01', hora: '09:00', hospital: 'Hemope', cidade: 'Recife' },
    { id: 12, status: 'cancelado', data: '2026-04-01', hora: '09:00', hospital: 'Hemope', cidade: 'Recife' },
    { id: 13, status: 'agendado', data: '2026-10-12', hora: '08:30', hospital: 'Hemope', cidade: 'Recife' }
];
const hist = A.montarHistorico(doacoes, agendamentos, { sexo: 'F', ultima_doacao: '2026-07-01', total_doacoes: 3 }, HOJE);
const r = hist.resumo;
verificar('total de doacoes e vidas (ate 4 por doacao)', [r.totalDoacoes, r.vidasAte], [3, 12]);
verificar('primeira e ultima doacao', [r.primeiraDoacao, r.ultimaDoacao], ['2025-09-10', '2026-07-01']);
verificar('apta desde 29/09 (90 dias depois de 01/07)', [r.aptoAgora, r.aptoEm], [true, '2026-09-29']);
verificar('doacoes nos ultimos 12 meses: 2 (a de 10/09/2025 ja saiu)', r.nosUltimos12Meses, 2);
verificar('mulher: limite 3, restante 1', [r.limiteAnual, r.restantesNoAno], [3, 1]);
verificar('doacoes por ano', r.porAno, { 2025: 1, 2026: 2 });
verificar('agendamentos por status e taxa de comparecimento (1 de 2 encerrados = 50%)', r.agendamentos, { agendado: 1, compareceu: 1, faltou: 1, cancelado: 1, taxaDeComparecimento: 50 });
verificar('proximo agendamento', r.proximoAgendamento, { id: 13, data: '2026-10-12', hora: '08:30', hospital: 'Hemope', cidade: 'Recife' });
verificar('linha do tempo: do mais novo para o mais antigo', hist.linhaDoTempo.map((i) => i.data), ['2026-10-12', '2026-07-01', '2026-04-01', '2026-03-01', '2026-01-15', '2025-09-10']);
verificar('o agendamento que virou doacao nao aparece duas vezes', hist.linhaDoTempo.filter((i) => i.data === '2026-07-01').length, 1);
verificar('o selo da doacao mostra so os 12 primeiros caracteres', hist.linhaDoTempo.find((i) => i.tipo === 'doacao').selo, 'cccccccccccc');
verificar('sem doacoes nem agendamentos: tudo zerado e sem erro', A.montarHistorico([], [], { sexo: 'M', ultima_doacao: null, total_doacoes: 0 }, HOJE).resumo.totalDoacoes, 0);
verificar('total antigo do cadastro (5) vale quando maior que o registro (3)', A.montarHistorico(doacoes, [], { sexo: 'F', ultima_doacao: '2026-07-01', total_doacoes: 5 }, HOJE).resumo.totalDoacoes, 5);
verificar('sem encerrados a taxa e nula', A.montarHistorico([], [{ status: 'agendado', data: '2026-10-12', hora: '08:00' }], { sexo: 'F' }, HOJE).resumo.agendamentos.taxaDeComparecimento, null);
verificar('sem sexo: sem limite nem data de aptidao', (({ limiteAnual, aptoEm }) => [limiteAnual, aptoEm])(A.montarHistorico([], [], { sexo: null }, HOJE).resumo), [null, null]);

console.log('--- Proximo passo ---');
verificar('com agendamento', /12\/10 às 08:30/.test(A.proximoPasso(r)), true);
verificar('apto e sem agendamento', /Você já pode doar/.test(A.proximoPasso({ ...r, proximoAgendamento: null })), true);
verificar('ainda nao apto', /fica apto em 20\/11/.test(A.proximoPasso({ ...r, proximoAgendamento: null, aptoAgora: false, aptoEm: '2026-11-20' })), true);
verificar('limite do ano', /limite de doações/.test(A.proximoPasso({ ...r, proximoAgendamento: null, restantesNoAno: 0 })), true);
verificar('sem perfil', /Complete seu perfil/.test(A.proximoPasso({ proximoAgendamento: null, restantesNoAno: null, aptoAgora: false, aptoEm: null })), true);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
