// Hemare - Roda TODOS os testes do backend e mostra um resumo. Uso:  npm test
//   node testes/rodar.js            tudo (regras + ponta a ponta)
//   node testes/rodar.js regras     so os testes das regras (rapido, sem banco)
//   node testes/rodar.js e2e        so os de ponta a ponta (pg-mem)
//   node testes/rodar.js agenda     so os arquivos cujo nome contem "agenda"
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const filtro = process.argv[2];

function listar(pasta, ok) {
    const dir = path.join(raiz, pasta);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter(ok).sort().map((f) => path.join(pasta, f)) : [];
}

const regras = listar('regras', (f) => /^testar-.*\.js$/.test(f));
const e2e = listar('testes/e2e', (f) => f.endsWith('.js'));
let alvos = [...regras, ...e2e];
if (filtro === 'regras') alvos = regras;
else if (filtro === 'e2e') alvos = e2e;
else if (filtro) alvos = alvos.filter((a) => a.includes(filtro));

if (alvos.length === 0) {
    console.log('Nenhum teste encontrado para "' + filtro + '".');
    process.exit(1);
}

const resultados = [];
for (const arquivo of alvos) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [arquivo], { cwd: raiz, encoding: 'utf8', timeout: 240000, env: { ...process.env, TZ: 'UTC' } });
    const saida = (r.stdout || '') + (r.stderr || '');
    const passou = (saida.match(/^✅/gm) || []).length;
    const falhou = (saida.match(/^❌/gm) || []).length;
    const ok = r.status === 0 && falhou === 0;
    resultados.push({ arquivo, ok, passou, falhou, ms: Date.now() - t0 });
    console.log((ok ? '✅ ' : '❌ ') + arquivo + '  (' + passou + ' verificacoes, ' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    if (!ok) console.log(saida.split('\n').filter((l) => /❌|Error|ERRO/.test(l)).slice(0, 10).map((l) => '     ' + l).join('\n'));
}

const falhas = resultados.filter((r) => !r.ok);
const total = resultados.reduce((s, r) => s + r.passou, 0);
console.log('\n' + (falhas.length === 0 ? 'Tudo certo: ' : falhas.length + ' arquivo(s) com falha. ') + resultados.length + ' arquivos, ' + total + ' verificacoes passando.');
process.exit(falhas.length === 0 ? 0 : 1);
