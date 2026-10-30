// Hemare - Regras de autenticacao: validacao de cadastro e senha, vida do token (login automatico) e limite de tentativas.
// Tudo aqui e puro (sem banco, sem Express), por isso e facil de testar e de reaproveitar.
const { TIPOS_CADASTRO } = require('./verificacao');

const SENHA_MIN = 8;
const SENHA_MAX_BYTES = 72;            // o bcrypt ignora tudo depois de 72 bytes: melhor recusar do que cortar em silencio
const NOME_MIN = 2, NOME_MAX = 120, EMAIL_MAX = 120;

const VIDA_NORMAL_DIAS = 1;            // sessao comum: 1 dia
const VIDA_LEMBRAR_DIAS = 7;           // "manter conectado": 7 dias (renovando enquanto a pessoa usa)

// Senhas que todo mundo tenta primeiro (em minusculas).
const SENHAS_FRACAS = [
    '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '123123123', 'abcd1234', 'abc12345',
    'qwertyui', 'qwerty123', 'password', 'password1', 'senha123', 'senha1234', 'senhasenha', 'mudar123', 'hemare123', 'brasil123'
];

function normalizarEmail(texto) {
    return typeof texto === 'string' ? texto.trim().toLowerCase() : '';
}

function emailValido(email) {
    return typeof email === 'string' && email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Confere a senha. contexto: { email, nome } (opcional): senha igual ao e-mail ou ao nome e recusada.
// Devolve { erro } ou { ok: true }.
function validarSenha(senha, contexto) {
    if (typeof senha !== 'string' || senha.length === 0) return { erro: 'Informe a senha.' };
    if (senha.length < SENHA_MIN) return { erro: 'A senha deve ter pelo menos ' + SENHA_MIN + ' caracteres.' };
    if (Buffer.byteLength(senha, 'utf8') > SENHA_MAX_BYTES) return { erro: 'A senha é longa demais (máximo de ' + SENHA_MAX_BYTES + ' bytes).' };
    const minuscula = senha.toLowerCase();
    if (SENHAS_FRACAS.includes(minuscula) || /^(.)\1+$/.test(senha)) return { erro: 'Essa senha é fácil demais de adivinhar. Escolha outra.' };
    const c = contexto || {};
    const email = normalizarEmail(c.email);
    const nome = typeof c.nome === 'string' ? c.nome.trim().toLowerCase() : '';
    if ((email && (minuscula === email || minuscula === email.split('@')[0])) || (nome && minuscula === nome)) {
        return { erro: 'A senha não pode ser igual ao seu e-mail ou ao seu nome.' };
    }
    return { ok: true };
}

// Confere o cadastro. Devolve { erro } ou { dados } ja limpo (e-mail em minusculas, nome sem espacos sobrando).
function validarCadastro(corpo) {
    const c = corpo || {};
    const nome = typeof c.nome === 'string' ? c.nome.replace(/\s+/g, ' ').trim() : '';
    if (nome.length < NOME_MIN || nome.length > NOME_MAX || /[\u0000-\u001f<>]/.test(nome)) {
        return { erro: 'Informe o nome (de ' + NOME_MIN + ' a ' + NOME_MAX + ' caracteres, sem símbolos como < ou >).' };
    }
    const email = normalizarEmail(c.email);
    if (!emailValido(email)) return { erro: 'Informe um e-mail válido.' };
    if (!TIPOS_CADASTRO.includes(c.tipo)) return { erro: 'Tipo de conta inválido.' };
    const senha = validarSenha(c.senha, { email, nome });
    if (senha.erro) return { erro: senha.erro };
    return { dados: { nome, email, senha: c.senha, tipo: c.tipo, codigoIndicacao: c.codigoIndicacao } };
}

// Quanto dura o token: { expiresIn (para o jsonwebtoken), segundos }.
function vidaDoToken(lembrar) {
    const dias = lembrar === true ? VIDA_LEMBRAR_DIAS : VIDA_NORMAL_DIAS;
    return { expiresIn: dias + 'd', segundos: dias * 86400 };
}

// Login automatico: o site renova o token em silencio quando passou da metade da vida dele.
// payload: { iat, exp } em segundos (como no JWT).  agora: ms.
function deveRenovar(payload, agora) {
    if (!payload || !payload.iat || !payload.exp) return false;
    const restante = payload.exp - Math.floor((agora === undefined ? Date.now() : agora) / 1000);
    return restante > 0 && restante < (payload.exp - payload.iat) / 2;
}

// Limite de tentativas ERRADAS por chave (e-mail, por exemplo), em memoria:
//   const limite = criarLimite({ maximo: 8, janelaMs: 15 * 60 * 1000 });
//   limite.bloqueio('ana@x.com')   -> { bloqueado, segundos }
//   limite.falha('ana@x.com')      registra uma tentativa errada
//   limite.limpar('ana@x.com')     zera (acertou a senha)
// Passou do maximo dentro da janela, a chave fica bloqueada ate a janela acabar. Roda em um processo so (com varios,
// cada um conta o seu; para varios servidores o certo e guardar isto no Redis).
function criarLimite({ maximo, janelaMs }) {
    const mapa = new Map(); // chave -> { quantidade, desde }

    function limparVelhos(agora) {
        if (mapa.size < 1000) return;
        for (const [chave, v] of mapa) if (agora - v.desde >= janelaMs) mapa.delete(chave);
    }

    function atual(chave, agora) {
        const v = mapa.get(chave);
        if (!v) return null;
        if (agora - v.desde >= janelaMs) { mapa.delete(chave); return null; }
        return v;
    }

    return {
        bloqueio(chave, agora) {
            const t = agora === undefined ? Date.now() : agora;
            const v = atual(chave, t);
            if (!v || v.quantidade < maximo) return { bloqueado: false, segundos: 0 };
            return { bloqueado: true, segundos: Math.max(1, Math.ceil((v.desde + janelaMs - t) / 1000)) };
        },
        falha(chave, agora) {
            const t = agora === undefined ? Date.now() : agora;
            limparVelhos(t);
            const v = atual(chave, t);
            if (v) v.quantidade++; else mapa.set(chave, { quantidade: 1, desde: t });
        },
        limpar(chave) { mapa.delete(chave); },
        tamanho() { return mapa.size; }
    };
}

function mensagemDeEspera(segundos) {
    const minutos = Math.ceil(segundos / 60);
    return 'Muitas tentativas. Tente de novo em ' + (minutos <= 1 ? 'alguns instantes' : minutos + ' minutos') + '.';
}

module.exports = {
    SENHA_MIN, SENHA_MAX_BYTES, VIDA_NORMAL_DIAS, VIDA_LEMBRAR_DIAS, normalizarEmail, emailValido, validarSenha, validarCadastro,
    vidaDoToken, deveRenovar, criarLimite, mensagemDeEspera
};
