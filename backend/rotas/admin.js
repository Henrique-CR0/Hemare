// Hemare - Rotas do administrador: verificacao de hospitais.
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirAdmin } = require('../middleware/exigirPapel');
const { statusVerificacao, validarMotivoRecusa } = require('../regras/verificacao');
const { escaparHtml } = require('../regras/html');

const router = express.Router();

// Todas as rotas daqui exigem login de administrador.
router.use(autenticar, exigirAdmin);

// O :id precisa ser um numero inteiro.
router.param('id', (req, res, next, id) => {
    if (!/^\d+$/.test(id)) return res.status(400).json({ erro: 'Hospital invalido.' });
    next();
});

// Filtro de status -> condicao SQL (lista fixa: nada vindo do usuario entra no SQL).
const FILTROS = {
    pendente: 'h.aprovado IS NOT TRUE AND h.motivo_recusa IS NULL',
    aprovado: 'h.aprovado = true',
    recusado: 'h.aprovado IS NOT TRUE AND h.motivo_recusa IS NOT NULL',
    todos: 'true'
};

// LISTAR hospitais para verificacao (?status=pendente|aprovado|recusado|todos).
router.get('/hospitais', async (req, res) => {
    const filtro = FILTROS[req.query.status] || FILTROS.pendente;
    try {
        const r = await pool.query(
            `SELECT h.id, u.nome, u.email, u.criado_em, h.cnpj, h.cnes, h.cep, h.endereco, h.numero,
                    h.bairro, h.complemento, h.cidade, h.estado, h.aprovado, h.motivo_recusa, h.verificado_em
               FROM hospitais h JOIN usuarios u ON u.id = h.usuario_id
              WHERE ${filtro}
              ORDER BY u.criado_em ASC`
        );
        res.json(r.rows.map((h) => ({ ...h, statusVerificacao: statusVerificacao(h) })));
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// Avisa o hospital por email (se falhar, nao impede a verificacao).
function avisarHospital(email, nomeOriginal, aprovado, motivoOriginal) {
    const nome = escaparHtml(nomeOriginal);
    const motivo = escaparHtml(motivoOriginal || '');
    const corpo = aprovado
        ? `<p>O cadastro de <strong>${nome}</strong> foi <strong style="color:#17663d;">aprovado</strong>.</p>
           <p>Agora você já pode publicar necessidades, atualizar o estoque, ver doadores compatíveis e confirmar doações.</p>`
        : `<p>O cadastro de <strong>${nome}</strong> não foi aprovado na verificação.</p>
           <p><strong>Motivo:</strong> ${motivo}</p>
           <p>Corrija os dados indicados para que a verificação seja feita de novo.</p>`;
    resend.emails.send({
        from: 'Hemare <onboarding@resend.dev>',
        to: email,
        subject: aprovado ? '✅ Seu hospital foi verificado no Hemare' : 'Verificação do seu hospital no Hemare',
        html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                 <h2 style="color: #c8102e;">🩸 Hemare</h2>${corpo}
               </div>`
    }).catch(() => {});
}

// Atualiza a verificacao de um hospital e devolve os dados para o email.
async function registrarDecisao(hospitalId, adminId, aprovado, motivo) {
    const r = await pool.query(
        `UPDATE hospitais SET aprovado = $1, motivo_recusa = $2, verificado_em = NOW(), verificado_por = $3
          WHERE id = $4 RETURNING usuario_id`,
        [aprovado, motivo, adminId, hospitalId]
    );
    if (r.rows.length === 0) return null;
    const u = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [r.rows[0].usuario_id]);
    return u.rows[0] || null;
}

// APROVAR um hospital.
router.post('/hospitais/:id/aprovar', async (req, res) => {
    try {
        const hosp = await registrarDecisao(req.params.id, req.usuario.id, true, null);
        if (!hosp) return res.status(404).json({ erro: 'Hospital nao encontrado.' });
        avisarHospital(hosp.email, hosp.nome, true);
        res.json({ mensagem: hosp.nome + ' foi aprovado.' });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// RECUSAR (ou revogar a aprovacao de) um hospital, com motivo obrigatorio.
router.post('/hospitais/:id/recusar', async (req, res) => {
    const validacao = validarMotivoRecusa(req.body.motivo);
    if (!validacao.valido) return res.status(400).json({ erro: validacao.erro });

    try {
        const hosp = await registrarDecisao(req.params.id, req.usuario.id, false, validacao.motivo);
        if (!hosp) return res.status(404).json({ erro: 'Hospital nao encontrado.' });
        avisarHospital(hosp.email, hosp.nome, false, validacao.motivo);
        res.json({ mensagem: hosp.nome + ' foi recusado.' });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;
