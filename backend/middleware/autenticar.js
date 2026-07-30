// Hemare - "Porteiro": confere o token JWT antes de deixar acessar rotas protegidas.
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
    // O token vem no cabecalho: "Authorization: Bearer <token>".
    const cabecalho = req.headers['authorization'];
    const token = cabecalho && cabecalho.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: 'Token nao enviado. Faca login.' });
    }

    try {
        // Confere se o token e valido usando o mesmo segredo do login.
        const dados = jwt.verify(token, process.env.JWT_SECRET);
        // Guarda os dados do usuario no req, para a rota usar depois.
        req.usuario = dados;
        next(); // deixa passar para a rota.
    } catch (erro) {
        return res.status(401).json({ erro: 'Token invalido ou expirado.' });
    }
}

module.exports = autenticar;