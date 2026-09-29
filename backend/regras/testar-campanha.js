// Testes das regras da campanha de reposicao. Rode: node regras/testar-campanha.js
const {
    somarDias, dataValida, validarCampanha, situacaoCampanha, validarPromessa, mensagemCompartilhar
} = require('./campanha');
const { calcularConquistas } = require('./gamificacao');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const HOJE = '2026-09-29';
const valida = { autorizacao: true, apelido: 'Seu Antônio', metaBolsas: 5 };

console.log('--- Datas ---');
verificar('soma dias', somarDias('2026-09-29', 15), '2026-10-14');
verificar('soma dias atravessando o ano', somarDias('2026-12-25', 10), '2027-01-04');
verificar('data valida', dataValida('2026-09-29'), true);
verificar('recusa 31 de fevereiro', dataValida('2026-02-31'), false);
verificar('recusa texto', dataValida('amanha'), false);
verificar('recusa formato brasileiro', dataValida('29/09/2026'), false);
verificar('recusa nao-texto', dataValida(20260929), false);

console.log('--- Cadastro da campanha ---');
verificar('valida: aceita e usa prazo padrao', validarCampanha(valida).campanha, { apelido: 'Seu Antônio', metaBolsas: 5, prazoDias: 15 });
verificar('sem autorizacao: recusa', typeof validarCampanha({ ...valida, autorizacao: false }).erro, 'string');
verificar('apelido com CPF: recusa', typeof validarCampanha({ ...valida, apelido: 'Antonio 12345678901' }).erro, 'string');
verificar('meta zero: recusa', typeof validarCampanha({ ...valida, metaBolsas: 0 }).erro, 'string');
verificar('meta acima do maximo: recusa', typeof validarCampanha({ ...valida, metaBolsas: 31 }).erro, 'string');
verificar('meta nao informada: recusa', typeof validarCampanha({ ...valida, metaBolsas: undefined }).erro, 'string');
verificar('prazo customizado', validarCampanha({ ...valida, prazoDias: 30 }).campanha.prazoDias, 30);
verificar('prazo acima do maximo: recusa', typeof validarCampanha({ ...valida, prazoDias: 90 }).erro, 'string');
verificar('corpo vazio nao quebra', typeof validarCampanha(undefined).erro, 'string');

console.log('--- Situacao da campanha ---');
const base = { metaBolsas: 5, confirmadas: 2, prometidas: 4, expiraEm: '2026-10-14', ativo: true };
verificar('aberta com progresso', situacaoCampanha(base, HOJE), {
    status: 'aberta', metaBolsas: 5, confirmadas: 2, prometidas: 4, faltam: 3, porcentagem: 40, diasRestantes: 15, aceitaPromessas: true
});
verificar('meta atingida', situacaoCampanha({ ...base, confirmadas: 5 }, HOJE).status, 'meta-atingida');
verificar('passou da meta: 100% e nada falta', [situacaoCampanha({ ...base, confirmadas: 8 }, HOJE).porcentagem, situacaoCampanha({ ...base, confirmadas: 8 }, HOJE).faltam], [100, 0]);
verificar('meta atingida ainda aceita promessas', situacaoCampanha({ ...base, confirmadas: 5 }, HOJE).aceitaPromessas, true);
verificar('ultimo dia ainda esta aberta', situacaoCampanha({ ...base, expiraEm: HOJE }, HOJE).status, 'aberta');
verificar('dia seguinte: expirada', situacaoCampanha({ ...base, expiraEm: '2026-09-28' }, HOJE).status, 'expirada');
verificar('expirada nao aceita promessas', situacaoCampanha({ ...base, expiraEm: '2026-09-28' }, HOJE).aceitaPromessas, false);
verificar('encerrada pelo hospital', situacaoCampanha({ ...base, ativo: false }, HOJE).status, 'encerrada');
verificar('aceita Date vindo do banco', situacaoCampanha({ ...base, expiraEm: new Date(2026, 9, 14) }, HOJE).diasRestantes, 15);

