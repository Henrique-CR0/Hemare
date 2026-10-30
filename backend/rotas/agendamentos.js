// Hemare - Agendamentos do doador (REST).
//   POST   /agendamentos        marca um horario        { vagaId }   -> 201 + Location
//   GET    /agendamentos        lista os meus           ?status=agendado|compareceu|faltou|cancelado
//   GET    /agendamentos/:id    um agendamento meu
//   PATCH  /agendamentos/:id    reagenda                { vagaId }
//   DELETE /agendamentos/:id    cancela                 -> 204
// A reserva e atomica (UPDATE condicional): a vaga nunca passa da capacidade, mesmo com muita gente ao mesmo tempo.
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { paraDia } = require('../regras/alerta');
const { statusVerificacao } = require('../regras/verificacao');
const A = require('../regras/agendamento');
const email = require('../servicos/emailAgendamento');

const router = express.Router();

const AVISO_MIGRACAO = 'O agendamento ainda não foi ativado no banco (rode db/criar-agendamentos.js).';

router.use(autenticar, (req, res, next) => {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'O agendamento é para contas de doador.' });
    next();
});

function idValido(texto) {
    return /^[0-9]{1,9}$/.test(String(texto)) ? Number(texto) : null;
}

function erroDeBanco(res, e, mensagem) {
    if (e.code === '42P01' || e.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
    return res.status(500).json({ erro: mensagem + ': ' + e.message });
}

const SELECT_AGENDAMENTO = `
    SELECT a.id, a.status, a.doacao_id, a.criado_em, a.vaga_id, v.data, v.hora, h.cidade, h.estado, h.endereco, h.numero, h.bairro,
           uh.nome AS hospital, h.id AS hospital_id
      FROM agendamentos a
      JOIN vagas_doacao v ON v.id = a.vaga_id
      JOIN hospitais h ON h.id = v.hospital_id
      JOIN usuarios uh ON uh.id = h.usuario_id`;

function formatar(l) {
    return {
        id: l.id, status: l.status, data: paraDia(l.data), hora: l.hora, vagaId: l.vaga_id,
        hospital: { id: l.hospital_id, nome: l.hospital, cidade: l.cidade, estado: l.estado, endereco: [l.endereco, l.numero, l.bairro].filter(Boolean).join(', ') },
        doacaoRegistrada: l.doacao_id !== null && l.doacao_id !== undefined
    };
}

async function carregarDoador(cliente, usuarioId) {
    const r = await cliente.query('SELECT id, sexo, ultima_doacao FROM doadores WHERE usuario_id = $1', [usuarioId]);
    return r.rows[0] || null;
}

async function carregarVaga(cliente, vagaId) {
    const r = await cliente.query(
        `SELECT v.id, v.data, v.hora, v.capacidade, v.reservadas, v.hospital_id, h.aprovado, h.cnes, h.cnpj, h.motivo_recusa
           FROM vagas_doacao v JOIN hospitais h ON h.id = v.hospital_id WHERE v.id = $1`, [vagaId]);
    if (r.rows.length === 0) return null;
    return { ...r.rows[0], data: paraDia(r.rows[0].data) };
}

async function datasDeDoacao(cliente, doadorId) {
    const r = await cliente.query('SELECT data_doacao FROM doacoes WHERE doador_id = $1', [doadorId]);
    return r.rows.map((x) => paraDia(x.data_doacao));
}

async function agendamentoAtivoDoDoador(cliente, doadorId, ignorarId) {
    const r = await cliente.query(
        `SELECT a.id, v.data, v.hora FROM agendamentos a JOIN vagas_doacao v ON v.id = a.vaga_id
          WHERE a.doador_id = $1 AND a.status = 'agendado'`, [doadorId]);
    const agora = Date.now();
    const ativos = r.rows
        .filter((x) => x.id !== ignorarId && A.momentoDaVaga(x.data, x.hora) > agora)
        .map((x) => ({ id: x.id, data: paraDia(x.data), hora: x.hora }));
    return ativos[0] || null;
}

// Reserva um lugar. Devolve true se conseguiu (um UPDATE so e atomico no banco).
async function reservar(cliente, vagaId) {
    const r = await cliente.query('UPDATE vagas_doacao SET reservadas = reservadas + 1 WHERE id = $1 AND reservadas < capacidade RETURNING id', [vagaId]);
    return r.rows.length > 0;
}

async function liberar(cliente, vagaId) {
    await cliente.query('UPDATE vagas_doacao SET reservadas = reservadas - 1 WHERE id = $1 AND reservadas > 0', [vagaId]);
}

function enviarEmail(modelo, destino, dados) {
    const m = modelo(dados);
    resend.emails.send({ from: 'Hemare <onboarding@resend.dev>', to: destino, subject: m.assunto, html: m.html }).catch(() => {});
}

async function dadosDoEmail(usuarioId, agendamentoId) {
    const r = await pool.query(SELECT_AGENDAMENTO + ' WHERE a.id = $1', [agendamentoId]);
    const u = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [usuarioId]);
    if (r.rows.length === 0 || u.rows.length === 0) return null;
    const l = r.rows[0];
    return { destino: u.rows[0].email, nome: u.rows[0].nome, data: paraDia(l.data), hora: l.hora, hospital: l.hospital, cidade: l.cidade,
        endereco: [l.endereco, l.numero, l.bairro].filter(Boolean).join(', ') };
}

