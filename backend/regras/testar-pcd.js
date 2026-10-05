// Testes das regras da Ficha PcD. Rode: node regras/testar-pcd.js
const {
    TIPOS, APOIOS, CAUSAS, MEDICAMENTOS, DECISOES, validarPcd, avaliarFicha, guia, listaDoBanco
} = require('./pcd');
const { descreverVisaoDoHospital } = require('./perfil');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const nivel = (corpo) => { const r = avaliarFicha(corpo); return r.erro ? 'erro: ' + r.erro : r.resultado.nivel; };
const itens = (corpo) => avaliarFicha(corpo).resultado.avaliacao;

console.log('--- Declaracao no perfil ---');
verificar('declarar com tipo e consentimento', validarPcd({ declarado: true, tipos: ['fisica'], apoios: ['libras'], consentimento: true }).pcd,
    { declarado: true, tipos: ['fisica'], apoios: ['libras'] });
verificar('sem consentimento: recusa', typeof validarPcd({ declarado: true, tipos: ['fisica'] }).erro, 'string');
verificar('sem nenhum tipo: recusa', typeof validarPcd({ declarado: true, tipos: [], consentimento: true }).erro, 'string');
verificar('tipo fora da lista: recusa', typeof validarPcd({ declarado: true, tipos: ['x'], consentimento: true }).erro, 'string');
verificar('apoio fora da lista: recusa', typeof validarPcd({ declarado: true, tipos: ['fisica'], apoios: ['y'], consentimento: true }).erro, 'string');
verificar('tipos que nao sao lista: recusa', typeof validarPcd({ declarado: true, tipos: 'fisica', consentimento: true }).erro, 'string');
verificar('repetidos sao unidos', validarPcd({ declarado: true, tipos: ['visual', 'visual'], consentimento: true }).pcd.tipos, ['visual']);
verificar('deixar de declarar limpa tudo', validarPcd({ declarado: false, tipos: ['fisica'] }).pcd, { declarado: false, tipos: [], apoios: [] });
verificar('corpo vazio: nao declarado', validarPcd().pcd.declarado, false);
verificar('apoios sao opcionais', validarPcd({ declarado: true, tipos: ['tea'], consentimento: true }).pcd.apoios, []);

console.log('--- Resultado geral (verde, amarelo, vermelho) ---');
verificar('so deficiencia de nascenca: verde', nivel({ causas: ['nascenca'] }), 'verde');
verificar('ficha vazia (nenhuma causa marcada): verde', nivel({}), 'verde');
verificar('paralisia cerebral: amarelo (caso a caso)', nivel({ causas: ['paralisia-cerebral'] }), 'amarelo');
verificar('AVC: vermelho', nivel({ causas: ['avc'] }), 'vermelho');
verificar('doenca neurologica da lista: vermelho', nivel({ causas: ['neuro-lista'] }), 'vermelho');
verificar('autoimune em mais de um orgao: vermelho', nivel({ causas: ['autoimune'] }), 'vermelho');
verificar('vermelho tem prioridade sobre amarelo', nivel({ causas: ['paralisia-cerebral', 'avc'] }), 'vermelho');
verificar('causa fora da lista: amarelo', nivel({ causas: ['outra'] }), 'amarelo');
verificar('sequela de infeccao: amarelo', nivel({ causas: ['infecciosa'] }), 'amarelo');
verificar('condicao psiquiatrica sozinha nao impede', nivel({ causas: ['psiquiatrica'] }), 'verde');

console.log('--- Epilepsia ---');
verificar('epilepsia sem dizer a situacao: pede a informacao', nivel({ causas: ['epilepsia'] }).startsWith('erro'), true);
verificar('em tratamento: vermelho', nivel({ causas: ['epilepsia'], epilepsiaSituacao: 'em-tratamento' }), 'vermelho');
verificar('parou ha menos de 3 anos: amarelo', nivel({ causas: ['epilepsia'], epilepsiaSituacao: 'menos-3-anos' }), 'amarelo');
verificar('3 anos ou mais sem crise: amarelo (confirmar com laudo)', nivel({ causas: ['epilepsia'], epilepsiaSituacao: 'tres-anos-ou-mais' }), 'amarelo');
verificar('situacao invalida: recusa', nivel({ causas: ['epilepsia'], epilepsiaSituacao: 'x' }).startsWith('erro'), true);
verificar('texto de "em tratamento" avisa para nunca parar o remedio sozinho',
    /Nunca pare/.test(itens({ causas: ['epilepsia'], epilepsiaSituacao: 'em-tratamento' })[0].texto), true);

