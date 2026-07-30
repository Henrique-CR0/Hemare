// Hemare - Rotas de autenticacao (cadastro e login).
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../banco');

const router = express.Router();


// CADASTRO: recebe nome, email, senha e tipo; salva o usuario com a senha embaralhada.
router.post('/cadastro', async (req, res) => {
    const { nome, email, senha, tipo } = req.body;

    // Confere se os campos obrigatorios vieram.
    if (!nome || !email || !senha || !tipo) {
        return res.status(400).json({ erro: 'Preencha nome, email, senha e tipo.' });
    }

    try {
        // Embaralha a senha (o "10" e a forca do embaralhamento).
        const senhaHash = await bcrypt.hash(senha, 10);

        // Salva no banco. O $1, $2... sao os valores (protege contra SQL injection).
        const resultado = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
            [nome, email, senhaHash, tipo]
        );

        res.status(201).json({ mensagem: 'Usuario cadastrado!', usuario: resultado.rows[0] });
    } catch (erro) {
        // Se o email ja existir, o banco reclama (codigo 23505 = valor duplicado).
        if (erro.code === '23505') {
            return res.status(409).json({ erro: 'Esse email ja esta cadastrado.' });
        }
        res.status(500).json({ erro: 'Erro ao cadastrar: ' + erro.message });
    }
});
// LOGIN: confere email e senha; se baterem, devolve um token JWT.
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Preencha email e senha.' });
    }

    try {
        // Procura o usuario pelo email.
        const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = resultado.rows[0];

        // Se nao achou, ou a senha nao bate: erro generico (nao dizemos qual dos dois errou).
        if (!usuario) {
            return res.status(401).json({ erro: 'Email ou senha invalidos.' });
        }

        const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaConfere) {
            return res.status(401).json({ erro: 'Email ou senha invalidos.' });
        }

        // Cria o token com os dados nao-secretos do usuario, valido por 1 dia.
        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            mensagem: 'Login realizado!',
            token: token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro no login: ' + erro.message });
    }
});

module.exports = router;