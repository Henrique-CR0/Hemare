// Hemare - Rotas da Rede de sangue raro.
// Doador: entra na rede, ve o proprio codigo e responde a chamados.
// Hospital aprovado: confere o laudo pelo codigo, consulta so QUANTOS doadores existem e abre um pedido de
// emergencia. O hospital nunca recebe a lista: so ve nome e telefone de quem responde "posso ajudar".
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirHospitalAprovado } = require('../middleware/exigirPapel');
const { gerarCodigo, normalizarCodigo } = require('../regras/indicacao');
const { escaparHtml } = require('../regras/html');
const { paraDia } = require('../regras/alerta');
const {
    FENOTIPOS, ALCANCES, MAX_PEDIDOS_ABERTOS, fenotipoValido, rotuloFenotipo,
    validarParticipacao, validarPedido, selecionarDoadoresRaros, descreverResultado, estadoDoPedido, expiraEm, validarResposta
} = require('../regras/raros');
const { registrarDoacao } = require('../servicos/registrarDoacao');

const router = express.Router();

const AVISO_MIGRACAO = 'A rede de sangue raro ainda não foi ativada no banco (rode db/ajustar-raros.js).';

function idValido(texto) {
    return /^[0-9]{1,9}$/.test(String(texto)) ? Number(texto) : null;
}

function primeiroNome(d) {
    return String(d.nome_social || d.nome || '').split(' ')[0];
}

// Doadores com um fenotipo, ja com e-mail e nome da conta (so a rede confirmada e consentida).
async function carregarRede(fenotipo) {
    const r = await pool.query(
        `SELECT d.id, d.cidade, d.estado, d.sexo, d.ultima_doacao, d.raro_fenotipo, d.raro_status, d.raro_consentimento,
                d.raro_alcance, d.raro_ultima_notificacao, d.nome_social, u.nome, u.email
           FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
          WHERE d.raro_fenotipo = $1 AND d.raro_status = 'confirmado' AND d.raro_consentimento = true`,
        [fenotipo]
    );
    return r.rows;
}

// ===================== DOADOR =====================

router.use('/eu', autenticar, (req, res, next) => {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'A rede de sangue raro é para contas de doador.' });
    next();
});
router.use('/convocacoes', autenticar, (req, res, next) => {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'Só doadores respondem a chamados.' });
    next();
});

// Monta o que a tela do doador precisa.
async function montarMinhaParticipacao(usuarioId) {
    const r = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [usuarioId]);
    if (r.rows.length === 0) return null;
    const d = r.rows[0];
    const participa = d.raro_consentimento === true && !!d.raro_fenotipo;

    // Chamados que ainda valem para esta pessoa.
    const rCham = await pool.query(
        `SELECT cv.pedido_id, cv.resposta, p.status, p.expira_em, p.fenotipo, p.apelido_paciente, un.nome AS hospital, h.cidade, h.estado
           FROM convocacoes_raras cv
           JOIN pedidos_raros p ON p.id = cv.pedido_id
           JOIN hospitais h ON h.id = p.hospital_id
           JOIN usuarios un ON un.id = h.usuario_id
          WHERE cv.doador_id = $1 ORDER BY cv.id DESC`,
        [d.id]
    );
    const chamados = rCham.rows
        .map((c) => ({ c, estado: estadoDoPedido(c) }))
        .filter((x) => x.estado.aberto)
        .map(({ c, estado }) => ({
            pedidoId: c.pedido_id, hospital: c.hospital, cidade: c.cidade, estado: c.estado,
            fenotipo: rotuloFenotipo(c.fenotipo), apelidoPaciente: c.apelido_paciente,
            horasRestantes: estado.horasRestantes, resposta: c.resposta || null
        }));

    return {
        perfilPronto: !!(d.telefone && d.sexo),
        participa,
        fenotipo: d.raro_fenotipo || null,
        fenotipoRotulo: rotuloFenotipo(d.raro_fenotipo),
        status: d.raro_status || null,
        alcance: d.raro_alcance || null,
        codigo: d.raro_codigo || null,
        confirmadoEm: d.raro_confirmado_em ? paraDia(d.raro_confirmado_em) : null,
        fenotipos: FENOTIPOS,
        alcances: ALCANCES,
        chamados
    };
}

router.get('/eu', async (req, res) => {
    try {
        const m = await montarMinhaParticipacao(req.usuario.id);
        if (!m) return res.status(404).json({ erro: 'Complete seu perfil para participar da rede.' });
        res.json(m);
    } catch (erro) {
        if (erro.code === '42703' || erro.code === '42P01') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao buscar sua participação: ' + erro.message });
    }
});

