// Hemare - Ambiente dos testes de ponta a ponta.
// Sobe o servidor de VERDADE (rotas, regras, migracoes), mas com um Postgres simulado em memoria (pg-mem) no lugar do Neon
// e com o envio de e-mail interceptado (nada sai para a internet, nada toca o banco real).
//
// Uso (em cada arquivo de testes/e2e):
//     const amb = require('../ambiente').criarAmbiente(3070);
//     await amb.iniciar(['criar-agendamentos.js']);
//     const t = await amb.conta('Ana', 'ana@x.com', 'doador');
//     amb.checar('descricao', condicao, dadoParaDebugar);
//     amb.concluir();
//
// Limites do pg-mem: sem UPDATE ... FROM, sem IS DISTINCT FROM, sem subconsulta correlacionada e ANY(int[]) nao casa
// nada. O codigo das rotas foi escrito para funcionar nos dois bancos (o de verdade e este).
process.env.TZ = 'UTC'; // datas do banco lidas como UTC: o resultado dos testes nao depende do fuso da maquina
const path = require('path');
const { newDb } = require('pg-mem');

const BACKEND = path.join(__dirname, '..');

// Tabelas base (as que os scripts db/criar-*.js do projeto criam antes das migracoes mais novas).
const ESQUEMA_BASE = `
  CREATE TABLE usuarios (id SERIAL PRIMARY KEY, nome VARCHAR(120) NOT NULL, email VARCHAR(120) UNIQUE NOT NULL,
    senha_hash VARCHAR(200) NOT NULL, tipo VARCHAR(20) NOT NULL, criado_em TIMESTAMP DEFAULT NOW());
  CREATE TABLE doadores (id SERIAL PRIMARY KEY, usuario_id INTEGER UNIQUE NOT NULL REFERENCES usuarios(id),
    tipo_sanguineo VARCHAR(50) NOT NULL, sexo VARCHAR(1) NOT NULL, cidade VARCHAR(100) NOT NULL, ultima_doacao DATE,
    visibilidade VARCHAR(20) DEFAULT 'anonimo', nome_social VARCHAR(120), cpf VARCHAR(14), telefone VARCHAR(20),
    total_doacoes INTEGER DEFAULT 0);
  CREATE TABLE hospitais (id SERIAL PRIMARY KEY, usuario_id INTEGER UNIQUE NOT NULL REFERENCES usuarios(id),
    cidade VARCHAR(100) NOT NULL, estado VARCHAR(2), endereco VARCHAR(200), aprovado BOOLEAN DEFAULT true,
    cnes VARCHAR(12), cnpj VARCHAR(18), cep VARCHAR(9), numero VARCHAR(10), bairro VARCHAR(100), complemento VARCHAR(100));
  CREATE TABLE necessidades (id SERIAL PRIMARY KEY, hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
    tipo_sanguineo VARCHAR(50) NOT NULL, tipo_doacao VARCHAR(20) DEFAULT 'sangue', urgencia VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'aberta', criada_em TIMESTAMP DEFAULT NOW());
  CREATE TABLE doacoes (id SERIAL PRIMARY KEY, doador_id INTEGER NOT NULL REFERENCES doadores(id),
    hospital_id INTEGER NOT NULL REFERENCES hospitais(id), data_doacao DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP DEFAULT NOW(), hash VARCHAR(64), hash_anterior VARCHAR(64));
  CREATE TABLE estoque (id SERIAL PRIMARY KEY, hospital_id INTEGER NOT NULL REFERENCES hospitais(id),
    tipo_sanguineo VARCHAR(3) NOT NULL, nivel VARCHAR(20) NOT NULL DEFAULT 'estavel', atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE (hospital_id, tipo_sanguineo));
`;

// Migracoes que entram em todo teste (idempotentes). Cada teste acrescenta as suas.
const MIGRACOES_BASE = [
    'ajustar-verificacao.js', 'ajustar-alertas.js', 'ajustar-lembretes.js', 'ajustar-indicacao.js', 'ajustar-perfil.js', 'ajustar-sessao.js', 'criar-recuperacao.js', 'criar-agendamentos.js'
];

function dormir(ms) { return new Promise((r) => setTimeout(r, ms)); }

// opcoes.doZero: banco totalmente vazio (sem o esquema base) para provar que a lista de db/ordem.js monta o sistema do zero.
function criarAmbiente(porta, opcoes) {
    const doZero = !!(opcoes && opcoes.doZero);
    process.env.JWT_SECRET = 'segredo-de-teste';
    process.env.PORT = String(porta);

    const db = newDb();
    if (!doZero) db.public.none(ESQUEMA_BASE);
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();

    // Troca o banco.js e o Resend do projeto pelos simulados.
    const bancoPath = require.resolve(path.join(BACKEND, 'banco.js'));
    require.cache[bancoPath] = { id: bancoPath, filename: bancoPath, loaded: true, exports: pool };
    const emails = [];
    const resendPath = require.resolve('resend', { paths: [BACKEND] });
    require.cache[resendPath] = {
        id: resendPath, filename: resendPath, loaded: true,
        exports: { Resend: class { constructor() { this.emails = { send: async (m) => { emails.push(m); return { data: { id: 'teste' } }; } }; } } }
    };

    const URL = 'http://localhost:' + porta;
    let falhas = 0;
    let total = 0;

    // Roda um script db/*.js (que termina chamando pool.end()) e espera ele acabar de verdade.
    async function rodarMigracao(nome) {
        const caminho = path.join(BACKEND, 'db', nome);
        const original = pool.end;
        const argv = process.argv;
        process.argv = [argv[0], nome];
        const log = console.log;
        console.log = () => {};
        try {
            await new Promise((resolve) => {
                pool.end = async () => resolve();
                delete require.cache[require.resolve(caminho)];
                require(caminho);
            });
        } finally {
            console.log = log;
            process.argv = argv;
            pool.end = original;
        }
    }

    async function iniciar(migracoes) {
        for (const nome of [...(doZero ? [] : MIGRACOES_BASE), ...(migracoes || [])]) await rodarMigracao(nome);
        const log = console.log;
        console.log = () => {};
        require(path.join(BACKEND, 'servidor.js'));
        console.log = log;
        await dormir(500);
    }

    function checar(descricao, ok, extra) {
        total++;
        if (!ok) falhas++;
        console.log((ok ? '✅' : '❌') + ' ' + descricao + (ok || extra === undefined ? '' : '  ->  ' + JSON.stringify(extra)));
    }

    async function api(metodo, rota, token, corpo) {
        const r = await fetch(URL + rota, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            body: corpo ? JSON.stringify(corpo) : undefined
        });
        let dados = null;
        try { dados = await r.json(); } catch (e) { dados = null; }
        return { status: r.status, dados, cabecalhos: r.headers };
    }

    // Cria a conta, entra e devolve o token.
    async function conta(nome, email, tipo, senha) {
        const s = senha || 'senha-forte-123';
        await api('POST', '/auth/cadastro', null, { nome, email, senha: s, tipo });
        return (await api('POST', '/auth/login', null, { email, senha: s })).dados.token;
    }

    function titulo(texto) { console.log('--- ' + texto + ' ---'); }

    // Termina o processo com o resultado (o servidor fica de pe, entao precisa do exit).
    function concluir() {
        console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM (' + total + ' verificacoes)' : '\n' + falhas + ' FALHA(S) em ' + total + ' verificacoes');
        process.exit(falhas === 0 ? 0 : 1);
    }

    return { BACKEND, URL, pool, emails, iniciar, checar, api, conta, titulo, concluir, dormir, rodarMigracao };
}

module.exports = { criarAmbiente };
