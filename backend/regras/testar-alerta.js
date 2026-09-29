// Teste rapido da regra do alerta de emergencia inteligente (com data fixa de 'hoje').
const { selecionarDoadoresParaAlerta, descreverAlerta, normalizarCidade } = require('./alerta');

const HOJE = '2026-09-29';

function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    console.log((ok ? '✅' : '❌') + ' ' + descricao + '  ->  ' + JSON.stringify(obtido));
}

// Base: todos compativeis (O-), identificados, aptos e em Recife. Cada teste muda UMA coisa.
function doador(id, mudancas) {
    return Object.assign({
        id, nome: 'Doador ' + id, email: 'd' + id + '@x.com', tipo_sanguineo: 'O-', sexo: 'M',
        cidade: 'Recife', visibilidade: 'identificado', ultima_doacao: null, ultimo_alerta: null
    }, mudancas);
}

const doadores = [
    doador(1),                                               // convocado
    doador(2, { tipo_sanguineo: 'A+' }),                     // tipo incompativel
    doador(3, { visibilidade: 'anonimo' }),                  // anonimo (LGPD)
    doador(4, { email: null }),                              // sem email
    doador(5, { ultima_doacao: '2026-09-01' }),              // homem, doou ha 28 dias: nao apto
    doador(6, { sexo: 'F', ultima_doacao: '2026-07-15' }),   // mulher, 76 dias: nao apta (precisa 90)
    doador(7, { sexo: 'F', ultima_doacao: '2026-06-01' }),   // mulher, 120 dias: apta -> convocada
    doador(8, { cidade: 'São Paulo' }),                      // outra cidade
    doador(9, { cidade: '  recife ' }),                      // mesma cidade escrita diferente -> convocado
    doador(10, { ultimo_alerta: '2026-09-28' }),             // alertado ontem: poupado
    doador(11, { ultimo_alerta: '2026-09-26' })              // alertado ha 3 dias: convocado
];

console.log('--- Testes do alerta inteligente ---');

const r = selecionarDoadoresParaAlerta(doadores, { tiposCompativeis: ['O-'], cidadeHospital: 'Recife', hoje: HOJE });
verificar('Convoca so quem e compativel, identificado, apto, da cidade e sem alerta recente',
    r.convocados.map((d) => d.id), [1, 7, 9, 11]);
verificar('Resumo das etapas', r.resumo,
    { compativeis: 8, aptos: 6, naCidade: 5, convocados: 4, poupadosPorAlertaRecente: 1 });

verificar('Cidade: acentos, maiusculas e espacos nao importam',
    normalizarCidade('  SÃO   Paulo ') === normalizarCidade('sao paulo'), true);
verificar('Hospital sem cidade: ninguem e convocado',
    selecionarDoadoresParaAlerta(doadores, { tiposCompativeis: ['O-'], cidadeHospital: '', hoje: HOJE }).convocados.length, 0);
verificar('Nenhum tipo compativel: ninguem e convocado',
    selecionarDoadoresParaAlerta(doadores, { tiposCompativeis: [], cidadeHospital: 'Recife', hoje: HOJE }).convocados.length, 0);
verificar('Data do banco (Date a meia-noite local) ontem: poupado',
    selecionarDoadoresParaAlerta([doador(20, { ultimo_alerta: new Date(2026, 8, 28) })],
        { tiposCompativeis: ['O-'], cidadeHospital: 'Recife', hoje: HOJE }).convocados.length, 0);
verificar('Data do banco ha 3 dias: convocado',
    selecionarDoadoresParaAlerta([doador(21, { ultimo_alerta: new Date(2026, 8, 26) })],
        { tiposCompativeis: ['O-'], cidadeHospital: 'Recife', hoje: HOJE }).convocados.length, 1);
verificar('Lista vazia nao quebra',
    selecionarDoadoresParaAlerta([], { tiposCompativeis: ['O-'], cidadeHospital: 'Recife', hoje: HOJE }).resumo.convocados, 0);

verificar('Mensagem com convocados', descreverAlerta({ convocados: 4, naCidade: 5 }, 'Recife'),
    '🚨 Alerta enviado para 4 doadores compatíveis e aptos em Recife.');
verificar('Mensagem com 1 convocado', descreverAlerta({ convocados: 1, naCidade: 1 }, 'Recife').includes('1 doador compatível'), true);
verificar('Mensagem quando todos ja foram alertados', descreverAlerta({ convocados: 0, naCidade: 2 }, 'Recife').includes('já receberam'), true);
verificar('Mensagem quando nao ha ninguem', descreverAlerta({ convocados: 0, naCidade: 0 }, 'Recife').includes('Nenhum doador'), true);
