// Hemare - Rotas de recuperacao de senha (pedir codigo e redefinir).
const express = require('express');
const bcrypt = require('bcrypt');
const { Resend } = require('resend');
const pool = require('../banco');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// PEDIR RECUPERACAO: gera um codigo, salva e envia por email.
router.post('/pedir', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'Informe o email.' });

    try {
        const rUser = await pool.query('SELECT id, nome FROM usuarios WHERE email = $1', [email]);

        // Por seguranca, respondemos "ok" mesmo se o email nao existir (nao revela quem tem conta).
        if (rUser.rows.length === 0) {
            return res.json({ mensagem: 'Se este email tiver conta, enviaremos um código.' });
        }
        const usuario = rUser.rows[0];

        // Gera um codigo de 6 digitos.
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await pool.query(
            'INSERT INTO recuperacao_senha (usuario_id, codigo, expira_em) VALUES ($1, $2, $3)',
            [usuario.id, codigo, expira]
        );

        // Envia o email com o codigo.
        await resend.emails.send({
            from: 'Hemare <onboarding@resend.dev>',
            to: email,
            subject: 'Código de recuperação de senha - Hemare 🩸',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #c8102e;">🩸 Hemare</h2>
                    <p>Olá, ${usuario.nome}!</p>
                    <p>Você pediu para redefinir sua senha. Use o código abaixo:</p>
                    <div style="background:#fdeaec; color:#c8102e; font-size:32px; font-weight:bold; letter-spacing:6px; text-align:center; padding:16px; border-radius:10px; margin:16px 0;">
                        ${codigo}
                    </div>
                    <p style="color:#666; font-size:13px;">O código expira em 15 minutos. Se não foi você, ignore este email.</p>
                </div>
            `
        });

        res.json({ mensagem: 'Se este email tiver conta, enviaremos um código.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao processar: ' + erro.message });
    }
});

// REDEFINIR: confere o codigo e troca a senha.
router.post('/redefinir', async (req, res) => {
    const { email, codigo, novaSenha } = req.body;
    if (!email || !codigo || !novaSenha) {
        return res.status(400).json({ erro: 'Preencha email, código e nova senha.' });
    }
    if (novaSenha.length < 8) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }

    try {
        const rUser = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (rUser.rows.length === 0) {
            return res.status(400).json({ erro: 'Código ou email inválido.' });
        }
        const usuarioId = rUser.rows[0].id;

        // Procura um codigo valido: certo, nao usado e nao expirado.
        const rCod = await pool.query(
            `SELECT id FROM recuperacao_senha
             WHERE usuario_id = $1 AND codigo = $2 AND usado = false AND expira_em > NOW()
             ORDER BY criado_em DESC LIMIT 1`,
            [usuarioId, codigo]
        );
        if (rCod.rows.length === 0) {
            return res.status(400).json({ erro: 'Código inválido ou expirado.' });
        }

        // Troca a senha e marca o codigo como usado.
        const senhaHash = await bcrypt.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, usuarioId]);
        await pool.query('UPDATE recuperacao_senha SET usado = true WHERE id = $1', [rCod.rows[0].id]);

        res.json({ mensagem: 'Senha redefinida com sucesso! Já pode entrar.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao redefinir: ' + erro.message });
    }
});

module.exports = router;