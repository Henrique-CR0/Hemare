// Hemare - Gera a documentacao da API (docs/API.md e docs/openapi.json) a partir do proprio codigo das rotas,
// para ela nunca ficar desatualizada. Uso:   npm run docs
//
// Como funciona: le servidor.js para saber que arquivo de rotas fica em que prefixo (app.use('/auth', rotasAuth)),
// le cada arquivo de rotas atras de router.get/post/put/patch/delete(...), e tira de cada rota o caminho, os "porteiros"
// (autenticar, exigirAdmin, exigirHospitalAprovado) e o comentario que vem logo acima dela.
// Se uma rota nova nao aparecer com o texto certo, e so escrever um comentario "//" na linha de cima.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DOCS = path.join(RAIZ, '..', 'docs');
const VERBOS = ['get', 'post', 'put', 'patch', 'delete'];

function ler(caminho) {
    return fs.readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n');
}

// { '/auth': 'auth', '/doador': 'doador', ... } a partir do servidor.js.
function lerMontagens() {
    const fonte = ler(path.join(RAIZ, 'servidor.js'));
    const variaveis = {};
    for (const m of fonte.matchAll(/const (\w+) = require\('\.\/rotas\/([\w-]+)'\);/g)) variaveis[m[1]] = m[2];
    const montagens = [];
    for (const m of fonte.matchAll(/app\.use\('(\/[\w-]*)', (\w+)\);/g)) {
        if (variaveis[m[2]]) montagens.push({ prefixo: m[1], arquivo: variaveis[m[2]] });
    }
    return montagens;
}

// Comentario "//" colado em cima da linha 'indice' (varias linhas viram uma frase).
function comentarioAcima(linhas, indice) {
    const partes = [];
    for (let i = indice - 1; i >= 0 && /^\s*\/\//.test(linhas[i]); i--) {
        partes.unshift(linhas[i].replace(/^\s*\/\/\s?/, '').trim());
    }
    return partes.join(' ').replace(/\s+/g, ' ').trim();
}

function limparResumo(texto) {
    return texto.replace(/^[=\-\s]+|[=\-\s]+$/g, '').replace(/\s*:\s*$/, '');
}

// Comando "router.use(...)" completo, comecando na linha 'i' (uma linha, ou varias ate o "});" que fecha).
function comandoUse(linhas, i) {
    if (/\);\s*$/.test(linhas[i]) && !/=>\s*\{\s*$/.test(linhas[i])) return linhas[i];
    const partes = [linhas[i]];
    for (let j = i + 1; j < linhas.length; j++) {
        partes.push(linhas[j]);
        if (/^\}\);/.test(linhas[j])) break;
    }
    return partes.join('\n');
}

// Papel exigido por um bloco de codigo: procura "tipo !== 'doador'" (a rota recusa quem nao e do tipo).
function papelNoCodigo(bloco) {
    const m = bloco.match(/tipo !== '(doador|hospital|admin)'/);
    return m ? m[1] : null;
}

