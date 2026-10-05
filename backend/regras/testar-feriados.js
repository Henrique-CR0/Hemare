// Testes das regras do Calendario do sangue (feriados). Rode: node regras/testar-feriados.js
const {
    somarDias, diaDaSemana, pascoa, periodoDeFeriadoFixo, periodosDoAno, proximosPeriodos, planoDoDoador,
    precisaAvisoFeriado, contarParaHospital, selecionarParaChamado, podeChamar, descreverChamado, formatarDia
} = require('./feriados');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const HOJE = '2026-10-05'; // segunda-feira

console.log('--- Datas e Pascoa ---');
verificar('somar dias atravessa o mes', somarDias('2026-10-30', 3), '2026-11-02');
verificar('somar dias negativo atravessa o ano', somarDias('2027-01-01', -2), '2026-12-30');
verificar('05/10/2026 e segunda', diaDaSemana('2026-10-05'), 1);
verificar('Pascoa 2024', pascoa(2024), '2024-03-31');
verificar('Pascoa 2025', pascoa(2025), '2025-04-20');
verificar('Pascoa 2026', pascoa(2026), '2026-04-05');
verificar('Pascoa 2027', pascoa(2027), '2027-03-28');
verificar('Pascoa 2030', pascoa(2030), '2030-04-21');

console.log('--- Feriado isolado vira periodo conforme o dia da semana ---');
verificar('segunda: fim de semana de 3 dias, risco medio', periodoDeFeriadoFixo('2026-10-12'), { inicio: '2026-10-10', fim: '2026-10-12', risco: 'medio' });
verificar('terca: emenda na segunda, 4 dias, risco alto', periodoDeFeriadoFixo('2026-04-21'), { inicio: '2026-04-18', fim: '2026-04-21', risco: 'alto' });
verificar('quarta: dia isolado, risco baixo', periodoDeFeriadoFixo('2027-04-21'), { inicio: '2027-04-21', fim: '2027-04-21', risco: 'baixo' });
verificar('quinta: emenda na sexta, 4 dias, risco alto', periodoDeFeriadoFixo('2030-04-18'), { inicio: '2030-04-18', fim: '2030-04-21', risco: 'alto' });
verificar('sexta: 3 dias, risco medio', periodoDeFeriadoFixo('2026-11-20'), { inicio: '2026-11-20', fim: '2026-11-22', risco: 'medio' });
verificar('domingo: ninguem perde dia util, sem periodo', periodoDeFeriadoFixo('2026-11-15'), null);
verificar('sabado: sem periodo', periodoDeFeriadoFixo('2026-05-02'), null);

console.log('--- Periodos do ano ---');
const p2026 = periodosDoAno(2026);
const achar = (lista, nome) => lista.find((p) => p.nome === nome);
verificar('Carnaval 2026: sabado a quarta de cinzas, 5 dias, risco alto',
    (({ inicio, fim, risco, dias }) => ({ inicio, fim, risco, dias }))(achar(p2026, 'Carnaval')),
    { inicio: '2026-02-14', fim: '2026-02-18', risco: 'alto', dias: 5 });
verificar('Carnaval 2025 cai em marco', achar(periodosDoAno(2025), 'Carnaval').inicio, '2025-03-01');
verificar('Sexta-feira Santa 2026: de sexta a domingo de Pascoa', (({ inicio, fim, risco }) => ({ inicio, fim, risco }))(achar(p2026, 'Sexta-feira Santa')),
    { inicio: '2026-04-03', fim: '2026-04-05', risco: 'medio' });
verificar('Corpus Christi 2026 (quinta) pesa um nivel a menos: medio', achar(p2026, 'Corpus Christi').risco, 'medio');
verificar('Corpus Christi 2026 comeca na quinta 04/06', achar(p2026, 'Corpus Christi').inicio, '2026-06-04');
verificar('Natal e Ano Novo 2026: 24/12 a 02/01, 10 dias, risco alto',
    (({ inicio, fim, risco, dias }) => ({ inicio, fim, risco, dias }))(achar(p2026, 'Natal e Ano Novo')),
    { inicio: '2026-12-24', fim: '2027-01-02', risco: 'alto', dias: 10 });
