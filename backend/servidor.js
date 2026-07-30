// Hemare - Servidor principal (backend)
// Por enquanto ele so responde um "ola" para testarmos se esta tudo de pe.

const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares基础: liberar o frontend (cors) e entender JSON no corpo das requisicoes.
app.use(cors());
app.use(express.json());

// Rotas de autenticacao (cadastro e login).
const rotasAuth = require('./rotas/auth');
app.use('/auth', rotasAuth);

// Rotas do doador (perfil).
const rotasDoador = require('./rotas/doador');
app.use('/doador', rotasDoador);

// Rota de teste: quando alguem acessar a raiz, responde uma mensagem.
app.get('/', (req, res) => {
    res.json({ mensagem: 'Ola, Hemare! O backend esta funcionando.' });
});

// Liga o servidor na porta 3000.
const PORTA = 3000;
app.listen(PORTA, () => {
    console.log('Servidor Hemare rodando na porta ' + PORTA);
});