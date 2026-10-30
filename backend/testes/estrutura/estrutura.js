// Testes de ESTRUTURA do projeto: regras da arquitetura que o computador confere sozinho, para ninguem esquecer nada.
// (O codigo novo nasce de copia e cola; estas conferencias pegam o que costuma ficar para tras.)
// Rode: node testes/estrutura/estrutura.js   (ou  npm test)
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const REPO = path.join(RAIZ, '..');
const { MIGRACOES, FORA_DA_LISTA } = require('../../db/ordem');
const { gerar, lerRotas } = require('../../scripts/api');

let falhas = 0, total = 0;
function checar(descricao, ok, extra) {
    total++;
    if (!ok) falhas++;
    console.log((ok ? '✅' : '❌') + ' ' + descricao + (ok || extra === undefined ? '' : '  ->  ' + JSON.stringify(extra)));
}
const ler = (...partes) => fs.readFileSync(path.join(...partes), 'utf8').replace(/\r\n/g, '\n');
const lista = (pasta) => fs.readdirSync(path.join(RAIZ, pasta)).filter((f) => f.endsWith('.js')).sort();

console.log('--- Banco: ordem das migracoes ---');
const nomes = MIGRACOES.map((m) => m.arquivo);
checar('Todo script da lista existe em db/', nomes.every((n) => fs.existsSync(path.join(RAIZ, 'db', n))), nomes.filter((n) => !fs.existsSync(path.join(RAIZ, 'db', n))));
checar('Nenhum script repetido na lista', new Set(nomes).size === nomes.length);
const esquecidos = lista('db').filter((f) => !nomes.includes(f) && !FORA_DA_LISTA.includes(f));
checar('Todo script de db/ esta na lista (ou foi deixado de fora de proposito): ' + (esquecidos.join(', ') || 'nada esquecido'), esquecidos.length === 0, esquecidos);
const pos = (n) => nomes.indexOf(n);
checar('criar-tabelas.js e o primeiro', pos('criar-tabelas.js') === 0);
checar('Dependencias na ordem certa (hospital antes de ajustes dele, doacoes antes da cadeia, perfil antes de raros...)',
    pos('criar-hospital.js') < pos('ajustar-hospitais.js') && pos('criar-doacoes.js') < pos('ajustar-cadeia.js') && pos('ajustar-perfil.js') < pos('ajustar-raros.js')
    && pos('criar-doacoes.js') < pos('criar-agendamentos.js') && pos('criar-locais.js') < pos('popular-locais.js') && pos('popular-locais.js') < pos('atualizar-coordenadas.js')
    && pos('criar-noticias.js') < pos('popular-noticias.js'));
checar('Cada script de db/ termina fechando o pool (senao o terminal fica preso)', nomes.every((n) => /pool\.end\(\)/.test(ler(RAIZ, 'db', n))), nomes.filter((n) => !/pool\.end\(\)/.test(ler(RAIZ, 'db', n))));
checar('README cita o comando npm run migrar', /npm run migrar/.test(ler(REPO, 'README.md')));

console.log('--- Rotas: tudo montado e protegido ---');
const servidor = ler(RAIZ, 'servidor.js');
const arquivosDeRotas = lista('rotas').map((f) => f.replace(/\.js$/, ''));
const montados = [...servidor.matchAll(/require\('\.\/rotas\/([\w-]+)'\)/g)].map((m) => m[1]);
checar('Todo arquivo de rotas e carregado em servidor.js', arquivosDeRotas.every((a) => montados.includes(a)), arquivosDeRotas.filter((a) => !montados.includes(a)));
checar('Todo arquivo carregado em servidor.js existe', montados.every((m) => arquivosDeRotas.includes(m)), montados.filter((m) => !arquivosDeRotas.includes(m)));
const rotas = lerRotas();
const PUBLICAS_QUE_ESCREVEM = ['/auth/cadastro', '/auth/login', '/recuperacao/pedir', '/recuperacao/redefinir'];
const abertas = rotas.filter((r) => r.acesso === 'público' && r.verbo !== 'get' && !PUBLICAS_QUE_ESCREVEM.includes(r.caminho));
checar('Nenhuma rota que escreve (POST/PUT/PATCH/DELETE) ficou publica sem querer', abertas.length === 0, abertas.map((r) => r.verbo + ' ' + r.caminho));
// O que o visitante (sem conta) pode ler e uma DECISAO, escrita aqui e em docs/ACESSO.md. Se alguem deixar uma rota nova
// publica sem querer (ou fechar uma que deveria ser aberta), este teste falha e obriga a decidir de caso pensado.
const PUBLICAS_ESPERADAS = [
    'GET /', 'GET /saude', 'GET /locais', 'GET /noticias', 'GET /noticias/feed', 'GET /clima', 'GET /doador/placar', 'GET /hospital/estoque-publico',
    'GET /campanha/:codigo', 'GET /hospital/cadeia/verificar', 'POST /auth/cadastro', 'POST /auth/login', 'POST /recuperacao/pedir', 'POST /recuperacao/redefinir'
].sort();
const publicas = rotas.filter((r) => r.acesso === 'público').map((r) => r.verbo.toUpperCase() + ' ' + r.caminho).sort();
checar('A lista de rotas publicas e exatamente a combinada em docs/ACESSO.md (' + publicas.length + ' rotas)', JSON.stringify(publicas) === JSON.stringify(PUBLICAS_ESPERADAS),
    { aMais: publicas.filter((p) => !PUBLICAS_ESPERADAS.includes(p)), aMenos: PUBLICAS_ESPERADAS.filter((p) => !publicas.includes(p)) });
