// Hemare - Prepara o banco inteiro, na ordem certa, so com o que ainda nao foi feito.
//   npm run migrar                  roda o que falta (guarda o que ja rodou na tabela migracoes_aplicadas)
//   npm run migrar -- --todas       roda tudo de novo (seguro: todos os scripts podem repetir)
//   npm run migrar -- --listar      mostra a lista e o que ja foi aplicado, sem rodar nada
//   npm run migrar -- --marcar-aplicadas   so ANOTA tudo como aplicado, sem rodar (para um banco que voce ja montou na mao)
// Banco novo: basta isto. Banco que voce ja montou na mao: pode rodar sem medo, ele so confere e anota.
const path = require('path');
const { spawnSync } = require('child_process');
const pool = require('../banco');
const { MIGRACOES } = require('./ordem');

const RAIZ = path.join(__dirname, '..');

async function main() {
    const todas = process.argv.includes('--todas');
    const listar = process.argv.includes('--listar');
    const marcar = process.argv.includes('--marcar-aplicadas');

    await pool.query('CREATE TABLE IF NOT EXISTS migracoes_aplicadas (nome VARCHAR(80) PRIMARY KEY, aplicada_em TIMESTAMP DEFAULT NOW())');
    const feitas = new Set((await pool.query('SELECT nome FROM migracoes_aplicadas')).rows.map((r) => r.nome));

    if (marcar) {
        for (const m of MIGRACOES) await pool.query('INSERT INTO migracoes_aplicadas (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [m.arquivo]);
        console.log('✅ ' + MIGRACOES.length + ' scripts anotados como já aplicados. Os próximos (novos) rodam normalmente com `npm run migrar`.');
        return 0;
    }

    if (listar) {
        MIGRACOES.forEach((m, i) => console.log((feitas.has(m.arquivo) ? '✅' : '⬜') + ' ' + String(i + 1).padStart(2) + '. ' + m.arquivo + ' - ' + m.descricao));
        return 0;
    }

    let aplicadas = 0;
    for (const m of MIGRACOES) {
        if (!todas && feitas.has(m.arquivo)) { console.log('⏭️  ' + m.arquivo + ' (já aplicado)'); continue; }
        const r = spawnSync(process.execPath, [path.join('db', m.arquivo)], { cwd: RAIZ, encoding: 'utf8', env: process.env });
        const saida = (r.stdout || '') + (r.stderr || '');
        // Os scripts nao saem com erro quando falham: eles imprimem "❌". Por isso conferimos o texto tambem.
        if (r.status !== 0 || saida.includes('❌')) {
            console.log('❌ ' + m.arquivo + ' falhou:');
            console.log(saida.split('\n').filter((l) => l.trim()).map((l) => '   ' + l).join('\n'));
            console.log('\nCorrija o problema e rode `npm run migrar` de novo: o que já deu certo não se repete.');
            return 1;
        }
        await pool.query('INSERT INTO migracoes_aplicadas (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [m.arquivo]);
        console.log('✅ ' + m.arquivo + ' - ' + m.descricao);
        aplicadas++;
    }
    console.log('\n' + (aplicadas === 0 ? 'Tudo em dia: nada a aplicar.' : aplicadas + ' script(s) aplicado(s).'));
    return 0;
}

main()
    .then((codigo) => { process.exitCode = codigo; })
    .catch((erro) => { console.log('❌ Erro:', erro.message); process.exitCode = 1; })
    .finally(() => pool.end());