console.log('--- Lesao, trauma e amputacao ---');
verificar('trauma sem informar o tempo: amarelo', nivel({ causas: ['lesao-trauma'] }), 'amarelo');
verificar('trauma ha 8 meses: ainda amarelo (politrauma pede 12)', nivel({ causas: ['lesao-trauma'], mesesDesdeProcedimento: 8 }), 'amarelo');
verificar('trauma ha 12 meses ou mais: verde', nivel({ causas: ['lesao-trauma'], mesesDesdeProcedimento: 12 }), 'verde');
verificar('amputacao ha 3 meses: amarelo', nivel({ causas: ['amputacao'], mesesDesdeProcedimento: 3 }), 'amarelo');
verificar('amputacao ha 6 meses: verde', nivel({ causas: ['amputacao'], mesesDesdeProcedimento: 6 }), 'verde');
verificar('tempo negativo: recusa', nivel({ causas: ['amputacao'], mesesDesdeProcedimento: -1 }).startsWith('erro'), true);

console.log('--- Medicamentos ---');
verificar('anticonvulsivante para convulsao: vermelho', nivel({ medicamentos: ['anticonvulsivante-convulsao'] }), 'vermelho');
verificar('anticonvulsivante para outra coisa: verde', nivel({ medicamentos: ['anticonvulsivante-outro'] }), 'verde');
verificar('antidepressivo: verde (medico avalia)', nivel({ medicamentos: ['antidepressivo'] }), 'verde');
verificar('ansiolitico: verde', nivel({ medicamentos: ['ansiolitico'] }), 'verde');
verificar('antipsicotico: amarelo', nivel({ medicamentos: ['antipsicotico'] }), 'amarelo');
verificar('anticoagulante: amarelo', nivel({ medicamentos: ['anticoagulante'] }), 'amarelo');
verificar('imunossupressor: amarelo', nivel({ medicamentos: ['imunossupressor'] }), 'amarelo');
verificar('corticoide: amarelo', nivel({ medicamentos: ['corticoide'] }), 'amarelo');
verificar('remedio fora da lista: recusa', nivel({ medicamentos: ['x'] }).startsWith('erro'), true);
verificar('texto do antipsicotico avisa para nunca parar sozinho', /Nunca pare/.test(itens({ medicamentos: ['antipsicotico'] })[0].texto), true);

console.log('--- Capacidade de decidir ---');
verificar('decide sozinho: verde', nivel({ decisao: 'sozinho' }), 'verde');
verificar('sem responder: assume que decide sozinho', nivel({}), 'verde');
verificar('decide com apoio: amarelo (a equipe confere)', nivel({ decisao: 'com-apoio' }), 'amarelo');
verificar('outra pessoa decide e nao compreende: vermelho', nivel({ decisao: 'por-responsavel' }), 'vermelho');
verificar('valor invalido: recusa', nivel({ decisao: 'x' }).startsWith('erro'), true);
verificar('o texto lembra que deficiencia nao tira a capacidade', /13\.146/.test(itens({ decisao: 'por-responsavel' })[0].texto), true);

