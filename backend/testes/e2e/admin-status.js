// Teste de ponta a ponta: pagina "Status do desenvolvimento" do administrador (relatorio + uso real, so numeros).
// Rode: node testes/e2e/admin-status.js   (ou  npm test)
const amb = require('../ambiente').criarAmbiente(3080);
const { pool, api, conta, checar, titulo } = amb;

async function main() {
    await amb.iniciar(['criar-noticias-feed.js']);

    const tDoador = await conta('Doador Um', 'd1@x.com', 'doador');
    await conta('Doador Dois', 'd2@x.com', 'doador');
    await conta('Hospital', 'h@x.com', 'hospital');
    await conta('Admin', 'adm@x.com', 'doador');
    await pool.query("UPDATE usuarios SET tipo = 'admin' WHERE email = 'adm@x.com'");
    const tAdmin = (await api('POST', '/auth/login', null, { email: 'adm@x.com', senha: 'senha-forte-123' })).dados.token;

    titulo('Quem pode ver');
    let r = await api('GET', '/admin/status', null);
    checar('Visitante (401)', r.status === 401, r);
    r = await api('GET', '/admin/status', tDoador);
    checar('Doador NAO ve (403)', r.status === 403, r);

    titulo('O que o administrador recebe');
    r = await api('GET', '/admin/status', tAdmin);
    checar('Admin ve (200)', r.status === 200, r);
    checar('Traz o texto do relatorio (docs/STATUS.md)', typeof r.dados.relatorio === 'string' && r.dados.relatorio.startsWith('# Status Report do Desenvolvimento'), (r.dados.relatorio || '').slice(0, 60));
    checar('Contas contadas por tipo (2 doadores, 1 hospital, 1 admin)', r.dados.uso.contas.doadores === 2 && r.dados.uso.contas.hospitais === 1 && r.dados.uso.contas.administradores === 1, r.dados.uso.contas);
    checar('Contas novas nos ultimos 7 dias = todas as 4', r.dados.uso.contas.novasNos7Dias === 4, r.dados.uso.contas);
    checar('Doacoes e hospitais aprovados em zero', r.dados.uso.doacoesConfirmadas === 0 && typeof r.dados.uso.hospitaisAprovados === 'number', r.dados.uso);
    checar('Feed de noticias vazio, sem coleta ainda', r.dados.uso.noticias.total === 0 && r.dados.uso.noticias.ultimaColeta === null, r.dados.uso.noticias);
    checar('So numeros: nenhum e-mail nem nome de ninguem na resposta', !/@x\.com|Doador Um|Hospital|senha/i.test(JSON.stringify(r.dados.uso)), r.dados.uso);

    titulo('Acompanha o uso');
    await pool.query("UPDATE usuarios SET criado_em = $1 WHERE email = 'd2@x.com'", [new Date(Date.now() - 20 * 86400000)]);
    await pool.query("INSERT INTO noticias_feed (titulo, fonte, url, categoria, publicada_em, chave) VALUES ('Uma noticia qualquer de teste', 'X', 'https://x.exemplo/a', 'saude', $1, 'uma noticia')", [new Date()]);
    r = await api('GET', '/admin/status', tAdmin);
    checar('Conta de 20 dias atras sai da contagem de 7 dias (3 de 4)', r.dados.uso.contas.novasNos7Dias === 3, r.dados.uso.contas);
    checar('Noticia no feed aparece, com a data da ultima coleta', r.dados.uso.noticias.total === 1 && !Number.isNaN(Date.parse(r.dados.uso.noticias.ultimaColeta)), r.dados.uso.noticias);

    amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