// Entrar, mudar ou sair da rede.
router.put('/eu', async (req, res) => {
    const { erro, participacao } = validarParticipacao(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const r = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [req.usuario.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Complete seu perfil para participar da rede.' });
        const d = r.rows[0];

        if (!participacao.participar) {
            await pool.query('UPDATE doadores SET raro_consentimento = false WHERE id = $1', [d.id]);
        } else {
            if (!d.telefone) {
                return res.status(400).json({ erro: 'Informe um telefone no seu perfil: é por ele que o hospital fala com você se você aceitar ajudar.' });
            }
            // Mudou de fenotipo (ou e a primeira vez): volta a ser "declarado" ate um hospital conferir o laudo.
            const mudou = d.raro_fenotipo !== participacao.fenotipo;
            let codigo = d.raro_codigo;
            for (let tentativa = 0; !codigo && tentativa < 5; tentativa++) {
                const candidato = gerarCodigo();
                const ocupado = await pool.query('SELECT id FROM doadores WHERE raro_codigo = $1', [candidato]);
                if (ocupado.rows.length === 0) codigo = candidato;
            }
            if (!codigo) return res.status(500).json({ erro: 'Não consegui gerar seu código agora. Tente de novo.' });

            await pool.query(
                `UPDATE doadores SET raro_fenotipo = $1, raro_alcance = $2, raro_consentimento = true, raro_codigo = $3,
                        raro_status = $4, raro_confirmado_por = $5, raro_confirmado_em = $6
                  WHERE id = $7`,
                [
                    participacao.fenotipo, participacao.alcance, codigo,
                    mudou || !d.raro_status ? 'declarado' : d.raro_status,
                    mudou ? null : d.raro_confirmado_por, mudou ? null : d.raro_confirmado_em, d.id
                ]
            );
        }
        res.json(await montarMinhaParticipacao(req.usuario.id));
    } catch (e) {
        if (e.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao salvar sua participação: ' + e.message });
    }
});

// Responder a um chamado: "posso ajudar" libera nome e telefone so para o hospital deste pedido.
router.post('/convocacoes/:pedidoId/responder', async (req, res) => {
    const pedidoId = idValido(req.params.pedidoId);
    const resposta = validarResposta(req.body && req.body.resposta);
    if (!pedidoId || !resposta) return res.status(400).json({ erro: 'Informe a resposta: "disponivel" ou "indisponivel".' });
    try {
        const d = await pool.query('SELECT id FROM doadores WHERE usuario_id = $1', [req.usuario.id]);
        if (d.rows.length === 0) return res.status(404).json({ erro: 'Chamado não encontrado.' });
        const cv = await pool.query(
            `SELECT cv.id, p.status, p.expira_em FROM convocacoes_raras cv JOIN pedidos_raros p ON p.id = cv.pedido_id
              WHERE cv.pedido_id = $1 AND cv.doador_id = $2`,
            [pedidoId, d.rows[0].id]
        );
        if (cv.rows.length === 0) return res.status(404).json({ erro: 'Chamado não encontrado.' });
        if (!estadoDoPedido(cv.rows[0]).aberto) return res.status(409).json({ erro: 'Este chamado já foi encerrado ou expirou.' });

        await pool.query('UPDATE convocacoes_raras SET resposta = $1, respondido_em = NOW() WHERE id = $2', [resposta, cv.rows[0].id]);
        res.json({
            mensagem: resposta === 'disponivel'
                ? '💛 Obrigado! O hospital agora vê seu nome e telefone e vai falar com você. Vá com calma e leve um documento.'
                : 'Tudo bem, obrigado por avisar. Seus dados continuam protegidos.'
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao responder: ' + erro.message });
    }
});

// ===================== HOSPITAL =====================

// Conferir o laudo pessoalmente: o doador mostra o codigo; o hospital ve so o primeiro nome e o fenotipo declarado.
router.get('/codigo/:codigo', autenticar, exigirHospitalAprovado, async (req, res) => {
    const codigo = normalizarCodigo(req.params.codigo);
    if (!codigo) return res.status(404).json({ erro: 'Código não encontrado.' });
    try {
        const r = await pool.query(
            `SELECT d.id, d.nome_social, d.raro_fenotipo, d.raro_status, u.nome
               FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
              WHERE d.raro_codigo = $1 AND d.raro_consentimento = true AND d.raro_fenotipo IS NOT NULL`,
            [codigo]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Código não encontrado.' });
        const d = r.rows[0];
        res.json({ primeiroNome: primeiroNome(d), fenotipo: d.raro_fenotipo, fenotipoRotulo: rotuloFenotipo(d.raro_fenotipo), status: d.raro_status });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar o código: ' + erro.message });
    }
});

router.post('/codigo/:codigo/confirmar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const codigo = normalizarCodigo(req.params.codigo);
    if (!codigo) return res.status(404).json({ erro: 'Código não encontrado.' });
    try {
        const r = await pool.query(
            'SELECT id, raro_status FROM doadores WHERE raro_codigo = $1 AND raro_consentimento = true AND raro_fenotipo IS NOT NULL',
            [codigo]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Código não encontrado.' });
        if (r.rows[0].raro_status === 'confirmado') return res.status(409).json({ erro: 'Este fenótipo já foi confirmado.' });
        await pool.query(
            "UPDATE doadores SET raro_status = 'confirmado', raro_confirmado_por = $1, raro_confirmado_em = NOW() WHERE id = $2",
            [req.hospital.id, r.rows[0].id]
        );
        res.json({ mensagem: '✅ Fenótipo confirmado. Esta pessoa agora faz parte da rede de sangue raro.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao confirmar: ' + erro.message });
    }
});

// Previa: so numeros (nunca quem sao). Ajuda o hospital a decidir antes de chamar.
router.get('/previa', autenticar, exigirHospitalAprovado, async (req, res) => {
    if (!fenotipoValido(req.query.fenotipo)) return res.status(400).json({ erro: 'Escolha o fenótipo.' });
    try {
        const { resumo } = selecionarDoadoresRaros(await carregarRede(req.query.fenotipo), { fenotipo: req.query.fenotipo }, req.hospital);
        res.json({ resumo, mensagem: descreverResultado({ ...resumo, convocados: 0 }) });
    } catch (erro) {
        if (erro.code === '42703' || erro.code === '42P01') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro na prévia: ' + erro.message });
    }
});

// Abre o pedido e chama os doadores compativeis.
router.post('/pedidos', autenticar, exigirHospitalAprovado, async (req, res) => {
    const { erro, pedido } = validarPedido(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const abertos = await pool.query("SELECT status, expira_em FROM pedidos_raros WHERE hospital_id = $1 AND status = 'aberto'", [req.hospital.id]);
        if (abertos.rows.filter((p) => estadoDoPedido(p).aberto).length >= MAX_PEDIDOS_ABERTOS) {
            return res.status(409).json({ erro: 'Seu hospital já tem ' + MAX_PEDIDOS_ABERTOS + ' pedidos abertos. Encerre algum antes de abrir outro.' });
        }

        const { convocados, resumo } = selecionarDoadoresRaros(await carregarRede(pedido.fenotipo), pedido, req.hospital);
        if (convocados.length === 0) {
            return res.json({ criado: false, resumo, mensagem: descreverResultado(resumo) });
        }

        const nomeHosp = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.usuario.id]);
        const hospital = nomeHosp.rows[0] ? nomeHosp.rows[0].nome : 'Um hospital';
        const ins = await pool.query(
            `INSERT INTO pedidos_raros (hospital_id, fenotipo, motivo, apelido_paciente, expira_em, convocados)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [req.hospital.id, pedido.fenotipo, pedido.motivo, pedido.apelidoPaciente, expiraEm(), convocados.length]
        );
        const pedidoId = ins.rows[0].id;
        for (const doador of convocados) {
            await pool.query('INSERT INTO convocacoes_raras (pedido_id, doador_id) VALUES ($1, $2)', [pedidoId, doador.id]);
        }
        const ids = convocados.map((x) => x.id);
        await pool.query('UPDATE doadores SET raro_ultima_notificacao = CURRENT_DATE WHERE id IN (' + ids.map((_, i) => '$' + (i + 1)).join(', ') + ')', ids);

        const link = process.env.FRONTEND_URL ? String(process.env.FRONTEND_URL).replace(/\/$/, '') + '/meu-perfil' : null;
        for (const doador of convocados) {
            resend.emails.send({
                from: 'Hemare <onboarding@resend.dev>',
                to: doador.email,
                subject: '🆘 Emergência: sangue raro (' + rotuloFenotipo(pedido.fenotipo) + ') em ' + req.hospital.cidade,
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                        <h2 style="color: #c8102e;">🩸 Hemare — Rede de sangue raro</h2>
                        <p>Olá, ${escaparHtml(primeiroNome(doador))}!</p>
                        <p><strong>${escaparHtml(hospital)}</strong>, em ${escaparHtml(req.hospital.cidade)}, está com uma emergência e procura
                        doadores do fenótipo <strong style="color:#c8102e;">${escaparHtml(rotuloFenotipo(pedido.fenotipo))}</strong>.
                        ${pedido.apelidoPaciente ? 'Paciente: ' + escaparHtml(pedido.apelidoPaciente) + '.' : ''}</p>
                        <p>Você recebeu este chamado porque faz parte da rede, está ao alcance que escolheu e, pelo intervalo desde a última doação,
                        <strong>já pode doar</strong>.</p>
                        <p><strong>Seus dados continuam protegidos:</strong> o hospital só vê seu nome e telefone se você responder
                        “posso ajudar” em <em>Meu perfil → Rede de sangue raro</em>${link ? ' (' + escaparHtml(link) + ')' : ''}.</p>
                        <p style="color:#666; font-size:13px;">O chamado vale por 72 horas e você recebe no máximo um por semana.
                        A decisão clínica é sempre da equipe do hospital.</p>
                    </div>
                `
            }).catch(() => {});
        }

        res.status(201).json({ criado: true, id: pedidoId, resumo, mensagem: descreverResultado(resumo) });
    } catch (e) {
        if (e.code === '42703' || e.code === '42P01') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao abrir o pedido: ' + e.message });
    }
});

// Pedidos do hospital. Nome e telefone so aparecem de quem respondeu "disponivel", e so enquanto o pedido esta aberto.
router.get('/pedidos', autenticar, exigirHospitalAprovado, async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM pedidos_raros WHERE hospital_id = $1 ORDER BY id DESC LIMIT 20', [req.hospital.id]);
        const saida = [];
        for (const p of r.rows) {
            const estado = estadoDoPedido(p);
            const cv = await pool.query(
                `SELECT cv.resposta, cv.doacao_id, d.id AS doador_id, d.cidade, d.telefone, d.nome_social, u.nome
                   FROM convocacoes_raras cv JOIN doadores d ON d.id = cv.doador_id JOIN usuarios u ON u.id = d.usuario_id
                  WHERE cv.pedido_id = $1`,
                [p.id]
            );
            const disponiveis = cv.rows.filter((c) => c.resposta === 'disponivel');
            saida.push({
                id: p.id,
                fenotipo: rotuloFenotipo(p.fenotipo),
                motivo: p.motivo,
                apelidoPaciente: p.apelido_paciente,
                estado: estado.aberto ? 'aberto' : estado.motivo,
                horasRestantes: estado.horasRestantes,
                convocados: p.convocados,
                disponiveisTotal: disponiveis.length,
                indisponiveisTotal: cv.rows.filter((c) => c.resposta === 'indisponivel').length,
                semResposta: cv.rows.filter((c) => !c.resposta).length,
                disponiveis: estado.aberto ? disponiveis.map((c) => ({
                    doadorId: c.doador_id, nome: c.nome_social || c.nome, telefone: c.telefone || 'Não informado',
                    cidade: c.cidade, doacaoConfirmada: !!c.doacao_id
                })) : []
            });
        }
        res.json(saida);
    } catch (erro) {
        if (erro.code === '42P01') return res.json([]);
        res.status(500).json({ erro: 'Erro ao listar os pedidos: ' + erro.message });
    }
});

