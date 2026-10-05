// Hemare - Servidor principal (backend)
// Liga a API REST e registra todas as rotas.

const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares: liberar o frontend (cors) e entender JSON no corpo das requisicoes.
app.use(cors());
// Limite maior que o padrao (100kb) so para caber a foto de perfil, que chega reduzida (~256x256).
app.use(express.json({ limit: '200kb' }));

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

// Rotas do administrador (verificacao de hospitais).
const rotasAdmin = require('./rotas/admin');
app.use('/admin', rotasAdmin);

// Rotas do apadrinhamento de pacientes com necessidade recorrente de sangue.
const rotasApadrinhamento = require('./rotas/apadrinhamento');
app.use('/apadrinhamento', rotasApadrinhamento);

// Rotas das campanhas de reposicao ("Quem doa por mim").
const rotasCampanha = require('./rotas/campanha');
app.use('/campanha', rotasCampanha);

// Canal de noticias por estado (avisos curados + sinais dos hospitais do Hemare).
const rotasNoticias = require('./rotas/noticias');
app.use('/noticias', rotasNoticias);

// Perfil do doador (dados pessoais, foto, privacidade, exportar e excluir).
const rotasPerfil = require('./rotas/perfil');
app.use('/perfil', rotasPerfil);

// Rede de sangue raro (doadores de fenotipos raros, chamados de emergencia protegidos).
const rotasRaros = require('./rotas/raros');
app.use('/raros', rotasRaros);

// Ficha PcD (declaracao no perfil e orientacao de triagem para pessoas com deficiencia).
const rotasPcd = require('./rotas/pcd');
app.use('/pcd', rotasPcd);

// Calendario do sangue (feriados prolongados, plano do doador e chamada "doe antes do feriado").
const rotasFeriados = require('./rotas/feriados');
app.use('/feriados', rotasFeriados);

// Rota de teste: quando alguem acessar a raiz, responde uma mensagem.
app.get('/', (req, res) => {
    res.json({ mensagem: 'Ola, Hemare! O backend esta funcionando.' });
});

// Liga o servidor (porta 3000, ou a definida em PORT no .env).
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log('Servidor Hemare rodando na porta ' + PORTA);
});

// Tarefa automatica: lembrete "voce ja pode doar de novo" (ao ligar e a cada 12h).
const { agendarLembretes } = require('./tarefas/lembretes');
agendarLembretes();

// Tarefa automatica: aviso "doe antes do feriado" para quem pediu (ao ligar e a cada 12h).
const { agendarAvisosFeriado } = require('./tarefas/avisosFeriado');
agendarAvisosFeriado();
