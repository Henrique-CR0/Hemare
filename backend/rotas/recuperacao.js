// Hemare - Rotas de recuperacao de senha (pedir codigo e redefinir).
//   POST /recuperacao/pedir      manda um codigo de 6 digitos por e-mail (responde igual exista a conta ou nao)
//   POST /recuperacao/redefinir  confere o codigo e troca a senha (e encerra as sessoes antigas)
// O codigo e sorteado com crypto (nao com Math.random) e as tentativas erradas tem limite: 6 digitos sao so 1 milhao de
// combinacoes, entao sem limite um robo acertaria dentro dos 15 minutos de validade.
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const { Resend } = require('resend');
const pool = require('../banco');
const R = require('../regras/auth');
const { escaparHtml } = require('../regras/html');
const sessoes = require('../servicos/sessoes');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const limitePedidos = R.criarLimite({ maximo: 5, janelaMs: 60 * 60 * 1000 });     // 5 e-mails por hora, por conta
const limiteCodigos = R.criarLimite({ maximo: 5, janelaMs: 15 * 60 * 1000 });     // 5 codigos errados em 15 min, por conta

// PEDIR RECUPERACAO: gera um codigo, salva e envia por email.
router.post('/pedir', async (req, res) => {
    const email = R.normalizarEmail(req.body && req.body.email);
    if (!email) return res.status(400).json({ erro: 'Informe o email.' });
    const resposta = { mensagem: 'Se este email tiver conta, enviaremos um código.' };

    try {
        // Por seguranca, respondemos "ok" mesmo se o email nao existir (nao revela quem tem conta).
        const rUser = await pool.query("SELECT id, nome, email FROM usuarios WHERE LOWER(email) = $1 AND tipo <> 'removido'", [email]);
        if (rUser.rows.length === 0) return res.json(resposta);
        const usuario = rUser.rows[0];

        // Muitos pedidos seguidos: nao manda mais e-mails (evita encher a caixa de alguem), mas a resposta continua igual.
        if (limitePedidos.bloqueio(email).bloqueado) return res.json(resposta);
        limitePedidos.falha(email);

        // Gera um codigo de 6 digitos.
        const codigo = String(crypto.randomInt(100000, 1000000));
        const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await pool.query(
            'INSERT INTO recuperacao_senha (usuario_id, codigo, expira_em) VALUES ($1, $2, $3)',
            [usuario.id, codigo, expira]
        );

        // Envia o email com o codigo.
        await resend.emails.send({
            from: 'Hemare <onboarding@resend.dev>',
            to: usuario.email,
            subject: 'Código de recuperação de senha - Hemare 🩸',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #c8102e;">🩸 Hemare</h2>
                    <p>Olá, ${escaparHtml(usuario.nome)}!</p>
                    <p>Você pediu para redefinir sua senha. Use o código abaixo:</p>
                    <div style="background:#fdeaec; color:#c8102e; font-size:32px; font-weight:bold; letter-spacing:6px; text-align:center; padding:16px; border-radius:10px; margin:16px 0;">
                        ${codigo}
                    </div>
                    <p style="color:#666; font-size:13px;">O código expira em 15 minutos. Se não foi você, ignore este email.</p>
                </div>
            `
        });

        res.json(resposta);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao processar: ' + erro.message });
    }
});

// REDEFINIR: confere o codigo e troca a senha.
router.post('/redefinir', async (req, res) => {
    const email = R.normalizarEmail(req.body && req.body.email);
    const codigo = req.body && req.body.codigo;
    const novaSenha = req.body && req.body.novaSenha;
    if (!email || !codigo || !novaSenha) {
        return res.status(400).json({ erro: 'Preencha email, código e nova senha.' });
    }

    const bloqueio = limiteCodigos.bloqueio(email);
    if (bloqueio.bloqueado) return res.status(429).set('Retry-After', String(bloqueio.segundos)).json({ erro: R.mensagemDeEspera(bloqueio.segundos) });

    const conferida = R.validarSenha(novaSenha, { email });
    if (conferida.erro) return res.status(400).json({ erro: conferida.erro.replace('A senha deve', 'A nova senha deve') });

    try {
        const rUser = await pool.query("SELECT id, nome FROM usuarios WHERE LOWER(email) = $1 AND tipo <> 'removido'", [email]);
        if (rUser.rows.length === 0) {
            limiteCodigos.falha(email);
            return res.status(400).json({ erro: 'Código ou email inválido.' });
        }
        const usuarioId = rUser.rows[0].id;

        // Procura um codigo valido: certo, nao usado e nao expirado.
        const rCod = await pool.query(
            `SELECT id FROM recuperacao_senha
             WHERE usuario_id = $1 AND codigo = $2 AND usado = false AND expira_em > $3
             ORDER BY criado_em DESC LIMIT 1`,
            [usuarioId, String(codigo), new Date()]
        );
        if (rCod.rows.length === 0) {
            limiteCodigos.falha(email);
            return res.status(400).json({ erro: 'Código inválido ou expirado.' });
        }

        // Troca a senha, marca o codigo como usado e encerra todas as sessoes antigas (quem tinha a senha velha sai).
        const senhaHash = await bcrypt.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, usuarioId]);
        await pool.query('UPDATE recuperacao_senha SET usado = true WHERE usuario_id = $1', [usuarioId]);
        await sessoes.revogarTodas(usuarioId);
        limiteCodigos.limpar(email);

        res.json({ mensagem: 'Senha redefinida com sucesso! Já pode entrar.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao redefinir: ' + erro.message });
    }
});

module.exports = router;