// Confirma a doacao de quem respondeu "posso ajudar" (entra na cadeia de confianca).
router.post('/pedidos/:id/confirmar-doacao', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    const doadorId = Number(req.body && req.body.doadorId);
    if (!id || !Number.isInteger(doadorId) || doadorId < 1) return res.status(400).json({ erro: 'Pedido ou doador inválido.' });
    try {
        const p = await pool.query('SELECT * FROM pedidos_raros WHERE id = $1 AND hospital_id = $2', [id, req.hospital.id]);
        if (p.rows.length === 0) return res.status(404).json({ erro: 'Pedido não encontrado.' });
        if (!estadoDoPedido(p.rows[0]).aberto) return res.status(409).json({ erro: 'Este pedido já foi encerrado ou expirou.' });

        const cv = await pool.query('SELECT id, resposta, doacao_id FROM convocacoes_raras WHERE pedido_id = $1 AND doador_id = $2', [id, doadorId]);
        if (cv.rows.length === 0 || cv.rows[0].resposta !== 'disponivel') {
            return res.status(404).json({ erro: 'Essa pessoa não respondeu "posso ajudar" neste pedido.' });
        }
        if (cv.rows[0].doacao_id) return res.status(409).json({ erro: 'Essa doação já foi confirmada.' });

        const resultado = await registrarDoacao(req.hospital.id, doadorId);
        if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
        await pool.query('UPDATE convocacoes_raras SET doacao_id = $1 WHERE id = $2', [resultado.doacaoId, cv.rows[0].id]);
        res.json({ mensagem: 'Doação confirmada e registrada com selo de auditoria! 🩸🔗', hash: resultado.hash });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao confirmar: ' + erro.message });
    }
});

router.post('/pedidos/:id/encerrar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Pedido inválido.' });
    try {
        const r = await pool.query(
            "UPDATE pedidos_raros SET status = 'encerrado' WHERE id = $1 AND hospital_id = $2 AND status = 'aberto' RETURNING id",
            [id, req.hospital.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Pedido não encontrado.' });
        res.json({ mensagem: 'Pedido encerrado e contatos protegidos de novo. Obrigado a quem ajudou! 💛' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao encerrar: ' + erro.message });
    }
});

module.exports = router;