// DOADOR: agenda um horario (vagaId). Responde 201 com Location; 409 se lotou ou se ja tem agendamento ativo.
router.post('/', async (req, res) => {
    const vagaId = idValido(req.body && req.body.vagaId);
    if (!vagaId) return res.status(400).json({ erro: 'Informe o horário (vagaId).' });
    const cliente = await pool.connect();
    try {
        const doador = await carregarDoador(cliente, req.usuario.id);
        if (!doador) return res.status(400).json({ erro: 'Complete seu perfil de doador para agendar.' });
        const vaga = await carregarVaga(cliente, vagaId);
        const aprovado = vaga && statusVerificacao(vaga) === 'aprovado';
        const pode = A.podeAgendar({
            doador, vaga: aprovado ? vaga : null, ativo: await agendamentoAtivoDoDoador(cliente, doador.id),
            datasDeDoacao: await datasDeDoacao(cliente, doador.id)
        }, new Date());
        if (!pode.ok) return res.status(pode.status).json({ erro: pode.erro });

        await cliente.query('BEGIN');
        if (!(await reservar(cliente, vagaId))) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ erro: 'Este horário acabou de lotar. Escolha outro.' });
        }
        const ins = await cliente.query('INSERT INTO agendamentos (doador_id, vaga_id) VALUES ($1, $2) RETURNING id', [doador.id, vagaId]);
        // Duas abas ao mesmo tempo: se ja existe outro ativo, desfaz este.
        const ativos = await cliente.query("SELECT id FROM agendamentos WHERE doador_id = $1 AND status = 'agendado'", [doador.id]);
        if (ativos.rows.length > 1) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ erro: 'Você já tem um agendamento ativo. Reagende ou cancele antes de marcar outro.' });
        }
        await cliente.query('COMMIT');

        const id = ins.rows[0].id;
        const r = await pool.query(SELECT_AGENDAMENTO + ' WHERE a.id = $1', [id]);
        const dados = await dadosDoEmail(req.usuario.id, id);
        if (dados) enviarEmail(email.confirmacao, dados.destino, dados);
        res.status(201).location('/agendamentos/' + id).json({ ...formatar(r.rows[0]), mensagem: '📅 Agendado! Enviamos a confirmação por e-mail.' });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        erroDeBanco(res, e, 'Erro ao agendar');
    } finally {
        cliente.release();
    }
});

// DOADOR: seus agendamentos (?status=agendado|compareceu|faltou|cancelado).
router.get('/', async (req, res) => {
    const status = req.query.status;
    if (status !== undefined && !A.STATUS.includes(status)) return res.status(400).json({ erro: 'Status inválido.' });
    try {
        const doador = await carregarDoador(pool, req.usuario.id);
        if (!doador) return res.json([]);
        const r = await pool.query(SELECT_AGENDAMENTO + ' WHERE a.doador_id = $1 ORDER BY v.data DESC, v.hora DESC', [doador.id]);
        res.json(r.rows.filter((l) => !status || l.status === status).map(formatar));
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao listar os agendamentos');
    }
});

