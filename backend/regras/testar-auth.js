// Testes das regras de autenticacao e de necessidades. Rode: node regras/testar-auth.js
const A = require('./auth');
const N = require('./necessidade');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}
const temErro = (r) => typeof r.erro === 'string';

console.log('--- E-mail ---');
verificar('normaliza: espacos e maiusculas', A.normalizarEmail('  Ana@Exemplo.COM '), 'ana@exemplo.com');
verificar('nao e texto: vazio', A.normalizarEmail(undefined), '');
verificar('e-mail valido', A.emailValido('ana@exemplo.com'), true);
verificar('sem arroba', A.emailValido('anaexemplo.com'), false);
verificar('sem dominio', A.emailValido('ana@'), false);
verificar('sem ponto no dominio', A.emailValido('ana@exemplo'), false);
verificar('com espaco', A.emailValido('a na@exemplo.com'), false);
verificar('longo demais (121)', A.emailValido('a'.repeat(110) + '@exemplo.com'), false);

console.log('--- Senha ---');
verificar('senha boa', A.validarSenha('uma-senha-boa-123'), { ok: true });
verificar('curta (7)', temErro(A.validarSenha('abc1234')), true);
verificar('vazia', temErro(A.validarSenha('')), true);
verificar('nao e texto', temErro(A.validarSenha(12345678)), true);
verificar('exatamente 8 vale', A.validarSenha('x7!Ab9#k'), { ok: true });
verificar('comum: 12345678', temErro(A.validarSenha('12345678')), true);
verificar('comum em maiuscula: PASSWORD', temErro(A.validarSenha('PASSWORD')), true);
verificar('comum: senha123', temErro(A.validarSenha('Senha123')), true);
verificar('repetida: aaaaaaaa', temErro(A.validarSenha('aaaaaaaa')), true);
verificar('igual ao e-mail', temErro(A.validarSenha('ana@exemplo.com', { email: 'Ana@Exemplo.com' })), true);
verificar('igual a parte antes do @', temErro(A.validarSenha('analuiza1', { email: 'analuiza1@x.com' })), true);
verificar('igual ao nome', temErro(A.validarSenha('maria silva', { nome: 'Maria Silva' })), true);
verificar('72 bytes vale', A.validarSenha('a1'.repeat(36)), { ok: true });
verificar('73 bytes: recusa (o bcrypt cortaria em silencio)', temErro(A.validarSenha('a1'.repeat(36) + 'z')), true);
verificar('72 letras com acento passam de 72 bytes', temErro(A.validarSenha('é'.repeat(40))), true);

console.log('--- Cadastro ---');
const ok = { nome: '  Ana   Lima ', email: ' ANA@Exemplo.com ', senha: 'uma-senha-boa-123', tipo: 'doador', codigoIndicacao: 'ABC' };
verificar('cadastro limpo: nome sem espacos sobrando e e-mail em minusculas', (({ nome, email, tipo, codigoIndicacao }) => ({ nome, email, tipo, codigoIndicacao }))(A.validarCadastro(ok).dados),
    { nome: 'Ana Lima', email: 'ana@exemplo.com', tipo: 'doador', codigoIndicacao: 'ABC' });
verificar('hospital pode se cadastrar', A.validarCadastro({ ...ok, tipo: 'hospital' }).dados.tipo, 'hospital');
verificar('admin NUNCA pelo site', temErro(A.validarCadastro({ ...ok, tipo: 'admin' })), true);
verificar('tipo inventado', temErro(A.validarCadastro({ ...ok, tipo: 'root' })), true);
verificar('sem nome', temErro(A.validarCadastro({ ...ok, nome: '   ' })), true);
verificar('nome de 1 letra', temErro(A.validarCadastro({ ...ok, nome: 'A' })), true);
verificar('nome com tag HTML', temErro(A.validarCadastro({ ...ok, nome: '<script>alert(1)</script>' })), true);
verificar('nome com caractere de controle', temErro(A.validarCadastro({ ...ok, nome: 'Ana\u0007Lima' })), true);
verificar('nome com 121 caracteres', temErro(A.validarCadastro({ ...ok, nome: 'a'.repeat(121) })), true);
verificar('e-mail invalido', temErro(A.validarCadastro({ ...ok, email: 'sem-arroba' })), true);
verificar('senha igual ao nome e recusada no cadastro', temErro(A.validarCadastro({ ...ok, senha: 'ana lima' })), true);
verificar('corpo vazio', temErro(A.validarCadastro(undefined)), true);
verificar('admin nao passa nem com o resto certo', A.validarCadastro({ ...ok, tipo: 'admin' }).dados, undefined);

console.log('--- Vida do token e renovacao automatica ---');
verificar('sessao normal: 1 dia', A.vidaDoToken(false), { expiresIn: '1d', segundos: 86400 });
verificar('manter conectado: 7 dias', A.vidaDoToken(true), { expiresIn: '7d', segundos: 604800 });
verificar('so "true" de verdade vale (texto "true" nao)', A.vidaDoToken('true').expiresIn, '1d');
const T0 = 1_800_000_000; // segundos
verificar('token novo (0% da vida): nao renova', A.deveRenovar({ iat: T0, exp: T0 + 86400 }, T0 * 1000), false);
verificar('40% da vida passada: nao renova', A.deveRenovar({ iat: T0, exp: T0 + 86400 }, (T0 + 34560) * 1000), false);
verificar('60% da vida passada: renova', A.deveRenovar({ iat: T0, exp: T0 + 86400 }, (T0 + 51840) * 1000), true);
verificar('exatamente na metade: ainda nao', A.deveRenovar({ iat: T0, exp: T0 + 86400 }, (T0 + 43200) * 1000), false);
verificar('ja expirou: nao renova (tem que entrar de novo)', A.deveRenovar({ iat: T0, exp: T0 + 86400 }, (T0 + 90000) * 1000), false);
verificar('token de 7 dias, no dia 5: renova', A.deveRenovar({ iat: T0, exp: T0 + 604800 }, (T0 + 5 * 86400) * 1000), true);
verificar('payload sem datas: nao renova', A.deveRenovar({}, T0 * 1000), false);
verificar('sem payload: nao renova', A.deveRenovar(undefined, T0 * 1000), false);

