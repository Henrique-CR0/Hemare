// Testes das regras do canal de noticias. Rode: node regras/testar-noticias.js
const { UFS, NIVEIS, normalizarUf, urlSegura, validarNoticia, nivelDosSinais, montarPanorama } = require('./noticias');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

console.log('--- Estados ---');
verificar('27 unidades da federacao', UFS.length, 27);
verificar('siglas sem repeticao', new Set(UFS.map((e) => e.sigla)).size, 27);
verificar('normaliza "pe"', normalizarUf(' pe '), 'PE');
verificar('recusa sigla inexistente', normalizarUf('XX'), null);
verificar('recusa nao-texto', normalizarUf(12), null);

console.log('--- Links ---');
verificar('aceita https', urlSegura('https://agenciabrasil.ebc.com.br/x'), 'https://agenciabrasil.ebc.com.br/x');
verificar('aceita http', urlSegura('http://exemplo.com.br/a'), 'http://exemplo.com.br/a');
verificar('recusa javascript:', urlSegura('javascript:alert(1)'), null);
verificar('recusa data:', urlSegura('data:text/html,<script>1</script>'), null);
verificar('recusa texto solto', urlSegura('exemplo.com'), null);
verificar('recusa link enorme', urlSegura('https://x.com/' + 'a'.repeat(600)), null);

console.log('--- Cadastro do aviso ---');
const valido = {
    uf: 'pe', titulo: 'Hemope pede reforço nos estoques', resumo: 'O hemocentro pediu novas doações para todos os tipos sanguíneos.',
    fonte: 'Folha de Pernambuco', url: 'https://www.folhape.com.br/x', nivel: 'critico', referencia: 'set/2026'
};
verificar('aviso valido', validarNoticia(valido).noticia, {
    uf: 'PE', titulo: 'Hemope pede reforço nos estoques', resumo: 'O hemocentro pediu novas doações para todos os tipos sanguíneos.',
    fonte: 'Folha de Pernambuco', url: 'https://www.folhape.com.br/x', nivel: 'critico', referencia: 'set/2026'
});
verificar('estado invalido', typeof validarNoticia({ ...valido, uf: 'ZZ' }).erro, 'string');
verificar('titulo curto', typeof validarNoticia({ ...valido, titulo: 'Oi' }).erro, 'string');
verificar('resumo longo demais', typeof validarNoticia({ ...valido, resumo: 'x'.repeat(401) }).erro, 'string');
verificar('resumo curto demais', typeof validarNoticia({ ...valido, resumo: 'curto' }).erro, 'string');
verificar('sem fonte', typeof validarNoticia({ ...valido, fonte: '' }).erro, 'string');
verificar('link javascript recusado', typeof validarNoticia({ ...valido, url: 'javascript:alert(1)' }).erro, 'string');
verificar('nivel invalido', typeof validarNoticia({ ...valido, nivel: 'pessimo' }).erro, 'string');
verificar('sem nivel: "sem-dados"', validarNoticia({ ...valido, nivel: undefined }).noticia.nivel, 'sem-dados');
verificar('sem referencia: null', validarNoticia({ ...valido, referencia: '' }).noticia.referencia, null);
verificar('espacos extras sao limpos', validarNoticia({ ...valido, titulo: '  Hemope   pede reforço  nos estoques ' }).noticia.titulo, 'Hemope pede reforço nos estoques');
verificar('corpo vazio nao quebra', typeof validarNoticia(undefined).erro, 'string');

console.log('--- Sinais do Hemare ---');
const sem = { hospitais: 0, estoque: { critico: 0, alerta: 0, total: 0 }, necessidadesUrgentes: 0 };
verificar('sem hospitais: sem dados', nivelDosSinais(sem), 'sem-dados');
verificar('sem objeto: sem dados', nivelDosSinais(null), 'sem-dados');
verificar('estoque critico', nivelDosSinais({ ...sem, hospitais: 1, estoque: { critico: 2, alerta: 0, total: 8 } }), 'critico');
verificar('pedido urgente aberto', nivelDosSinais({ ...sem, hospitais: 1, necessidadesUrgentes: 1, estoque: { critico: 0, alerta: 0, total: 8 } }), 'critico');
verificar('estoque em alerta', nivelDosSinais({ ...sem, hospitais: 1, estoque: { critico: 0, alerta: 3, total: 8 } }), 'alerta');
verificar('tudo estavel', nivelDosSinais({ ...sem, hospitais: 1, estoque: { critico: 0, alerta: 0, total: 8 } }), 'estavel');
verificar('hospital sem estoque informado: sem dados', nivelDosSinais({ ...sem, hospitais: 1 }), 'sem-dados');

console.log('--- Panorama ---');
const noticias = {
    PE: [{ id: 9, nivel: 'estavel' }, { id: 2, nivel: 'critico' }],   // mais recente primeiro: estavel vale
    SP: [{ id: 5, nivel: 'critico' }],
    AL: [{ id: 6, nivel: 'alerta' }]
};
const sinais = { AL: { hospitais: 1, estoque: { critico: 1, alerta: 0, total: 4 }, necessidadesUrgentes: 0 } };
const p = montarPanorama(noticias, sinais);
verificar('sempre 27 estados', p.estados.length, 27);
verificar('critico primeiro (SP e AL, por nome)', p.estados.slice(0, 2).map((e) => e.sigla), ['AL', 'SP']);
verificar('AL: pior entre aviso (alerta) e Hemare (critico)', p.estados.find((e) => e.sigla === 'AL').nivel, 'critico');
verificar('PE: aviso mais recente (estavel) substitui o antigo', p.estados.find((e) => e.sigla === 'PE').nivel, 'estavel');
verificar('estado sem nada: sem dados', p.estados.find((e) => e.sigla === 'AC').nivel, 'sem-dados');
verificar('contagem por nivel', p.contagem, { critico: 2, alerta: 0, atencao: 0, estavel: 1, 'sem-dados': 24 });
verificar('contagem soma 27', NIVEIS.reduce((s, n) => s + p.contagem[n], 0), 27);
verificar('sem argumentos nao quebra', montarPanorama().estados.length, 27);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