checar('docs/ACESSO.md existe e cita a regra do visitante', fs.existsSync(path.join(REPO, 'docs', 'ACESSO.md')) && /Sem conta/.test(ler(REPO, 'docs', 'ACESSO.md')));
checar('Todas as rotas tem uma frase explicando o que fazem (comentario acima dela)', rotas.every((r) => r.resumo), rotas.filter((r) => !r.resumo).map((r) => r.verbo + ' ' + r.caminho));
checar('A API tem mais de 80 rotas lidas (se cair muito, o leitor de rotas quebrou)', rotas.length > 80, rotas.length);

console.log('--- Seguranca do codigo ---');
const fontesRotas = [...lista('rotas').map((f) => ['rotas', f]), ...lista('servicos').map((f) => ['servicos', f]), ...lista('tarefas').map((f) => ['tarefas', f])];
const injecao = fontesRotas.filter(([pasta, f]) => /query\(\s*(`[^`]*\$\{[^}]*\b(req|corpo|body)\b|'[^']*'\s*\+\s*(req|corpo|body)\b)/.test(ler(RAIZ, pasta, f)));
checar('Nenhuma consulta SQL monta texto com dados da requisicao (so parametros $1, $2...)', injecao.length === 0, injecao);
const comRandom = lista('rotas').filter((f) => /Math\.random\(/.test(ler(RAIZ, 'rotas', f)));
checar('Nenhuma rota usa Math.random() (codigos e segredos usam crypto)', comRandom.length === 0, comRandom);
checar('Servidor exige JWT_SECRET para ligar', /JWT_SECRET/.test(servidor) && /process\.exit\(1\)/.test(servidor));
checar('Respostas 404 e erros em JSON estao registrados depois das rotas', servidor.indexOf("app.use('/pcd'") < servidor.indexOf('Rota não encontrada'));
const emailsSemEscape = lista('rotas').filter((f) => /\$\{(req\.body|usuario\.nome|doa\.nome)[^}]*\}/.test(ler(RAIZ, 'rotas', f)) && !/escaparHtml/.test(ler(RAIZ, 'rotas', f)));
checar('Rotas que montam HTML com nome de pessoa usam escaparHtml', emailsSemEscape.length === 0, emailsSemEscape);

console.log('--- Copias entre backend e frontend ---');
const regraBack = ler(RAIZ, 'regras', 'triagem.js').replace(/module\.exports = \{ avaliarTriagem \};?\s*$/, '');
const regraFront = ler(REPO, 'frontend', 'src', 'regras', 'triagem.js').replace(/export \{ avaliarTriagem \};?\s*$/, '');
checar('A triagem do navegador e a do servidor sao a mesma regra (so muda a ultima linha: export)', regraBack === regraFront);

console.log('--- Documentacao em dia ---');
const { markdown, openapi } = gerar();
const docApi = fs.existsSync(path.join(REPO, 'docs', 'API.md')) ? ler(REPO, 'docs', 'API.md') : '';
const docOpenapi = fs.existsSync(path.join(REPO, 'docs', 'openapi.json')) ? ler(REPO, 'docs', 'openapi.json') : '';
checar('docs/API.md bate com o codigo (se falhar: rode `npm run docs` e inclua no commit)', docApi === markdown);
checar('docs/openapi.json bate com o codigo', docOpenapi === openapi);
let openapiValido = false;
try { const o = JSON.parse(docOpenapi); openapiValido = o.openapi === '3.0.3' && Object.keys(o.paths).length > 60; } catch (e) { openapiValido = false; }
checar('docs/openapi.json e um OpenAPI 3 valido com as rotas', openapiValido);
checar('docs/ARQUITETURA.md existe', fs.existsSync(path.join(REPO, 'docs', 'ARQUITETURA.md')));

console.log('--- Scripts do npm ---');
const pacote = JSON.parse(ler(RAIZ, 'package.json'));
checar('npm test, npm run migrar, npm run docs e npm start existem', ['test', 'migrar', 'docs', 'start'].every((s) => pacote.scripts && pacote.scripts[s]), pacote.scripts);
checar('pg-mem esta so em devDependencies (nao vai para producao)', !!(pacote.devDependencies && pacote.devDependencies['pg-mem']) && !(pacote.dependencies && pacote.dependencies['pg-mem']));

console.log(falhas === 0 ? '\nTodos os testes passaram (' + total + ' verificacoes).' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
