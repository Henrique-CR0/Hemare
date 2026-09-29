// Testes das regras do apadrinhamento. Rode: node regras/testar-apadrinhamento.js
const {
    sugerirMeta, validarCaso, podeApadrinhar, situacaoMeta, podeChamarAgora,
    selecionarPadrinhosParaChamada, descreverChamada, MAX_AFILHADOS
} = require('./apadrinhamento');
const { calcularConquistas } = require('./gamificacao');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const valido = { autorizacao: true, apelido: 'Paciente Aurora', tipoSanguineo: 'O-', condicao: 'Talassemia', frequenciaDias: 30 };

console.log('--- Cadastro do caso ---');
verificar('caso valido: aceita e sugere meta', validarCaso(valido).caso, {
    apelido: 'Paciente Aurora', tipoSanguineo: 'O-', condicao: 'Talassemia', frequenciaDias: 30, metaPadrinhos: 6
});
verificar('sem autorizacao: recusa', typeof validarCaso({ ...valido, autorizacao: false }).erro, 'string');
verificar('autorizacao em texto ("true") nao vale', typeof validarCaso({ ...valido, autorizacao: 'true' }).erro, 'string');
verificar('apelido curto demais', typeof validarCaso({ ...valido, apelido: 'A' }).erro, 'string');
verificar('apelido longo demais', typeof validarCaso({ ...valido, apelido: 'x'.repeat(31) }).erro, 'string');
verificar('apelido com CPF/telefone: recusa', typeof validarCaso({ ...valido, apelido: 'Ana 12345678901' }).erro, 'string');
verificar('apelido com poucos numeros: aceita', validarCaso({ ...valido, apelido: 'Paciente 12' }).caso.apelido, 'Paciente 12');
verificar('apelido com simbolos/HTML: recusa', typeof validarCaso({ ...valido, apelido: '<b>Ana</b>' }).erro, 'string');
verificar('apelido com acento: aceita', validarCaso({ ...valido, apelido: 'João Pedro' }).caso.apelido, 'João Pedro');
verificar('espacos extras sao limpos', validarCaso({ ...valido, apelido: '  Paciente   Aurora ' }).caso.apelido, 'Paciente Aurora');
verificar('tipo sanguineo invalido', typeof validarCaso({ ...valido, tipoSanguineo: 'Z+' }).erro, 'string');
verificar('sem condicao: "Não informada"', validarCaso({ ...valido, condicao: undefined }).caso.condicao, 'Não informada');
verificar('condicao fora da lista (texto livre): recusa', typeof validarCaso({ ...valido, condicao: 'Leucemia do Joãozinho' }).erro, 'string');
verificar('frequencia abaixo do minimo', typeof validarCaso({ ...valido, frequenciaDias: 7 }).erro, 'string');
verificar('frequencia acima do maximo', typeof validarCaso({ ...valido, frequenciaDias: 200 }).erro, 'string');
verificar('frequencia nao inteira', typeof validarCaso({ ...valido, frequenciaDias: 30.5 }).erro, 'string');
verificar('meta informada pelo hospital vale', validarCaso({ ...valido, metaPadrinhos: 10 }).caso.metaPadrinhos, 10);
verificar('meta acima do maximo: recusa', typeof validarCaso({ ...valido, metaPadrinhos: 99 }).erro, 'string');
verificar('corpo vazio nao quebra', typeof validarCaso(undefined).erro, 'string');

console.log('--- Meta sugerida ---');
verificar('transfusao a cada 30 dias: 6 padrinhos', sugerirMeta(30), 6);
verificar('a cada 14 dias: 14 padrinhos', sugerirMeta(14), 14);
verificar('a cada 120 dias: minimo de 2', sugerirMeta(120), 2);