console.log('--- Limite de tentativas ---');
const MIN = 60 * 1000;
const limite = A.criarLimite({ maximo: 3, janelaMs: 15 * MIN });
const t = 1_000_000;
verificar('comeca livre', limite.bloqueio('ana', t), { bloqueado: false, segundos: 0 });
limite.falha('ana', t); limite.falha('ana', t + 1000);
verificar('2 falhas de 3: ainda livre', limite.bloqueio('ana', t + 2000).bloqueado, false);
limite.falha('ana', t + 3000);
const b = limite.bloqueio('ana', t + 3000);
verificar('3 falhas: bloqueada pelo resto da janela (15 min)', [b.bloqueado, b.segundos], [true, 897]);
verificar('outra chave nao e afetada', limite.bloqueio('bia', t + 3000).bloqueado, false);
verificar('depois da janela volta a ficar livre', limite.bloqueio('ana', t + 15 * MIN + 1).bloqueado, false);
limite.falha('caio', t); limite.falha('caio', t); limite.limpar('caio'); limite.falha('caio', t);
verificar('acertar a senha zera a contagem', limite.bloqueio('caio', t).bloqueado, false);
const l2 = A.criarLimite({ maximo: 2, janelaMs: 10 * MIN });
l2.falha('x', 0); l2.falha('x', 9 * MIN);
verificar('falhas contam a partir da primeira da janela', l2.bloqueio('x', 9 * MIN).bloqueado, true);
l2.falha('y', 0);
l2.falha('y', 11 * MIN);
verificar('falha depois da janela comeca contagem nova', l2.bloqueio('y', 11 * MIN).bloqueado, false);
const l3 = A.criarLimite({ maximo: 5, janelaMs: MIN });
for (let i = 0; i < 1200; i++) l3.falha('k' + i, 0);
l3.falha('novo', 10 * MIN);
verificar('a memoria nao cresce sem fim (entradas velhas saem)', l3.tamanho() < 1200, true);
verificar('mensagem em minutos', A.mensagemDeEspera(600), 'Muitas tentativas. Tente de novo em 10 minutos.');
verificar('mensagem curta', A.mensagemDeEspera(20), 'Muitas tentativas. Tente de novo em alguns instantes.');

console.log('--- Necessidade de sangue ---');
verificar('publicar valida', N.validarNecessidade({ tipoSanguineo: 'O-', urgencia: 'critico' }).necessidade, { tipoSanguineo: 'O-', tipoDoacao: 'sangue', urgencia: 'critico' });
verificar('urgencia padrao e estavel', N.validarNecessidade({ tipoSanguineo: 'A+' }).necessidade.urgencia, 'estavel');
verificar('"normal" (valor antigo da API) vale como estavel', N.validarNecessidade({ tipoSanguineo: 'O+', urgencia: 'normal' }).necessidade.urgencia, 'estavel');
verificar('"normal" tambem vale ao atualizar', N.validarAtualizacao({ urgencia: 'normal' }).mudancas, { urgencia: 'estavel' });
verificar('tipo inventado', temErro(N.validarNecessidade({ tipoSanguineo: 'Z+' })), true);
verificar('sem tipo', temErro(N.validarNecessidade({})), true);
verificar('Rh nulo tem rede propria: nao e pedido comum', temErro(N.validarNecessidade({ tipoSanguineo: 'Rh nulo (sangue dourado)' })), true);
verificar('urgencia inventada', temErro(N.validarNecessidade({ tipoSanguineo: 'O+', urgencia: 'urgentissimo' })), true);
verificar('tipo de doacao inventado', temErro(N.validarNecessidade({ tipoSanguineo: 'O+', tipoDoacao: 'orgao' })), true);
verificar('plaquetas vale', N.validarNecessidade({ tipoSanguineo: 'O+', tipoDoacao: 'plaquetas' }).necessidade.tipoDoacao, 'plaquetas');
verificar('atualizar: encerrar como atendida', N.validarAtualizacao({ status: 'atendida' }).mudancas, { status: 'atendida' });
verificar('atualizar: so a urgencia', N.validarAtualizacao({ urgencia: 'emergencia' }).mudancas, { urgencia: 'emergencia' });
verificar('atualizar: status inventado', temErro(N.validarAtualizacao({ status: 'sumiu' })), true);
verificar('atualizar: nada para mudar', temErro(N.validarAtualizacao({})), true);
verificar('atualizar: o tipo sanguineo nao muda', Object.keys(N.validarAtualizacao({ status: 'aberta', tipoSanguineo: 'A+' }).mudancas), ['status']);
verificar('mudar urgencia de aberta: pode', N.podeMudar({ status: 'aberta' }, { urgencia: 'critico' }).ok, true);
verificar('mudar urgencia de atendida: nao pode', N.podeMudar({ status: 'atendida' }, { urgencia: 'critico' }).ok, false);
verificar('reabrir e mudar urgencia juntos: pode', N.podeMudar({ status: 'cancelada' }, { status: 'aberta', urgencia: 'critico' }).ok, true);
verificar('so fechar: pode', N.podeMudar({ status: 'aberta' }, { status: 'atendida' }).ok, true);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
