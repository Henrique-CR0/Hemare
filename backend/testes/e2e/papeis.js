// Teste de ponta a ponta: CADA tipo de conta so entra no que e dele. Testa TODAS as rotas da API, lidas do proprio codigo
// (o mesmo leitor que gera docs/API.md): se alguem criar uma rota nova e esquecer do porteiro, este teste falha.
//   rota de doador   -> hospital e admin recebem 403
//   rota de hospital -> doador e admin recebem 403
//   rota de admin    -> doador e hospital recebem 403
//   qualquer rota que nao e publica -> sem login recebe 401
// Rode: node testes/e2e/papeis.js   (ou  npm test)
const amb = require('../ambiente').criarAmbiente(3078);
const { pool, api, conta, checar, titulo } = amb;
const { lerRotas } = require('../../scripts/api');

async function main() {
    await amb.iniciar([]);

    const tDoador = await conta('Ana Doadora', 'ana@exemplo.com', 'doador');
    const tHospital = await conta('Hospital Recife', 'h@exemplo.com', 'hospital');
    await api('POST', '/hospital/perfil', tHospital, { cnpj: '11.111.111/0001-11', cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });
    await pool.query('UPDATE hospitais SET aprovado = true');
    await conta('Admin Teste', 'adm@exemplo.com', 'doador');
    await pool.query("UPDATE usuarios SET tipo = 'admin' WHERE email = 'adm@exemplo.com'");
    const tAdmin = (await api('POST', '/auth/login', null, { email: 'adm@exemplo.com', senha: 'senha-forte-123' })).dados.token;

    const tokens = { doador: tDoador, hospital: tHospital, admin: tAdmin };
    const quemEntra = {
        'doador': ['doador'],
        'hospital': ['hospital'],
        'hospital aprovado': ['hospital'],
        'hospital ou admin': ['hospital', 'admin'],
        'admin': ['admin']
    };

    const rotas = lerRotas().filter((r) => quemEntra[r.acesso]);
    const preencher = (caminho) => caminho.replace(/:\w+/g, '1');
    const corpo = (verbo) => (verbo === 'get' || verbo === 'delete' ? undefined : {});

    titulo('Cada tipo de conta so entra no que e dele (' + rotas.length + ' rotas restritas)');
    let barrados = 0;
    const furos = [];
    for (const r of rotas) {
        for (const tipo of Object.keys(tokens)) {
            if (quemEntra[r.acesso].includes(tipo)) continue;
            const resposta = await api(r.verbo.toUpperCase(), preencher(r.caminho), tokens[tipo], corpo(r.verbo));
            if (resposta.status === 403) barrados++;
            else furos.push(tipo + ' em ' + r.verbo.toUpperCase() + ' ' + r.caminho + ' -> ' + resposta.status);
        }
    }
    checar('Conta do tipo errado recebe 403 em TODAS as rotas restritas (' + barrados + ' tentativas barradas)', furos.length === 0, furos);

    const semLogin = [];
    for (const r of lerRotas().filter((x) => x.acesso !== 'público')) {
        const resposta = await api(r.verbo.toUpperCase(), preencher(r.caminho), null, corpo(r.verbo));
        if (resposta.status !== 401) semLogin.push(r.verbo.toUpperCase() + ' ' + r.caminho + ' -> ' + resposta.status);
    }
    checar('Sem login, toda rota nao publica responde 401', semLogin.length === 0, semLogin);

    titulo('O tipo certo continua entrando');
    let r = await api('GET', '/doador/conquistas', tDoador);
    checar('Doador abre as proprias conquistas (nao e barrado; sem perfil devolve 404, e normal)', r.status !== 403 && r.status !== 401, r.status);
    r = await api('GET', '/hospital/meus-dados', tHospital);
    checar('Hospital abre os proprios dados', r.status === 200 && r.dados.cnpj === '11.111.111/0001-11', r);
    r = await api('GET', '/radar/aptidao', tHospital);
    checar('Hospital abre o radar', r.status === 200, r);
    r = await api('GET', '/radar/aptidao', tAdmin);
    checar('Administrador abre o radar', r.status === 200, r);
    r = await api('GET', '/radar/aptidao', tDoador);
    checar('Doador NAO abre o radar (e ferramenta de hospital)', r.status === 403, r);
    r = await api('GET', '/hospital/necessidades', tDoador);
    checar('Doador NAO lista necessidades de hospital', r.status === 403, r);
    r = await api('GET', '/agendamentos', tHospital);
    checar('Hospital NAO lista agendamentos de doador', r.status === 403, r);
    r = await api('GET', '/admin/hospitais', tHospital);
    checar('Hospital NAO abre o painel do administrador', r.status === 403, r);

    amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