verificar('1o de janeiro nao vira periodo proprio (entra no fim de ano)', p2026.some((p) => p.nome === 'Ano Novo'), false);
verificar('15/11/2026 e domingo: sem periodo', p2026.some((p) => p.nome === 'Proclamação da República'), false);
verificar('Consciencia Negra e feriado nacional', !!achar(p2026, 'Consciência Negra'), true);
verificar('periodos vem em ordem de data', p2026.every((p, i) => i === 0 || p2026[i - 1].inicio <= p.inicio), true);

console.log('--- Proximos periodos ---');
const prox = proximosPeriodos(HOJE);
verificar('de 05/10/2026 (75 dias): Aparecida, Finados e Consciencia Negra', prox.map((p) => p.nome), ['Nossa Senhora Aparecida', 'Finados', 'Consciência Negra']);
verificar('Aparecida: faltam 5 dias e o ultimo dia para doar e sexta 09/10', [prox[0].diasParaInicio, prox[0].ultimoDiaParaDoar, prox[0].emAndamento], [5, '2026-10-09', false]);
verificar('a pagina nao lista o Natal ainda (fora dos 75 dias)', prox.some((p) => p.nome === 'Natal e Ano Novo'), false);
verificar('olhando 120 dias a frente o Natal aparece', proximosPeriodos(HOJE, 120).some((p) => p.nome === 'Natal e Ano Novo'), true);
verificar('feriado de meio de semana (risco baixo) nunca aparece', proximosPeriodos('2027-04-10').some((p) => p.nome === 'Tiradentes'), false);
const emAndamento = proximosPeriodos('2026-10-11');
verificar('durante o feriado: marcado em andamento e 0 dias para o inicio', [emAndamento[0].nome, emAndamento[0].emAndamento, emAndamento[0].diasParaInicio], ['Nossa Senhora Aparecida', true, 0]);
verificar('apos o feriado ele some', proximosPeriodos('2026-10-13').some((p) => p.nome === 'Nossa Senhora Aparecida'), false);
verificar('o Natal que atravessa o ano ainda aparece em 01/01', proximosPeriodos('2027-01-01')[0].nome, 'Natal e Ano Novo');
verificar('virada de ano: de 20/12 enxerga o Natal', proximosPeriodos('2026-12-20')[0].nome, 'Natal e Ano Novo');

console.log('--- Plano de cada doador ---');
const aparecida = prox[0];   // inicio 10/10, ultimo dia para doar 09/10
const finados = prox[1];     // inicio 31/10, ultimo dia para doar 30/10
verificar('nunca doou: apto agora, janela ate sexta', planoDoDoador({ sexo: 'F', ultima_doacao: null }, aparecida, HOJE),
    { situacao: 'apto-agora', aptoEm: '2026-10-05', janela: { de: '2026-10-05', ate: '2026-10-09' }, mensagem: 'Você já está apto. Doe até 09/10, antes do feriado.' });