// Rotas de um arquivo: [{ verbo, caminho, porteiros: [...], papel, resumo }]
function lerRotasDoArquivo(arquivo) {
    const fonte = ler(path.join(RAIZ, 'rotas', arquivo + '.js'));
    const linhas = fonte.split('\n');
    const PORTEIROS = /\b(autenticar|exigirAdmin|exigirHospitalAprovado)\b/g;

    // router.use(...): vale para o arquivo todo (sem caminho) ou so para um prefixo ('/eu').
    const usos = [];
    linhas.forEach((linha, i) => {
        if (!/^router\.use\(/.test(linha)) return;
        const comando = comandoUse(linhas, i);
        const prefixo = (comando.match(/^router\.use\('([^']*)'/) || [])[1] || '';
        usos.push({ prefixo, porteiros: [...comando.matchAll(PORTEIROS)].map((x) => x[1]), papel: papelNoCodigo(comando) });
    });

    // Onde cada rota comeca (o corpo vai ate a proxima).
    const inicios = [];
    linhas.forEach((linha, indice) => {
        const m = linha.match(new RegExp("^router\\.(" + VERBOS.join('|') + ")\\('([^']*)'(.*)$"));
        if (m) inicios.push({ indice, verbo: m[1], caminho: m[2], resto: m[3] });
    });

    return inicios.map((r, k) => {
        const proximo = k + 1 < inicios.length ? inicios[k + 1].indice : linhas.length;
        const bloco = linhas.slice(r.indice, proximo).join('\n');
        const antesDoHandler = [r.resto, linhas[r.indice + 1] || ''].join(' ').split(/\basync\b|\(req\b|function\b/)[0];
        const proprios = [...antesDoHandler.matchAll(PORTEIROS)].map((x) => x[1]);
        const cobertos = usos.filter((u) => u.prefixo === '' || r.caminho === u.prefixo || r.caminho.startsWith(u.prefixo + '/'));
        const porteiros = [...new Set([...proprios, ...cobertos.flatMap((u) => u.porteiros)])];
        const papel = cobertos.map((u) => u.papel).find(Boolean) || papelNoCodigo(bloco);
        return { verbo: r.verbo, caminho: r.caminho, porteiros, papel, resumo: limparResumo(comentarioAcima(linhas, r.indice)) };
    });
}

// Quem pode chamar.
function acesso(rota) {
    if (!rota.porteiros.includes('autenticar')) return 'público';
    if (rota.porteiros.includes('exigirAdmin') || rota.papel === 'admin') return 'admin';
    if (rota.porteiros.includes('exigirHospitalAprovado')) return 'hospital aprovado';
    if (rota.papel === 'hospital') return 'hospital';
    if (rota.papel === 'doador') return 'doador';
    return 'logado';
}

function juntarCaminhos(prefixo, caminho) {
    const c = (prefixo + (caminho === '/' ? '' : caminho)) || '/';
    return c.length > 1 ? c.replace(/\/$/, '') : c;
}

// Todas as rotas da API, em ordem de prefixo e caminho.
function lerRotas() {
    const todas = [];
    for (const { prefixo, arquivo } of lerMontagens()) {
        for (const r of lerRotasDoArquivo(arquivo)) {
            todas.push({ verbo: r.verbo, caminho: juntarCaminhos(prefixo, r.caminho), acesso: acesso(r), resumo: r.resumo, arquivo, recurso: prefixo.slice(1) });
        }
    }
    // Rotas soltas no servidor.js.
    const fonte = ler(path.join(RAIZ, 'servidor.js'));
    const linhas = fonte.split('\n');
    linhas.forEach((linha, i) => {
        const m = linha.match(/^app\.get\('(\/[\w-]*)'/);
        if (m) todas.push({ verbo: 'get', caminho: m[1], acesso: 'público', resumo: limparResumo(comentarioAcima(linhas, i)), arquivo: 'servidor', recurso: m[1] === '/' ? 'raiz' : m[1].slice(1) });
    });
    const ordem = (v) => VERBOS.indexOf(v);
    return todas.sort((a, b) => (a.recurso < b.recurso ? -1 : a.recurso > b.recurso ? 1 : a.caminho < b.caminho ? -1 : a.caminho > b.caminho ? 1 : ordem(a.verbo) - ordem(b.verbo)));
}

const NOME_RECURSO = {
    raiz: 'Raiz', saude: 'Saúde', auth: 'Conta e sessão', doador: 'Doador', perfil: 'Perfil do doador (LGPD)', hospital: 'Hospital', admin: 'Administrador',
    locais: 'Locais de doação', recuperacao: 'Recuperação de senha', radar: 'Radar preditivo', clima: 'Previsão do sangue', apadrinhamento: 'Apadrinhamento',
    campanha: 'Campanhas de reposição', noticias: 'Canal de notícias', raros: 'Rede de sangue raro', pcd: 'Ficha PcD', agenda: 'Agenda do hospital',
    agendamentos: 'Agendamentos do doador', historico: 'Minhas doações'
};

function nomeDoRecurso(r) { return NOME_RECURSO[r] || r; }

// Matriz CRUD por recurso: C = POST, R = GET, U = PUT/PATCH, D = DELETE.
function matrizCrud(rotas) {
    const recursos = [...new Set(rotas.map((r) => r.recurso))];
    return recursos.map((rec) => {
        const doRecurso = rotas.filter((r) => r.recurso === rec);
        const tem = (verbos) => doRecurso.some((r) => verbos.includes(r.verbo));
        return { recurso: rec, c: tem(['post']), r: tem(['get']), u: tem(['put', 'patch']), d: tem(['delete']), total: doRecurso.length };
    });
}

function gerarMarkdown(rotas) {
    const saida = [];
    saida.push('# API do Hemare');
    saida.push('');
    saida.push('> Gerado automaticamente a partir do código (`npm run docs`, na pasta `backend`). **Não edite à mão**: escreva um comentário `//` na linha de cima da rota e gere de novo. O mesmo conteúdo, em formato OpenAPI 3, está em [`openapi.json`](openapi.json) (abra no [Swagger Editor](https://editor.swagger.io)).');
    saida.push('');
    saida.push('**' + rotas.length + ' rotas** em ' + new Set(rotas.map((r) => r.recurso)).size + ' grupos.');
    saida.push('');
    saida.push('## Como usar');
    saida.push('');
    saida.push('- **Base**: `http://localhost:3000` (ou o endereço do seu backend). Corpo e resposta em **JSON** (`Content-Type: application/json`), limite de 200 KB.');
    saida.push('- **Entrar**: `POST /auth/login` devolve `token`. Nas rotas que não são públicas, envie `Authorization: Bearer <token>`.');
    saida.push('- **Sessão**: o token vale 1 dia (7 com `lembrar: true`). `GET /auth/eu` confere a sessão e `POST /auth/renovar` troca por um novo.');
    saida.push('- **Erros** sempre em JSON: `{ "erro": "mensagem para a pessoa" }`.');
    saida.push('');
    saida.push('| Código | Quando |');
    saida.push('|---|---|');
    saida.push('| 200 / 201 / 204 | deu certo / criou (com `Location` quando há um recurso novo) / deu certo e não há corpo |');
    saida.push('| 400 | dado inválido ou faltando |');
    saida.push('| 401 | sem token, token inválido ou expirado, ou sessão encerrada |');
    saida.push('| 403 | logado, mas o papel não permite (ou hospital ainda não aprovado) |');
    saida.push('| 404 | não existe (ou não é seu: a API não revela a existência) |');
    saida.push('| 409 | conflito (já existe, horário lotado, estado que não permite a mudança) |');
    saida.push('| 413 | corpo grande demais |');
    saida.push('| 429 | muitas tentativas; veja o cabeçalho `Retry-After` |');
    saida.push('| 500 | erro inesperado (em produção, sem detalhes internos) |');
    saida.push('');
    saida.push('**Acesso**: *público* (sem login) · *logado* (qualquer conta) · *doador* · *hospital* · *hospital aprovado* (cadastro verificado por um administrador) · *admin*. O papel é conferido no servidor (porteiros `autenticar`, `exigirAdmin` e `exigirHospitalAprovado`, ou uma checagem do tipo da conta dentro da rota).');
    saida.push('');
    saida.push('## CRUD por recurso');
    saida.push('');
    saida.push('C = criar (`POST`) · R = ler (`GET`) · U = atualizar (`PUT`/`PATCH`) · D = apagar (`DELETE`). Lacuna nem sempre é defeito: doações confirmadas, por exemplo, nunca se alteram de propósito (cadeia de confiança).');
    saida.push('');
    saida.push('| Grupo | C | R | U | D | Rotas |');
    saida.push('|---|:-:|:-:|:-:|:-:|--:|');
    for (const l of matrizCrud(rotas)) {
        const x = (v) => (v ? '✅' : '—');
        saida.push('| ' + nomeDoRecurso(l.recurso) + ' (`/' + (l.recurso === 'raiz' ? '' : l.recurso) + '`) | ' + x(l.c) + ' | ' + x(l.r) + ' | ' + x(l.u) + ' | ' + x(l.d) + ' | ' + l.total + ' |');
    }
    saida.push('');
    saida.push('## Rotas');
    const grupos = [...new Set(rotas.map((r) => r.recurso))];
    for (const g of grupos) {
        saida.push('');
        saida.push('### ' + nomeDoRecurso(g));
        saida.push('');
        saida.push('| Método | Caminho | Acesso | O que faz |');
        saida.push('|---|---|---|---|');
        for (const r of rotas.filter((x) => x.recurso === g)) {
            saida.push('| `' + r.verbo.toUpperCase() + '` | `' + r.caminho + '` | ' + r.acesso + ' | ' + (r.resumo || '—').replace(/\|/g, '\\|') + ' |');
        }
    }
    saida.push('');
    return saida.join('\n');
}

function gerarOpenApi(rotas) {
    const paths = {};
    for (const r of rotas) {
        const caminho = r.caminho.replace(/:(\w+)/g, '{$1}');
        const parametros = [...r.caminho.matchAll(/:(\w+)/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } }));
        const operacao = {
            tags: [nomeDoRecurso(r.recurso)],
            summary: r.resumo || r.verbo.toUpperCase() + ' ' + r.caminho,
            description: 'Acesso: ' + r.acesso + '.',
            responses: { [r.verbo === 'post' ? '201' : r.verbo === 'delete' ? '204' : '200']: { description: 'Deu certo' }, 400: { description: 'Dado inválido' }, 500: { description: 'Erro inesperado' } }
        };
        if (parametros.length) operacao.parameters = parametros;
        if (r.acesso !== 'público') {
            operacao.security = [{ bearerAuth: [] }];
            operacao.responses[401] = { description: 'Sem sessão válida' };
            if (r.acesso !== 'logado') operacao.responses[403] = { description: 'O papel da conta não permite' };
        }
        if (['post', 'put', 'patch'].includes(r.verbo)) operacao.requestBody = { content: { 'application/json': { schema: { type: 'object' } } } };
        paths[caminho] = paths[caminho] || {};
        paths[caminho][r.verbo] = operacao;
    }
    return {
        openapi: '3.0.3',
        info: { title: 'API do Hemare', version: '1.0.0', description: 'Gerado automaticamente por backend/scripts/api.js. Veja docs/API.md.' },
        servers: [{ url: 'http://localhost:3000' }],
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
        paths
    };
}

function gerar() {
    const rotas = lerRotas();
    return { rotas, markdown: gerarMarkdown(rotas), openapi: JSON.stringify(gerarOpenApi(rotas), null, 2) + '\n' };
}

if (require.main === module) {
    const { rotas, markdown, openapi } = gerar();
    fs.mkdirSync(DOCS, { recursive: true });
    fs.writeFileSync(path.join(DOCS, 'API.md'), markdown, 'utf8');
    fs.writeFileSync(path.join(DOCS, 'openapi.json'), openapi, 'utf8');
    console.log('✅ Documentação da API gerada: ' + rotas.length + ' rotas (docs/API.md e docs/openapi.json).');
}

module.exports = { lerRotas, gerar, matrizCrud, DOCS };
