// Teste de ponta a ponta de login, login automatico (sessao), recuperacao de senha, necessidades (CRUD) e noticias (PUT).
// Rode: node testes/e2e/auth.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3065);
const { BACKEND, URL, pool, emails, api, conta, checar, titulo, dormir } = amb;

async function main() {
    await amb.iniciar(['criar-noticias.js']);
    const jwt = require(require.resolve('jsonwebtoken', { paths: [BACKEND] }));
    const SENHA = 'senha-forte-123';
    const ms = async (fn) => { const t0 = Date.now(); const r = await fn(); return { r, ms: Date.now() - t0 }; };

    titulo('Servidor: erros em JSON, cabecalhos e saude');
    let r = await api('GET', '/saude');
    checar('GET /saude responde ok', r.status === 200 && r.dados.status === 'ok', r.dados);
    checar('Nao anuncia "X-Powered-By: Express"', r.cabecalhos.get('x-powered-by') === null);
    checar('Cabecalhos de seguranca (nosniff, sem iframe, sem referrer)', r.cabecalhos.get('x-content-type-options') === 'nosniff' && r.cabecalhos.get('x-frame-options') === 'DENY' && r.cabecalhos.get('referrer-policy') === 'no-referrer');
    r = await api('GET', '/rota/que/nao/existe');
    checar('Rota inexistente: 404 em JSON (nao a pagina HTML do Express)', r.status === 404 && /não encontrada/.test(r.dados.erro), r);
    const ruim = await fetch(URL + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{email: sem aspas' });
    checar('JSON mal formado: 400 em JSON', ruim.status === 400 && /JSON válido/.test((await ruim.json()).erro));
    const grande = await fetch(URL + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@x.com', senha: 'x'.repeat(300000) }) });
    checar('Corpo grande demais: 413 em JSON', grande.status === 413 && /grande demais/.test((await grande.json()).erro));

    titulo('Cadastro');
    const base = { nome: 'Ana Lima', email: 'Ana@Exemplo.com', senha: SENHA, tipo: 'doador' };
    r = await api('POST', '/auth/cadastro', null, { ...base, senha: '12345678' });
    checar('Senha comum: 400', r.status === 400 && /fácil demais/.test(r.dados.erro), r.dados);
    r = await api('POST', '/auth/cadastro', null, { ...base, senha: 'curta1' });
    checar('Senha curta: 400', r.status === 400, r.dados);
    r = await api('POST', '/auth/cadastro', null, { ...base, email: 'sem-arroba' });
    checar('E-mail invalido: 400', r.status === 400, r.dados);
    r = await api('POST', '/auth/cadastro', null, { ...base, tipo: 'admin' });
    checar('Ninguem se cadastra como admin: 400', r.status === 400, r.dados);
    r = await api('POST', '/auth/cadastro', null, { ...base, nome: '<script>alert(1)</script>' });
    checar('Nome com tag HTML: 400', r.status === 400, r.dados);
    r = await api('POST', '/auth/cadastro', null, { ...base, senha: 'ana@exemplo.com' });
    checar('Senha igual ao e-mail: 400', r.status === 400, r.dados);
    r = await api('POST', '/auth/cadastro', null, base);
    checar('Cadastro certo: 201 e e-mail guardado em minusculas', r.status === 201 && r.dados.usuario.email === 'ana@exemplo.com' && r.dados.usuario.nome === 'Ana Lima', r.dados);
    r = await api('POST', '/auth/cadastro', null, { ...base, email: 'ANA@exemplo.COM', nome: 'Outra Ana' });
    checar('Mesmo e-mail com outras maiusculas: 409 (e a mesma conta)', r.status === 409, r.dados);

    titulo('Login');
    r = await api('POST', '/auth/login', null, { email: 'ANA@exemplo.com', senha: SENHA });
    const tokenAna = r.dados && r.dados.token;
    checar('Entra digitando o e-mail com maiusculas', r.status === 200 && !!tokenAna && r.dados.usuario.email === 'ana@exemplo.com', r);
    const horas = (iso) => (new Date(iso).getTime() - Date.now()) / 3600000;
    checar('Sessao normal dura 1 dia (expiraEm)', horas(r.dados.expiraEm) > 23.9 && horas(r.dados.expiraEm) < 24.1, r.dados.expiraEm);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: SENHA, lembrar: true });
    checar('"Manter conectado" dura 7 dias', horas(r.dados.expiraEm) > 167.9 && horas(r.dados.expiraEm) < 168.1, r.dados.expiraEm);
    const tokenLembrar = r.dados.token;
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: SENHA, lembrar: 'true' });
    checar('"lembrar" como texto nao vale (so true de verdade)', horas(r.dados.expiraEm) < 24.1, r.dados.expiraEm);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com' });
    checar('Sem senha: 400', r.status === 400, r);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: 'errada-errada' });
    const msgSenhaErrada = r.dados.erro;
    checar('Senha errada: 401', r.status === 401, r);
    r = await api('POST', '/auth/login', null, { email: 'nao-existe@exemplo.com', senha: 'errada-errada' });
    checar('E-mail que nao existe: 401 com a MESMA mensagem (nao revela quem tem conta)', r.status === 401 && r.dados.erro === msgSenhaErrada, r.dados);
    const comConta = await ms(() => api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: 'errada-errada' }));
    const semConta = await ms(() => api('POST', '/auth/login', null, { email: 'fantasma@exemplo.com', senha: 'errada-errada' }));
    checar('E-mail inexistente gasta tempo de comparacao de senha (nao responde de imediato)', semConta.ms >= 20 && Math.abs(semConta.ms - comConta.ms) < Math.max(80, comConta.ms), { comConta: comConta.ms, semConta: semConta.ms });

    titulo('Limite de tentativas');
    await conta('Bia Rocha', 'bia@exemplo.com', 'doador');
    let ultimo;
    for (let i = 1; i <= 8; i++) ultimo = await api('POST', '/auth/login', null, { email: 'bia@exemplo.com', senha: 'errada-' + i });
    checar('8 senhas erradas seguidas ainda respondem 401', ultimo.status === 401, ultimo);
    r = await api('POST', '/auth/login', null, { email: 'bia@exemplo.com', senha: 'errada-9' });
    checar('A 9a tentativa e barrada: 429 com Retry-After', r.status === 429 && Number(r.cabecalhos.get('retry-after')) > 0 && /Muitas tentativas/.test(r.dados.erro), r);
    r = await api('POST', '/auth/login', null, { email: 'BIA@exemplo.com', senha: SENHA });
    checar('Travada: nem a senha certa entra (mesmo com outras maiusculas)', r.status === 429, r);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: SENHA });
    checar('A conta de outra pessoa nao e afetada', r.status === 200, r);

    titulo('Login automatico: conferir e renovar a sessao');
    r = await api('GET', '/auth/eu');
    checar('Sem token: 401', r.status === 401, r);
    r = await api('GET', '/auth/eu', 'token.invalido.aqui');
    checar('Token invalido: 401', r.status === 401, r);
    const expirado = jwt.sign({ id: 1, nome: 'Ana', tipo: 'doador', iat: Math.floor(Date.now() / 1000) - 7200 }, 'segredo-de-teste', { expiresIn: 60 });
    r = await api('GET', '/auth/eu', expirado);
    checar('Token expirado: 401', r.status === 401, r);
    const forjado = jwt.sign({ id: 1, nome: 'Ana', tipo: 'admin' }, 'outro-segredo', { expiresIn: '1d' });
    r = await api('GET', '/auth/eu', forjado);
    checar('Token assinado com outro segredo (tentativa de virar admin): 401', r.status === 401, r);
    r = await api('GET', '/auth/eu', tokenAna);
    checar('Sessao valida: devolve quem esta logado, sem pedir renovacao ainda', r.status === 200 && r.dados.usuario.email === 'ana@exemplo.com' && r.dados.renovar === false && !!r.dados.expiraEm, r.dados);
    checar('A resposta nao traz hash de senha', !/senha/i.test(JSON.stringify(r.dados)), r.dados);
    const velho = jwt.sign({ id: r.dados.usuario.id, nome: 'Ana Lima', tipo: 'doador', lembrar: false, iat: Math.floor(Date.now() / 1000) - 20 * 3600 }, 'segredo-de-teste', { expiresIn: '1d' });
    r = await api('GET', '/auth/eu', velho);
    checar('Token com mais da metade da vida gasta: o site e avisado para renovar', r.status === 200 && r.dados.renovar === true, r.dados);
    r = await api('POST', '/auth/renovar', velho);
    checar('Renovar devolve um token novo, com vida cheia (1 dia)', r.status === 200 && horas(r.dados.expiraEm) > 23.9 && r.dados.token !== velho, r.dados);
    const renovado = r.dados.token;
    r = await api('GET', '/auth/eu', renovado);
    checar('O token renovado funciona', r.status === 200, r);
    r = await api('POST', '/auth/renovar', tokenLembrar);
    checar('Renovar mantem o "manter conectado" (7 dias)', r.status === 200 && horas(r.dados.expiraEm) > 167.9, r.dados);
    r = await api('POST', '/auth/renovar');
    checar('Renovar sem token: 401', r.status === 401, r);

    titulo('Mudar o nome');
    r = await api('PATCH', '/auth/eu', tokenAna, { nome: 'A' });
    checar('Nome curto: 400', r.status === 400, r);
    r = await api('PATCH', '/auth/eu', tokenAna, { nome: '<b>x</b>' });
    checar('Nome com tag: 400', r.status === 400, r);
    r = await api('PATCH', '/auth/eu', tokenAna, { nome: '  Ana   Maria Lima ' });
    checar('Nome novo: 200, espacos arrumados e token novo com o nome certo', r.status === 200 && r.dados.usuario.nome === 'Ana Maria Lima' && jwt.decode(r.dados.token).nome === 'Ana Maria Lima', r.dados);

    titulo('Trocar a senha encerra as outras sessoes');
    const tokenCelular = (await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: SENHA })).dados.token;
    await dormir(1100); // o token do celular precisa ter sido emitido ANTES do segundo da troca
    r = await api('PUT', '/auth/senha', tokenAna, { senhaAtual: 'errada-errada', novaSenha: 'outra-senha-boa-9' });
    checar('Senha atual errada: 403', r.status === 403, r);
    r = await api('PUT', '/auth/senha', tokenAna, { senhaAtual: SENHA, novaSenha: '12345678' });
    checar('Senha nova fraca: 400', r.status === 400, r);
    r = await api('PUT', '/auth/senha', tokenAna, { senhaAtual: SENHA, novaSenha: SENHA });
    checar('Senha nova igual a atual: 400', r.status === 400, r);
    r = await api('PUT', '/auth/senha', tokenAna, { senhaAtual: SENHA });
    checar('Sem a senha nova: 400', r.status === 400, r);
    r = await api('PUT', '/auth/senha', tokenAna, { senhaAtual: SENHA, novaSenha: 'outra-senha-boa-9' });
    const tokenNovo = r.dados && r.dados.token;
    checar('Troca certa: 200 com token novo para esta sessao', r.status === 200 && !!tokenNovo, r);
    r = await api('GET', '/auth/eu', tokenCelular);
    checar('A sessao do "celular" (token antigo) foi encerrada: 401', r.status === 401 && /encerrada/.test(r.dados.erro), r);
    r = await api('GET', '/auth/eu', tokenNovo);
    checar('A sessao de quem trocou continua valendo com o token novo', r.status === 200, r);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: SENHA });
    checar('A senha antiga nao entra mais', r.status === 401, r);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: 'outra-senha-boa-9' });
    checar('A nova entra', r.status === 200, r);

    titulo('Sair de todos os aparelhos');
    const tokenA = (await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: 'outra-senha-boa-9' })).dados.token;
    await dormir(1100);
    r = await api('POST', '/auth/sair-de-todos');
    checar('Sem token: 401', r.status === 401, r);
    r = await api('POST', '/auth/sair-de-todos', tokenA);
    checar('Sair de todos: 200', r.status === 200, r);
    r = await api('GET', '/auth/eu', tokenA);
    checar('Inclusive esta sessao foi encerrada: 401', r.status === 401, r);
    r = await api('POST', '/auth/login', null, { email: 'ana@exemplo.com', senha: 'outra-senha-boa-9' });
    checar('Entrar de novo logo depois funciona', r.status === 200 && (await api('GET', '/auth/eu', r.dados.token)).status === 200, r);

    titulo('Recuperacao de senha');
    const codigoDoUltimoEmail = () => (emails[emails.length - 1].html.match(/>\s*(\d{6})\s*</) || [])[1];
    let antes = emails.length;
    r = await api('POST', '/recuperacao/pedir', null, { email: 'ninguem@exemplo.com' });
    checar('E-mail sem conta: mesma resposta e NENHUM e-mail enviado', r.status === 200 && /Se este email tiver conta/.test(r.dados.mensagem) && emails.length === antes, r.dados);
    r = await api('POST', '/recuperacao/pedir', null, {});
    checar('Sem e-mail: 400', r.status === 400, r);
    await conta('Caio Dias', 'caio@exemplo.com', 'doador');
    const tokenCaio = (await api('POST', '/auth/login', null, { email: 'caio@exemplo.com', senha: SENHA })).dados.token;
    await dormir(1100);
    r = await api('POST', '/recuperacao/pedir', null, { email: 'CAIO@Exemplo.com' });
    checar('Pedir com maiusculas funciona e manda 1 e-mail ao dono da conta', r.status === 200 && emails.length === antes + 1 && emails[antes].to === 'caio@exemplo.com', emails.slice(antes).map((e) => e.to));
    const codigo = codigoDoUltimoEmail();
    checar('O codigo tem 6 digitos', /^\d{6}$/.test(codigo), codigo);
    r = await api('POST', '/recuperacao/redefinir', null, { email: 'caio@exemplo.com', codigo: codigo === '111111' ? '222222' : '111111', novaSenha: 'caio-nova-senha-7' });
    checar('Codigo errado: 400', r.status === 400, r);
    r = await api('POST', '/recuperacao/redefinir', null, { email: 'caio@exemplo.com', codigo, novaSenha: '12345678' });
    checar('Senha nova fraca: 400 (e o codigo continua valendo)', r.status === 400, r);
    r = await api('POST', '/recuperacao/redefinir', null, { email: 'caio@exemplo.com', codigo, novaSenha: 'caio-nova-senha-7' });
    checar('Codigo certo e senha boa: 200', r.status === 200, r);
    r = await api('POST', '/recuperacao/redefinir', null, { email: 'caio@exemplo.com', codigo, novaSenha: 'caio-outra-senha-8' });
    checar('O mesmo codigo nao vale duas vezes: 400', r.status === 400, r);
    r = await api('GET', '/auth/eu', tokenCaio);
    checar('Quem tinha a senha velha logado e desconectado: 401', r.status === 401, r);
    r = await api('POST', '/auth/login', null, { email: 'caio@exemplo.com', senha: 'caio-nova-senha-7' });
    checar('Entra com a senha nova', r.status === 200, r);

    await conta('Dani Melo', 'dani@exemplo.com', 'doador');
    await api('POST', '/recuperacao/pedir', null, { email: 'dani@exemplo.com' });
    const codigoDani = codigoDoUltimoEmail();
    for (let i = 0; i < 5; i++) r = await api('POST', '/recuperacao/redefinir', null, { email: 'dani@exemplo.com', codigo: '00000' + i, novaSenha: 'dani-nova-senha-7' });
    checar('5 codigos errados ainda dizem 400', r.status === 400, r);
    r = await api('POST', '/recuperacao/redefinir', null, { email: 'dani@exemplo.com', codigo: codigoDani, novaSenha: 'dani-nova-senha-7' });
    checar('Depois de 5 erros nem o codigo certo passa: 429 (nao da para adivinhar 1 milhao de codigos)', r.status === 429, r);

    await conta('Edu Reis', 'edu@exemplo.com', 'doador');
    antes = emails.length;
    for (let i = 0; i < 7; i++) await api('POST', '/recuperacao/pedir', null, { email: 'edu@exemplo.com' });
    checar('Pedir 7 vezes seguidas manda so 5 e-mails (nao enche a caixa de ninguem)', emails.length - antes === 5, emails.length - antes);

    titulo('Necessidades de sangue: criar, ler, atualizar e apagar');
    const tDoador = await conta('Gabi Torres', 'gabi@exemplo.com', 'doador');
    const tH1 = await conta('Hospital Recife', 'h1@exemplo.com', 'hospital');
    const tH2 = await conta('Hospital Olinda', 'h2@exemplo.com', 'hospital');
    for (const [t, cnpj] of [[tH1, '11.111.111/0001-11'], [tH2, '22.222.222/0001-22']]) {
        await api('POST', '/hospital/perfil', t, { cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });
    }
    await pool.query("UPDATE hospitais SET aprovado = true");
    r = await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'Z+', urgencia: 'alerta' });
    checar('Tipo sanguineo inventado: 400', r.status === 400, r.dados);
    r = await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'O+', urgencia: 'urgentissimo' });
    checar('Urgencia inventada: 400', r.status === 400, r.dados);
    r = await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'O+', urgencia: 'alerta' });
    const idNec = r.dados && r.dados.id;
    checar('Publicar: 201 com id e Location', r.status === 201 && !!idNec && r.cabecalhos.get('location') === '/hospital/necessidades/' + idNec, r.dados);
    r = await api('GET', '/hospital/necessidades', tH1);
    checar('A lista traz a necessidade como "aberta"', r.status === 200 && r.dados.some((n) => n.id === idNec && n.status === 'aberta'), r.dados);
    r = await api('PATCH', '/hospital/necessidades/abc', tH1, { status: 'atendida' });
    checar('Id invalido: 400', r.status === 400, r);
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH1, {});
    checar('Nada para mudar: 400', r.status === 400, r);
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH1, { status: 'sumiu' });
    checar('Status inventado: 400', r.status === 400, r);
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH2, { status: 'atendida' });
    checar('Outro hospital nao mexe nela: 404', r.status === 404, r);
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tDoador, { status: 'atendida' });
    checar('Doador nao mexe em necessidade: 403', r.status === 403, r);
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH1, { urgencia: 'critico' });
    checar('Mudar a urgencia de uma aberta: 200', r.status === 200 && r.dados.urgencia === 'critico' && r.dados.status === 'aberta', r.dados);

    // Uma urgente aberta alimenta o canal de noticias; fechada, deixa de contar.
    const somaUrgentes = async () => {
        const resp = await fetch(URL + '/noticias');
        return [...(await resp.text()).matchAll(/"necessidadesUrgentes":(\d+)/g)].reduce((s, m) => s + Number(m[1]), 0);
    };
    const comAberta = await somaUrgentes();
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH1, { status: 'atendida' });
    checar('Fechar como "atendida": 200', r.status === 200 && r.dados.status === 'atendida', r.dados);
    const comFechada = await somaUrgentes();
    checar('Fechada, a necessidade urgente some do canal de noticias (' + comAberta + ' -> ' + comFechada + ')', comAberta >= 1 && comFechada === comAberta - 1, { comAberta, comFechada });
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH1, { urgencia: 'emergencia' });
    checar('Urgencia de necessidade fechada: 409 (reabra antes)', r.status === 409, r.dados);
    r = await api('PATCH', '/hospital/necessidades/' + idNec, tH1, { status: 'aberta', urgencia: 'emergencia' });
    checar('Reabrir e mudar a urgencia juntos: 200', r.status === 200 && r.dados.status === 'aberta' && r.dados.urgencia === 'emergencia', r.dados);
    r = await api('DELETE', '/hospital/necessidades/' + idNec, tH2);
    checar('Outro hospital nao apaga: 404', r.status === 404, r);
    r = await api('DELETE', '/hospital/necessidades/' + idNec, tH1);
    checar('Apagar: 204', r.status === 204, r);
    r = await api('DELETE', '/hospital/necessidades/' + idNec, tH1);
    checar('Apagar de novo: 404', r.status === 404, r);

    titulo('Noticias: editar (PUT)');
    await conta('Admin Teste', 'admin@exemplo.com', 'doador');
    await pool.query("UPDATE usuarios SET tipo = 'admin' WHERE email = 'admin@exemplo.com'");
    const tAdmin = (await api('POST', '/auth/login', null, { email: 'admin@exemplo.com', senha: SENHA })).dados.token;
    const noticia = { uf: 'PE', titulo: 'Hemope pede doadores', resumo: 'Estoques baixos pedem que mais pessoas doem sangue nesta semana.', fonte: 'Hemope', url: 'https://exemplo.com/a', nivel: 'alerta' };
    r = await api('POST', '/noticias', tAdmin, noticia);
    const idNot = r.dados && r.dados.id;
    checar('Admin publica um aviso: 201', r.status === 201 && !!idNot, r);
    await api('POST', '/noticias', tAdmin, { ...noticia, url: 'https://exemplo.com/b', titulo: 'Outro aviso qualquer aqui' });
    r = await api('PUT', '/noticias/' + idNot, tDoador, noticia);
    checar('Quem nao e admin nao edita: 403', r.status === 403, r);
    r = await api('PUT', '/noticias/' + idNot, tAdmin, { ...noticia, titulo: 'x' });
    checar('Titulo curto demais: 400', r.status === 400, r);
    r = await api('PUT', '/noticias/99999', tAdmin, noticia);
    checar('Aviso que nao existe: 404', r.status === 404, r);
    r = await api('PUT', '/noticias/abc', tAdmin, noticia);
    checar('Id invalido: 400', r.status === 400, r);
    r = await api('PUT', '/noticias/' + idNot, tAdmin, { ...noticia, url: 'https://exemplo.com/b' });
    checar('Link que ja e de outro aviso: 409', r.status === 409, r.dados);
    r = await api('PUT', '/noticias/' + idNot, tAdmin, { ...noticia, titulo: 'Hemope atualiza o pedido de doadores', nivel: 'critico' });
    checar('Editar: 200', r.status === 200, r);
    const lista = await fetch(URL + '/noticias').then((x) => x.text());
    checar('A edicao aparece no canal publico', lista.includes('Hemope atualiza o pedido de doadores') && !lista.includes('Hemope pede doadores"'), lista.slice(0, 120));

    titulo('Excluir a conta tambem derruba as sessoes');
    await conta('Fabi Souza', 'fabi@exemplo.com', 'doador');
    const tokenFabi = (await api('POST', '/auth/login', null, { email: 'fabi@exemplo.com', senha: SENHA })).dados.token;
    await api('POST', '/doador/perfil', tokenFabi, { tipoSanguineo: 'O+', sexo: 'F', cidade: 'Recife', cpf: '529.982.247-25', telefone: '81999990001', visibilidade: 'anonimo' });
    await dormir(1100);
    r = await api('POST', '/perfil/excluir', tokenFabi, { senha: SENHA });
    checar('Excluir a conta: 200', r.status === 200, r);
    r = await api('GET', '/auth/eu', tokenFabi);
    checar('O token de uma conta excluida deixa de valer: 401', r.status === 401, r);
    r = await api('POST', '/auth/login', null, { email: 'fabi@exemplo.com', senha: SENHA });
    checar('E a conta excluida nao entra mais: 401', r.status === 401, r);

    amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