console.log('--- Quem pode apadrinhar ---');
const base = { tipoDoador: 'O-', tipoPaciente: 'A+', afilhadosAtuais: 0, jaEPadrinho: false, casoAtivo: true };
verificar('compativel e livre: pode', podeApadrinhar(base).pode, true);
verificar('tipo incompativel: nao pode', podeApadrinhar({ ...base, tipoDoador: 'B+' }).pode, false);
verificar('ja e padrinho: nao pode', podeApadrinhar({ ...base, jaEPadrinho: true }).pode, false);
verificar('caso encerrado: nao pode', podeApadrinhar({ ...base, casoAtivo: false }).pode, false);
verificar('limite de afilhados: nao pode', podeApadrinhar({ ...base, afilhadosAtuais: MAX_AFILHADOS }).pode, false);
verificar('um abaixo do limite: pode', podeApadrinhar({ ...base, afilhadosAtuais: MAX_AFILHADOS - 1 }).pode, true);
verificar('motivo explica a incompatibilidade', podeApadrinhar({ ...base, tipoDoador: 'B+' }).motivo.includes('B+'), true);

console.log('--- Meta de padrinhos ---');
verificar('3 de 6: 50%', situacaoMeta(3, 6), { padrinhos: 3, meta: 6, porcentagem: 50, completo: false });
verificar('passou da meta: 100% e completo', situacaoMeta(9, 6), { padrinhos: 9, meta: 6, porcentagem: 100, completo: true });
verificar('sem dados nao quebra', situacaoMeta(null, null), { padrinhos: 0, meta: 1, porcentagem: 0, completo: false });

console.log('--- Frequencia dos chamados do hospital ---');
verificar('nunca chamou: pode', podeChamarAgora(null, '2026-09-29').pode, true);
verificar('chamou ontem: espera 6 dias', podeChamarAgora('2026-09-28', '2026-09-29'), { pode: false, diasRestantes: 6 });
verificar('chamou ha 7 dias: pode', podeChamarAgora('2026-09-22', '2026-09-29').pode, true);
verificar('aceita Date vindo do banco', podeChamarAgora(new Date(2026, 8, 28), '2026-09-29').pode, false);

console.log('--- Quem recebe o chamado ---');
const HOJE = '2026-09-29';
const padrinhos = [
    { id: 1, nome: 'Apto', email: 'a@x.com', sexo: 'M', ultima_doacao: '2026-06-01', ultimo_alerta: null },
    { id: 2, nome: 'Doou semana passada', email: 'b@x.com', sexo: 'M', ultima_doacao: '2026-09-20', ultimo_alerta: null },
    { id: 3, nome: 'Sem email', email: null, sexo: 'F', ultima_doacao: null, ultimo_alerta: null },
    { id: 4, nome: 'Chamado ontem', email: 'd@x.com', sexo: 'F', ultima_doacao: null, ultimo_alerta: '2026-09-28' },
    { id: 5, nome: 'Nunca doou', email: 'e@x.com', sexo: 'F', ultima_doacao: null, ultimo_alerta: '2026-09-01' },
    { id: 6, nome: 'Sem sexo informado', email: 'f@x.com', sexo: null, ultima_doacao: null, ultimo_alerta: null }
];
const escolha = selecionarPadrinhosParaChamada(padrinhos, HOJE);
verificar('convoca so quem esta apto, com email e sem chamado recente', escolha.convocados.map((p) => p.id), [1, 5]);
verificar('resumo conta cada etapa', escolha.resumo, { padrinhos: 6, aptos: 3, convocados: 2, poupadosPorAlertaRecente: 1 });
verificar('lista vazia nao quebra', selecionarPadrinhosParaChamada([], HOJE).resumo.convocados, 0);
verificar('mensagem: chamou 2', descreverChamada(escolha.resumo).includes('2 padrinhos'), true);
verificar('mensagem: sem padrinhos', descreverChamada({ padrinhos: 0, aptos: 0, convocados: 0 }), 'Este paciente ainda não tem padrinhos.');
verificar('mensagem: todos no intervalo', descreverChamada({ padrinhos: 2, aptos: 0, convocados: 0 }).includes('intervalo'), true);

console.log('--- Emblema de padrinho ---');
function ganhos(dados) {
    return calcularConquistas(dados).emblemas.filter((e) => e.conquistado).map((e) => e.id);
}
verificar('sem afilhados: sem emblema', ganhos({ totalDoacoes: 0, afilhados: 0 }), []);
verificar('1 afilhado: emblema Padrinho', ganhos({ totalDoacoes: 0, afilhados: 1 }), ['padrinho']);
verificar('afilhados ausentes/invalidos nao quebram', ganhos({ totalDoacoes: 0, afilhados: 'x' }), []);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