const doouAgo1 = { sexo: 'F', ultima_doacao: '2026-08-01' }; // mulher: 90 dias -> apta em 30/10
verificar('mulher que doou em 01/08: fica apta em 30/10', planoDoDoador(doouAgo1, finados, HOJE).aptoEm, '2026-10-30');
verificar('... e isso e DENTRO da janela de Finados (apto-antes)', planoDoDoador(doouAgo1, finados, HOJE).situacao, 'apto-antes');
verificar('... mas so depois do feriado de Aparecida (apto-depois)', planoDoDoador(doouAgo1, aparecida, HOJE).situacao, 'apto-depois');
verificar('apto-depois sugere convidar um amigo', /convidar um amigo/.test(planoDoDoador(doouAgo1, aparecida, HOJE).mensagem), true);
const doouAgo2 = { sexo: 'F', ultima_doacao: '2026-08-10' }; // apta em 08/11
verificar('apta em 08/11: depois de Finados', planoDoDoador(doouAgo2, finados, HOJE).situacao, 'apto-depois');
verificar('homem que doou em 20/08: apto em 19/10 (60 dias)', planoDoDoador({ sexo: 'M', ultima_doacao: '2026-08-20' }, finados, HOJE).aptoEm, '2026-10-19');
verificar('sem sexo no perfil: pede para informar', planoDoDoador({ sexo: null, ultima_doacao: null }, aparecida, HOJE).situacao, 'sem-dados');
verificar('durante o feriado e apto: incentiva doar', planoDoDoador({ sexo: 'M', ultima_doacao: null }, emAndamento[0], '2026-10-11').situacao, 'apto-agora');
verificar('formatarDia', formatarDia('2026-10-09'), '09/10');

console.log('--- Aviso automatico por e-mail ---');
const quer = { quer_aviso_feriado: true, email: 'a@x.com', sexo: 'F', ultima_doacao: null };
verificar('quer aviso, esta apto, faltam 5 dias: avisa', precisaAvisoFeriado(quer, aparecida, HOJE, false), true);
verificar('nao pediu o aviso: nao avisa', precisaAvisoFeriado({ ...quer, quer_aviso_feriado: false }, aparecida, HOJE, false), false);
verificar('pedido nulo (coluna nova ainda sem valor): nao avisa', precisaAvisoFeriado({ ...quer, quer_aviso_feriado: null }, aparecida, HOJE, false), false);
verificar('sem e-mail: nao avisa', precisaAvisoFeriado({ ...quer, email: '' }, aparecida, HOJE, false), false);
verificar('ja avisado deste periodo: nao avisa de novo', precisaAvisoFeriado(quer, aparecida, HOJE, true), false);
verificar('faltam 26 dias (Finados): ainda cedo', precisaAvisoFeriado(quer, finados, HOJE, false), false);
verificar('faltam exatamente 10 dias: avisa', precisaAvisoFeriado(quer, { ...finados, diasParaInicio: 10 }, HOJE, false), true);
verificar('faltam 11 dias: ainda cedo', precisaAvisoFeriado(quer, { ...finados, diasParaInicio: 11 }, HOJE, false), false);
verificar('feriado em andamento: nao avisa', precisaAvisoFeriado(quer, emAndamento[0], '2026-10-11', false), false);
verificar('so fica apto depois do feriado: nao avisa', precisaAvisoFeriado({ ...quer, ultima_doacao: '2026-08-10' }, { ...finados, diasParaInicio: 5 }, HOJE, false), false);
verificar('fica apto antes do feriado: avisa', precisaAvisoFeriado({ ...quer, ultima_doacao: '2026-08-01' }, { ...finados, diasParaInicio: 5 }, HOJE, false), true);

console.log('--- Contagens para o hospital (so numeros) ---');
const base = [
    { cidade: 'Recife', sexo: 'F', ultima_doacao: null },                // apto agora
    { cidade: 'recife ', sexo: 'M', ultima_doacao: '2026-07-01' },       // apto agora (60 dias passaram)
    { cidade: 'Recife', sexo: 'F', ultima_doacao: '2026-08-01' },        // apta em 30/10
    { cidade: 'Recife', sexo: 'F', ultima_doacao: '2026-08-10' },        // apta em 08/11
    { cidade: 'Recife', sexo: null, ultima_doacao: null },                // sem sexo: fora da conta
    { cidade: 'Olinda', sexo: 'F', ultima_doacao: null }                  // outra cidade
];
verificar('Aparecida: 5 na cidade, 2 aptos agora, 2 aptos ate o feriado', contarParaHospital(base, 'Recife', aparecida, HOJE), { naCidade: 5, aptosAgora: 2, aptosAteOFeriado: 2 });
verificar('Finados: mais uma pessoa fica apta a tempo', contarParaHospital(base, 'Recife', finados, HOJE), { naCidade: 5, aptosAgora: 2, aptosAteOFeriado: 3 });
verificar('cidade sem doadores: tudo zero', contarParaHospital(base, 'Caruaru', finados, HOJE), { naCidade: 0, aptosAgora: 0, aptosAteOFeriado: 0 });
verificar('o resultado so tem numeros (nenhum dado de pessoa)', Object.values(contarParaHospital(base, 'Recife', finados, HOJE)).every((v) => typeof v === 'number'), true);

