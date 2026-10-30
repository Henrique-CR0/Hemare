// Teste do middleware que esconde detalhe interno nas respostas 500 em producao. Rode: node testes/estrutura/erros500.js
const { esconderDetalhes500, GENERICA } = require('../../middleware/erros500');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

// Resposta falsa: guarda o que foi enviado.
function responder(statusCode, corpo, producao) {
    const antes = process.env.NODE_ENV;
    process.env.NODE_ENV = producao ? 'production' : 'development';
    const enviados = [];
    const res = { statusCode, json(c) { enviados.push(c); return this; } };
    const log = console.error;
    const logados = [];
    console.error = (...a) => logados.push(a.join(' '));
    try {
        esconderDetalhes500({ method: 'POST', path: '/x' }, res, () => {});
        res.json(corpo);
    } finally {
        console.error = log;
        process.env.NODE_ENV = antes;
    }
    return { enviado: enviados[0], logado: logados };
}

const detalhe = { erro: 'Erro ao salvar: duplicate key value violates unique constraint "usuarios_email_key"' };
let r = responder(500, detalhe, true);
verificar('producao + 500: devolve frase generica', r.enviado, { erro: GENERICA });
verificar('producao + 500: o detalhe vai para o log do servidor', r.logado.length === 1 && /duplicate key/.test(r.logado[0]) && /POST \/x/.test(r.logado[0]), true);
r = responder(500, detalhe, false);
verificar('desenvolvimento + 500: mostra o detalhe (ajuda a depurar)', r.enviado, detalhe);
r = responder(400, { erro: 'Preencha o nome.' }, true);
verificar('producao + 400: mensagem para a pessoa continua igual', r.enviado, { erro: 'Preencha o nome.' });
r = responder(409, { erro: 'Esse email ja esta cadastrado.' }, true);
verificar('producao + 409: continua igual', r.enviado, { erro: 'Esse email ja esta cadastrado.' });
const migracao = { erro: 'A rede de sangue raro ainda nao foi ativada no banco (rode db/ajustar-raros.js).' };
r = responder(500, migracao, true);
verificar('producao + 500 que ensina a rodar a migracao: mantem a dica', r.enviado, migracao);
r = responder(500, { mensagem: 'sem campo erro' }, true);
verificar('500 sem campo "erro": nao mexe', r.enviado, { mensagem: 'sem campo erro' });
r = responder(500, null, true);
verificar('corpo nulo nao quebra', r.enviado, null);
r = responder(200, { ok: true }, true);
verificar('200 nunca e alterado', r.enviado, { ok: true });

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