// DOADOR: um agendamento seu (404 se for de outra pessoa).
router.get('/:id', async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Agendamento inválido.' });
    try {
        const doador = await carregarDoador(pool, req.usuario.id);
        const r = doador ? await pool.query(SELECT_AGENDAMENTO + ' WHERE a.id = $1 AND a.doador_id = $2', [id, doador.id]) : { rows: [] };
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        res.json(formatar(r.rows[0]));
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao buscar o agendamento');
    }
});

// DOADOR: reagenda para outro horario (vagaId); o antigo so e liberado quando o novo e confirmado.
router.patch('/:id', async (req, res) => {
    const id = idValido(req.params.id);
    const novaVagaId = idValido(req.body && req.body.vagaId);
    if (!id) return res.status(400).json({ erro: 'Agendamento inválido.' });
    if (!novaVagaId) return res.status(400).json({ erro: 'Informe o novo horário (vagaId).' });
    const cliente = await pool.connect();
    try {
        const doador = await carregarDoador(cliente, req.usuario.id);
        const atual = doador ? await cliente.query(SELECT_AGENDAMENTO + ' WHERE a.id = $1 AND a.doador_id = $2', [id, doador.id]) : { rows: [] };
        if (atual.rows.length === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        const ag = atual.rows[0];
        const agora = new Date();

        const podeSair = A.podeCancelar(ag, { data: paraDia(ag.data), hora: ag.hora }, agora);
        if (!podeSair.ok) return res.status(podeSair.status).json({ erro: podeSair.erro });
        if (novaVagaId === ag.vaga_id) return res.status(400).json({ erro: 'Você já está agendado neste horário.' });

        const vaga = await carregarVaga(cliente, novaVagaId);
        const aprovado = vaga && statusVerificacao(vaga) === 'aprovado';
        const pode = A.podeAgendar({ doador, vaga: aprovado ? vaga : null, ativo: null, datasDeDoacao: await datasDeDoacao(cliente, doador.id) }, agora);
        if (!pode.ok) return res.status(pode.status).json({ erro: pode.erro });

        await cliente.query('BEGIN');
        if (!(await reservar(cliente, novaVagaId))) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ erro: 'Este horário acabou de lotar. Escolha outro.' });
        }
        await liberar(cliente, ag.vaga_id);
        await cliente.query('UPDATE agendamentos SET vaga_id = $1, lembrete_enviado = false, atualizado_em = NOW() WHERE id = $2', [novaVagaId, id]);
        await cliente.query('COMMIT');

        const r = await pool.query(SELECT_AGENDAMENTO + ' WHERE a.id = $1', [id]);
        const dados = await dadosDoEmail(req.usuario.id, id);
        if (dados) enviarEmail(email.confirmacao, dados.destino, dados);
        res.json({ ...formatar(r.rows[0]), mensagem: '📅 Reagendado! Enviamos a nova confirmação por e-mail.' });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        erroDeBanco(res, e, 'Erro ao reagendar');
    } finally {
        cliente.release();
    }
});

// DOADOR: cancela o agendamento e libera a vaga (204).
router.delete('/:id', async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Agendamento inválido.' });
    try {
        const doador = await carregarDoador(pool, req.usuario.id);
        const r = doador ? await pool.query(SELECT_AGENDAMENTO + ' WHERE a.id = $1 AND a.doador_id = $2', [id, doador.id]) : { rows: [] };
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
        const ag = r.rows[0];
        const pode = A.podeCancelar(ag, { data: paraDia(ag.data), hora: ag.hora }, new Date());
        if (!pode.ok) return res.status(pode.status).json({ erro: pode.erro });
        // So libera a vaga se ESTE pedido foi quem cancelou (dois cliques seguidos nao liberam duas vezes).
        const u = await pool.query("UPDATE agendamentos SET status = 'cancelado', atualizado_em = NOW() WHERE id = $1 AND status = 'agendado' RETURNING id", [id]);
        if (u.rows.length > 0) await pool.query('UPDATE vagas_doacao SET reservadas = reservadas - 1 WHERE id = $1 AND reservadas > 0', [ag.vaga_id]);
        res.status(204).end();
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao cancelar');
    }
});

module.exports = router;
