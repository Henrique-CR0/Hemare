// Hemare - Em producao, resposta 500 nao vaza detalhe interno.
// Muitas rotas respondem "Erro ao salvar: <mensagem do banco>", que ajuda a depurar mas entrega nome de tabela, de coluna
// e pedaco de SQL para quem estiver olhando. Com NODE_ENV=production a pessoa recebe uma frase generica e o detalhe vai
// para o log do servidor. Mensagens que ensinam a rodar a migracao ("rode db/...") continuam, porque nao revelam nada.
const GENERICA = 'Erro inesperado no servidor. Tente de novo em instantes.';

function esconderDetalhes500(req, res, next) {
    const original = res.json.bind(res);
    res.json = (corpo) => {
        const producao = process.env.NODE_ENV === 'production';
        if (producao && res.statusCode >= 500 && corpo && typeof corpo.erro === 'string' && !/rode db\//.test(corpo.erro)) {
            console.error('[' + req.method + ' ' + req.path + '] ' + corpo.erro);
            return original({ erro: GENERICA });
        }
        return original(corpo);
    };
    next();
}

module.exports = { esconderDetalhes500, GENERICA };