console.log('--- Promessa de doacao ---');
const aberta = situacaoCampanha(base, HOJE);
const apto = { ultima_doacao: null, sexo: 'F' };
function promessa(extra) {
    return validarPromessa({ data: '2026-10-05', hoje: HOJE, situacao: aberta, expiraEm: '2026-10-14', jaPrometeu: false, doador: apto, ...extra });
}
verificar('promessa valida', promessa({}).pode, true);
verificar('ja prometeu: recusa', promessa({ jaPrometeu: true }).pode, false);
verificar('data no passado: recusa', promessa({ data: '2026-09-28' }).pode, false);
verificar('hoje vale', promessa({ data: HOJE }).pode, true);
verificar('data invalida: recusa', promessa({ data: '2026-02-31' }).pode, false);
verificar('sem data: recusa', promessa({ data: undefined }).pode, false);
verificar('depois do fim da campanha: recusa', promessa({ data: '2026-10-20' }).pode, false);
verificar('mensagem diz ate quando', promessa({ data: '2026-10-20' }).erro.includes('14/10/2026'), true);
const longa = { ...aberta };
verificar('alem de 30 dias: recusa', validarPromessa({ data: '2026-11-15', hoje: HOJE, situacao: longa, expiraEm: '2026-12-31', jaPrometeu: false, doador: apto }).pode, false);
verificar('campanha expirada: recusa', promessa({ situacao: situacaoCampanha({ ...base, expiraEm: '2026-09-28' }, HOJE) }).pode, false);
verificar('doou ha 10 dias: ainda no intervalo', promessa({ doador: { ultima_doacao: '2026-09-19', sexo: 'F' } }).pode, false);
verificar('...e a mensagem diz quantos dias faltam', promessa({ doador: { ultima_doacao: '2026-09-19', sexo: 'F' } }).erro.includes('faltam'), true);
verificar('doou ha 10 dias mas promete para depois do intervalo (homem, 60 dias) nao cabe na campanha', promessa({ doador: { ultima_doacao: '2026-09-19', sexo: 'M' }, data: '2026-10-14' }).pode, false);
verificar('doou ha 86 dias: ainda nao (90 para mulheres)', promessa({ doador: { ultima_doacao: '2026-07-11', sexo: 'F' }, data: '2026-10-05' }).pode, false);
verificar('doou ha 92 dias na data da promessa: apta', promessa({ doador: { ultima_doacao: '2026-07-05', sexo: 'F' }, data: '2026-10-05' }).pode, true);
verificar('sem sexo no perfil: recusa com aviso', promessa({ doador: { ultima_doacao: null, sexo: null } }).erro.includes('sexo'), true);

console.log('--- Mensagem para compartilhar ---');
const msg = mensagemCompartilhar({ apelido: 'Seu Antônio', hospital: 'Hospital Um', cidade: 'Recife', faltam: 3, link: 'https://x/campanha/ABC' });
verificar('cita apelido, hospital, quanto falta e link', ['Seu Antônio', 'Hospital Um', 'Faltam 3 doações', 'https://x/campanha/ABC'].every((t) => msg.includes(t)), true);
verificar('singular quando falta 1', mensagemCompartilhar({ apelido: 'A', hospital: 'H', cidade: 'C', faltam: 1, link: 'l' }).includes('Faltam 1 doação.'), true);
verificar('meta atingida muda o texto', mensagemCompartilhar({ apelido: 'A', hospital: 'H', cidade: 'C', faltam: 0, link: 'l' }).includes('meta já foi atingida'), true);

console.log('--- Emblema solidario ---');
function ganhos(dados) {
    return calcularConquistas(dados).emblemas.filter((e) => e.conquistado).map((e) => e.id);
}
verificar('sem campanha: sem emblema', ganhos({ totalDoacoes: 0, doacoesEmCampanha: 0 }), []);
verificar('doou por uma campanha: Solidario', ganhos({ totalDoacoes: 0, doacoesEmCampanha: 1 }), ['solidario']);
verificar('valor invalido nao quebra', ganhos({ totalDoacoes: 0, doacoesEmCampanha: 'x' }), []);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