console.log('--- Idade e peso ---');
verificar('30 anos e 70 kg: verde', nivel({ idade: 30, pesoKg: 70 }), 'verde');
verificar('15 anos: amarelo', nivel({ idade: 15 }), 'amarelo');
verificar('17 anos: verde, mas pede autorizacao do responsavel', itens({ idade: 17 })[0].nivel, 'ok');
verificar('17 anos: autorizacao entra na lista do que levar', avaliarFicha({ idade: 17 }).resultado.levar.some((t) => /responsável legal/.test(t)), true);
verificar('18 anos: nao pede autorizacao', avaliarFicha({ idade: 18 }).resultado.levar.some((t) => /responsável legal/.test(t)), false);
verificar('65 anos: amarelo (limite da primeira doacao)', nivel({ idade: 65 }), 'amarelo');
verificar('72 anos: amarelo (so doador de repeticao)', nivel({ idade: 72 }), 'amarelo');
verificar('49 kg: amarelo', nivel({ pesoKg: 49 }), 'amarelo');
verificar('50 kg: verde', nivel({ pesoKg: 50 }), 'verde');
verificar('idade absurda: recusa', nivel({ idade: 200 }).startsWith('erro'), true);
verificar('peso com virgula/texto: recusa', nivel({ pesoKg: 'abc' }).startsWith('erro'), true);

console.log('--- O que levar e apoios ---');
const comTudo = avaliarFicha({ causas: ['paralisia-cerebral'], medicamentos: ['antipsicotico'], decisao: 'com-apoio', apoios: ['libras', 'mobilidade'] }).resultado;
verificar('sempre pede documento com foto', comTudo.levar[0], 'Documento oficial com foto.');
verificar('causa medica: pede relatorio do medico', comTudo.levar.some((t) => /Relatório/.test(t)), true);
verificar('remedio: pede a lista de remedios', comTudo.levar.some((t) => /remédios/.test(t)), true);
verificar('decide com apoio: sugere levar alguem de confianca', comTudo.levar.some((t) => /pessoa de confiança/.test(t)), true);
verificar('apoios escolhidos viram orientacoes', comTudo.apoios.length, 2);
verificar('so nascenca: nao pede relatorio', avaliarFicha({ causas: ['nascenca'] }).resultado.levar.some((t) => /Relatório/.test(t)), false);
verificar('apoio invalido: recusa', nivel({ apoios: ['z'] }).startsWith('erro'), true);

console.log('--- Honestidade do resultado ---');
const r = avaliarFicha({ causas: ['nascenca'] }).resultado;
verificar('traz aviso de que a decisao e da equipe', /equipe de triagem/.test(r.aviso), true);
verificar('traz a norma consultada', /11\.685/.test(r.fonte.norma), true);
verificar('traz a nota sobre variacao entre hemocentros', /Hemominas/.test(r.notaPratica), true);
verificar('verde nunca promete que pode doar', /pode doar!/.test(r.titulo), false);
verificar('direito de saber o motivo (art. 69) esta no resultado', r.depois.some((t) => /art\. 69/.test(t)), true);
verificar('cada item de avaliacao tem texto e nivel', itens({ causas: ['avc', 'nascenca'], medicamentos: ['antipsicotico'] }).every((i) => i.texto && ['ok', 'amarelo', 'vermelho'].includes(i.nivel)), true);

console.log('--- Guia e listas ---');
verificar('7 tipos de deficiencia', TIPOS.length, 7);
verificar('6 apoios', APOIOS.length, 6);
verificar('11 causas', CAUSAS.length, 11);
verificar('10 medicamentos', MEDICAMENTOS.length, 10);
verificar('3 formas de decidir', DECISOES.length, 3);
verificar('o guia traz as listas das perguntas', Object.keys(guia()).sort(),
    ['apoios', 'aviso', 'causas', 'decisoes', 'fonte', 'medicamentos', 'notaPratica', 'situacoesEpilepsia', 'tipos']);
verificar('lista do banco ignora valores desconhecidos', listaDoBanco('fisica,x,visual', TIPOS.map((t) => t.valor)), ['fisica', 'visual']);
verificar('lista do banco vazia', listaDoBanco(null, ['fisica']), []);

console.log('--- Privacidade: o hospital nao ve a condicao ---');
const visao = descreverVisaoDoHospital({ id: 1, nome: 'Ana', nome_social: null, tipo_sanguineo: 'O+', cidade: 'Recife', visibilidade: 'identificado', telefone: '(81) 99999-9999' });
verificar('"Condição de PcD" consta como nunca visto', visao.naoVe.includes('Condição de PcD'), true);
verificar('o que o hospital ve nao menciona deficiencia', JSON.stringify(visao.ve).toLowerCase().includes('pcd'), false);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
