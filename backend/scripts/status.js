// Hemare - Atualiza os NUMEROS do relatorio de status (docs/STATUS.md) a partir do proprio codigo, para ninguem digitar contagem na mao.
// Uso:   npm run status          (roda os testes, conta rotas, arquivos, linhas, commits e PRs e reescreve o bloco de numeros)
//        npm run status -- --ver (so mostra, sem gravar)
// O texto do relatorio (saude, riscos, proximos passos) e escrito por uma pessoa; so o trecho entre as marcas
// <!-- numeros:inicio --> e <!-- numeros:fim --> e reescrito aqui.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const REPO = path.join(RAIZ, '..');
const ARQUIVO = path.join(REPO, 'docs', 'STATUS.md');
const INICIO = '<!-- numeros:inicio -->';
const FIM = '<!-- numeros:fim -->';

function executar(comando, args, opcoes) {
    const r = spawnSync(comando, args, { cwd: REPO, encoding: 'utf8', timeout: 300000, shell: process.platform === 'win32' && comando === 'gh', ...opcoes });
    return r.status === 0 ? r.stdout : null;
}

function milhar(n) { return Number(n).toLocaleString('pt-BR'); }

function linhasDe(arquivos) {
    return arquivos.reduce((soma, a) => soma + fs.readFileSync(path.join(REPO, a), 'utf8').split('\n').length, 0);
}

function coletar() {
    const arquivos = (executar('git', ['ls-files']) || '').split('\n').filter(Boolean).map((a) => a.replace(/\\/g, '/'));
    const codigo = arquivos.filter((a) => /\.(js|jsx|css)$/.test(a) && !a.includes('package-lock'));
    const ehTeste = (a) => a.startsWith('backend/testes/') || /^backend\/regras\/testar-/.test(a);
    const back = codigo.filter((a) => a.startsWith('backend/') && !ehTeste(a));
    const testes = codigo.filter(ehTeste);
    const front = codigo.filter((a) => a.startsWith('frontend/'));

    const openapi = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'openapi.json'), 'utf8'));
    const rotas = Object.values(openapi.paths).reduce((s, p) => s + Object.keys(p).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length, 0);
    const { MIGRACOES } = require('../db/ordem');

    const saida = spawnSync(process.execPath, ['testes/rodar.js'], { cwd: RAIZ, encoding: 'utf8', timeout: 600000 });
    const resumo = /Tudo certo: (\d+) arquivos, (\d+) verificacoes passando/.exec((saida.stdout || '') + (saida.stderr || ''));

    const commits = Number((executar('git', ['rev-list', '--count', 'HEAD']) || '0').trim());
    const primeiro = (executar('git', ['log', '--reverse', '--format=%ad', '--date=short']) || '').split('\n')[0];

    let prs = null;
    const json = executar('gh', ['pr', 'list', '--state', 'all', '--limit', '300', '--json', 'number,state']);
    if (json) {
        const lista = JSON.parse(json);
        prs = { total: lista.length, mesclados: lista.filter((p) => p.state === 'MERGED').length, abertos: lista.filter((p) => p.state === 'OPEN').map((p) => p.number) };
    }

    return {
        rotas, arquivosRotas: fs.readdirSync(path.join(RAIZ, 'rotas')).filter((f) => f.endsWith('.js')).length,
        regras: fs.readdirSync(path.join(RAIZ, 'regras')).filter((f) => f.endsWith('.js') && !f.startsWith('testar-')).length,
        migracoes: MIGRACOES.length, telas: fs.readdirSync(path.join(REPO, 'frontend', 'src', 'paginas')).filter((f) => f.endsWith('.jsx')).length,
        linhasBack: linhasDe(back), linhasFront: linhasDe(front), linhasTestes: linhasDe(testes),
        testes: resumo ? { arquivos: Number(resumo[1]), verificacoes: Number(resumo[2]) } : null,
        commits, primeiro, prs
    };
}

function bloco(d) {
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const linhas = [
        INICIO,
        '_Gerado por `npm run status` em ' + hoje + '. Não edite este bloco à mão._',
        '',
        '| Indicador | Valor |',
        '|---|---|',
        '| Testes automáticos | ' + (d.testes ? '**' + milhar(d.testes.verificacoes) + ' verificações** em ' + d.testes.arquivos + ' arquivos, **todas passando** ✅' : '⚠️ **algum teste falhou** (rode `npm test` e veja)') + ' |',
        '| Rotas da API | ' + d.rotas + ' (em ' + d.arquivosRotas + ' arquivos), todas documentadas em `docs/API.md` |',
        '| Arquivos de regras de negócio puras (sem banco, testáveis em milissegundos) | ' + d.regras + ' |',
        '| Telas (páginas do site) | ' + d.telas + ' |',
        '| Scripts de banco na ordem de `npm run migrar` | ' + d.migracoes + ' |',
        '| Linhas de código | backend ' + milhar(d.linhasBack) + ' · frontend ' + milhar(d.linhasFront) + ' · testes ' + milhar(d.linhasTestes) + ' |',
        '| Histórico | ' + d.commits + ' commits desde ' + d.primeiro.split('-').reverse().join('/') + ' |',
        '| Pull requests | ' + (d.prs ? d.prs.mesclados + ' mesclados de ' + d.prs.total + '; abertos: ' + (d.prs.abertos.length ? d.prs.abertos.map((n) => '#' + n).join(', ') : 'nenhum') : 'indisponível (o `gh` não respondeu)') + ' |',
        FIM
    ];
    return linhas.join('\n');
}

const dados = coletar();
const novo = bloco(dados);
if (process.argv.includes('--ver')) {
    console.log(novo);
    process.exit(dados.testes ? 0 : 1);
}

const atual = fs.readFileSync(ARQUIVO, 'utf8').replace(/\r\n/g, '\n');
const i = atual.indexOf(INICIO), f = atual.indexOf(FIM);
if (i < 0 || f < 0) {
    console.log('❌ Não achei as marcas ' + INICIO + ' e ' + FIM + ' em docs/STATUS.md.');
    process.exit(1);
}
fs.writeFileSync(ARQUIVO, atual.slice(0, i) + novo + atual.slice(f + FIM.length), 'utf8');
console.log('✅ Números de docs/STATUS.md atualizados.' + (dados.testes ? '' : ' ⚠️ Há teste falhando.'));
process.exit(dados.testes ? 0 : 1);
