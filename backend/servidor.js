// Hemare - Servidor principal (backend)
// Liga a API REST e registra todas as rotas.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Sem segredo do JWT os tokens nao teriam assinatura de verdade: melhor nao ligar do que ligar inseguro.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 8) {
    console.error('❌ Defina JWT_SECRET no arquivo .env (pelo menos 8 caracteres) antes de ligar o servidor.');
    process.exit(1);
}

const app = express();
app.disable('x-powered-by');

// Cabecalhos de seguranca basicos (sem dependencia extra).
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// CORS: se FRONTEND_URL estiver definido (ex.: https://hemare.com.br, varios separados por virgula), so esses sites podem
// chamar a API pelo navegador (mais o localhost, para desenvolver). Sem FRONTEND_URL fica aberto, como antes.
const origensPermitidas = String(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors(origensPermitidas.length === 0 ? undefined : {
    origin(origem, retorno) {
        const permitida = !origem || origensPermitidas.includes(origem) || /^http:\/\/localhost(:\d+)?$/.test(origem);
        retorno(null, permitida);
    }
}));

// Em producao, erro 500 nao mostra detalhe interno (vai para o log).
const { esconderDetalhes500 } = require('./middleware/erros500');
app.use(esconderDetalhes500);

// Middlewares: entender JSON no corpo das requisicoes.
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

// Agendamento de doacao: agenda do hospital, agendamentos do doador e historico "Minhas doacoes".
const rotasAgenda = require('./rotas/agenda');
app.use('/agenda', rotasAgenda);
const rotasAgendamentos = require('./rotas/agendamentos');
app.use('/agendamentos', rotasAgendamentos);
const rotasHistorico = require('./rotas/historico');
app.use('/historico', rotasHistorico);

// Rota de teste: quando alguem acessar a raiz, responde uma mensagem.
app.get('/', (req, res) => {
    res.json({ mensagem: 'Ola, Hemare! O backend esta funcionando.' });
});

// Saude da API (para monitoramento e para conferir que o servidor esta de pe).
app.get('/saude', (req, res) => {
    res.json({ status: 'ok', hora: new Date().toISOString() });
});

// Rota que nao existe: resposta em JSON (e nao a pagina HTML padrao do Express).
app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada: ' + req.method + ' ' + req.path });
});

// Erro nao tratado (JSON mal formado, corpo grande demais...): resposta em JSON, sem vazar detalhe interno.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'O corpo da requisição é grande demais.' });
    console.error('Erro inesperado em ' + req.method + ' ' + req.path + ':', err.message);
    res.status(500).json({ erro: 'Erro inesperado no servidor.' });
});

// Liga o servidor (porta 3000, ou a definida em PORT no .env).
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log('Servidor Hemare rodando na porta ' + PORTA);
});

// Tarefa automatica: lembrete "voce ja pode doar de novo" (ao ligar e a cada 12h).
const { agendarLembretes } = require('./tarefas/lembretes');
agendarLembretes();

// Tarefa automatica: lembrete de agendamento (doacoes marcadas para as proximas ~26 horas).
const { agendarLembretesDeAgendamento } = require('./tarefas/lembreteAgendamento');
agendarLembretesDeAgendamento();