console.log('--- Quem o hospital pode chamar ---');
const pessoas = [
    { id: 1, cidade: 'Recife', visibilidade: 'identificado', email: 'a@x.com', sexo: 'F', ultima_doacao: null },
    { id: 2, cidade: 'Recife', visibilidade: 'anonimo', email: 'b@x.com', sexo: 'F', ultima_doacao: null },
    { id: 3, cidade: 'Recife', visibilidade: 'identificado', email: '', sexo: 'F', ultima_doacao: null },
    { id: 4, cidade: 'Olinda', visibilidade: 'identificado', email: 'd@x.com', sexo: 'F', ultima_doacao: null },
    { id: 5, cidade: 'Recife', visibilidade: 'identificado', email: 'e@x.com', sexo: 'F', ultima_doacao: '2026-08-10' },
    { id: 6, cidade: 'Recife', visibilidade: 'identificado', email: 'f@x.com', sexo: 'F', ultima_doacao: '2026-08-01' },
    { id: 7, cidade: 'Recife', visibilidade: 'identificado', email: 'g@x.com', sexo: 'M', ultima_doacao: '2026-07-01' }
];
const sel = selecionarParaChamado(pessoas, 'Recife', finados, HOJE, new Set());
verificar('chama so identificados, com e-mail, da cidade, aptos ate o feriado (ids 1, 6 e 7)', sel.convocados.map((d) => d.id), [1, 6, 7]);
verificar('resumo da selecao', sel.resumo, { identificados: 4, aptos: 3, convocados: 3, poupadosPorAvisoRecente: 0 });
const sel2 = selecionarParaChamado(pessoas, 'Recife', finados, HOJE, new Set([1, 7]));
verificar('quem ja foi avisado deste periodo fica de fora', sel2.convocados.map((d) => d.id), [6]);
verificar('... e aparece como poupado no resumo', sel2.resumo.poupadosPorAvisoRecente, 2);
verificar('sem cidade do hospital: ninguem', selecionarParaChamado(pessoas, '', finados, HOJE).convocados.length, 0);

console.log('--- Quando o hospital pode abrir a chamada ---');
verificar('faltam 5 dias: pode', podeChamar(aparecida).ok, true);
verificar('faltam 26 dias: cedo demais', podeChamar(finados).ok, false);
verificar('faltam 21 dias: pode', podeChamar({ ...finados, diasParaInicio: 21 }).ok, true);
verificar('ja comecou: nao pode', podeChamar(emAndamento[0]).ok, false);
verificar('risco baixo: nao pode', podeChamar({ ...aparecida, risco: 'baixo' }).ok, false);
verificar('periodo inexistente: nao pode', podeChamar(undefined).ok, false);

console.log('--- Mensagens ---');
verificar('chamada enviada (plural)', descreverChamado({ convocados: 3, aptos: 3 }, aparecida), '📅 Chamada enviada para 3 doadores que podem doar antes de Nossa Senhora Aparecida.');
verificar('chamada enviada (singular)', descreverChamado({ convocados: 1, aptos: 1 }, aparecida), '📅 Chamada enviada para 1 doador que pode doar antes de Nossa Senhora Aparecida.');
verificar('todos ja avisados', /já receberam/.test(descreverChamado({ convocados: 0, aptos: 2 }, aparecida)), true);
verificar('ninguem apto', /Nenhum doador/.test(descreverChamado({ convocados: 0, aptos: 0 }, aparecida)), true);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
