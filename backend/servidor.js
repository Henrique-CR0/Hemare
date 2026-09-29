// Hemare - Servidor principal (backend)
// Liga a API REST e registra todas as rotas.

const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares: liberar o frontend (cors) e entender JSON no corpo das requisicoes.
app.use(cors());
app.use(express.json());

// Rotas de autenticacao (cadastro e login).
const rotasAuth = require('./rotas/auth');
app.use('/auth', rotasAuth);

// Rotas do doador (perfil).
const rotasDoador = require('./rotas/doador');
app.use('/doador', rotasDoador);

// Rotas dos locais de doacao (lista publica).
const rotasLocais = require('./rotas/locais');
app.use('/locais', rotasLocais);

// Rotas do hospital.
const rotasHospital = require('./rotas/hospital');
app.use('/hospital', rotasHospital);

// Rotas de recuperacao de senha.
const rotasRecuperacao = require('./rotas/recuperacao');
app.use('/recuperacao', rotasRecuperacao);

// Rotas do radar preditivo.
const rotasRadar = require('./rotas/radar');
app.use('/radar', rotasRadar);

// Rotas do "clima" do sangue (previsao por regiao).
const rotasClima = require('./rotas/clima');
app.use('/clima', rotasClima);

// Rota de teste: quando alguem acessar a raiz, responde uma mensagem.
app.get('/', (req, res) => {
    res.json({ mensagem: 'Ola, Hemare! O backend esta funcionando.' });
});

// Liga o servidor (porta 3000, ou a definida em PORT no .env).
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log('Servidor Hemare rodando na porta ' + PORTA);
});
