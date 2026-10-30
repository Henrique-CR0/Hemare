// Teste do leitor de Markdown do frontend (usado na pagina "Status do desenvolvimento") e do relatorio docs/STATUS.md de verdade.
// O arquivo do frontend e modulo ES; aqui ele e importado direto. Rode: node testes/estrutura/markdown-frontend.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let falhas = 0, total = 0;
function verificar(descricao, obtido, esperado) {
    total++;
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const RAIZ = path.join(__dirname, '..', '..', '..');

async function main() {
    const { blocos, trechos } = await import(pathToFileURL(path.join(RAIZ, 'frontend', 'src', 'regras', 'markdown.js')).href);
    const texto = (lista) => lista.map((t) => (t.texto !== undefined ? t.texto : texto(t.filhos))).join('');

    console.log('--- Trechos ---');
    verificar('negrito, codigo e italico', trechos('um **forte** e `cod` e _suave_').map((t) => t.tipo), ['texto', 'negrito', 'texto', 'codigo', 'texto', 'italico']);
    verificar('link https vira link', trechos('veja [o site](https://exemplo.com/a?b=1)')[1], { tipo: 'link', url: 'https://exemplo.com/a?b=1', filhos: [{ tipo: 'texto', texto: 'o site' }] });
    verificar('link javascript: vira so texto (nunca um link)', trechos('[clique](javascript:alert(1))').every((t) => t.tipo === 'texto'), true);
    verificar('link data: vira so texto', trechos('[x](data:text/html,<script>1</script>)').every((t) => t.tipo === 'texto'), true);
    verificar('link relativo vira so texto', trechos('[x](/admin)').map((t) => t.tipo), ['texto']);
    verificar('negrito com link dentro', trechos('**veja [aqui](https://a.com)**')[0].filhos.map((t) => t.tipo), ['texto', 'link']);
    verificar('underline dentro de palavra nao e italico (docs/NOTICIAS_x_y)', trechos('arquivo_com_sublinhado_aqui').map((t) => t.tipo), ['texto']);
    verificar('tag <script> fica como texto (o React escapa)', texto(trechos('<script>alert(1)</script>')), '<script>alert(1)</script>');

    console.log('--- Blocos ---');
    const b = blocos('# Titulo\n\n> aviso **forte**\n\nparagrafo em\nduas linhas\n\n- a\n- b\n\n1. um\n2. dois\n\n---\n\n| A | B |\n|---|:-:|\n| 1 | **2** |\n| 3 | 4 |\n');
    verificar('tipos na ordem', b.map((x) => x.tipo), ['titulo', 'citacao', 'paragrafo', 'lista', 'lista', 'linha', 'tabela']);
    verificar('paragrafo junta as linhas', texto(b[2].filhos), 'paragrafo em duas linhas');
    verificar('lista simples e numerada', [b[3].ordenada, b[3].itens.length, b[4].ordenada, b[4].itens.length], [false, 2, true, 2]);
    verificar('tabela: cabecalho e 2 linhas (o separador some)', [b[6].cabecalho.length, b[6].linhas.length, texto(b[6].linhas[0][1])], [2, 2, '2']);
    verificar('comentario HTML e ignorado', blocos('antes\n<!-- segredo -->\ndepois').map((x) => texto(x.filhos)).join('|').includes('segredo'), false);
    verificar('texto vazio ou nulo nao quebra', [blocos(''), blocos(null)], [[], []]);
    verificar('linha com "|" solta (sem separador) e paragrafo, nao tabela', blocos('| so uma linha |')[0].tipo, 'paragrafo');

    console.log('--- O relatorio de verdade (docs/STATUS.md) ---');
    const relatorio = fs.readFileSync(path.join(RAIZ, 'docs', 'STATUS.md'), 'utf8');
    const r = blocos(relatorio);
    verificar('comeca pelo titulo', [r[0].tipo, texto(r[0].filhos)], ['titulo', 'Status Report do Desenvolvimento']);
    verificar('tem as secoes combinadas (titulos de nivel 2)', r.filter((x) => x.tipo === 'titulo' && x.nivel === 2).length >= 7, true);
    verificar('tem tabelas e todas com o mesmo numero de colunas em cada linha', r.filter((x) => x.tipo === 'tabela').length >= 5
        && r.filter((x) => x.tipo === 'tabela').every((t) => t.linhas.every((l) => l.length === t.cabecalho.length)), true);
    verificar('nenhuma marca do Markdown sobrou no texto (** ou |---)', !r.some((x) => /\*\*|\|---/.test(JSON.stringify(x.filhos || x.itens || ''))), true);
    verificar('as marcas do bloco de numeros nao aparecem na tela', !JSON.stringify(r).includes('numeros:inicio'), true);
    verificar('so links https (um link relativo nao funciona dentro do site)', !/\]\(\s*(?!https?:)/.test(relatorio.replace(/`[^`]*`/g, '')), true);

    console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM (' + total + ' verificacoes)' : '\n' + falhas + ' FALHA(S) em ' + total + ' verificacoes');
    process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
