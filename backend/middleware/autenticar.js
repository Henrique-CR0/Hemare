// Hemare - "Porteiro": confere o token JWT antes de deixar acessar rotas protegidas.
// Alem de a assinatura e a validade, confere se a sessao nao foi encerrada (troca de senha, exclusao da conta,
// "sair de todos os aparelhos"): ver servicos/sessoes.js.
const jwt = require('jsonwebtoken');
const sessoes = require('../servicos/sessoes');

async function autenticar(req, res, next) {
    // O token vem no cabecalho: "Authorization: Bearer <token>".
    const cabecalho = req.headers['authorization'];
    const token = cabecalho && cabecalho.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: 'Token nao enviado. Faca login.' });
    }

    let dados;
    try {
        // Confere se o token e valido usando o mesmo segredo do login.
        dados = jwt.verify(token, process.env.JWT_SECRET);
    } catch (erro) {
        return res.status(401).json({ erro: 'Token invalido ou expirado.' });
    }

    if (sessoes.tokenRevogado(dados, await sessoes.validaApos(dados.id))) {
        return res.status(401).json({ erro: 'Sua sessão foi encerrada. Faça login novamente.' });
    }

    // Guarda os dados do usuario no req, para a rota usar depois.
    req.usuario = dados;
    next(); // deixa passar para a rota.
}

module.exports = autenticar;
