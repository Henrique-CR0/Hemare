// Hemare - Rotas do Calendario do sangue (feriados prolongados).
// Publico: lista dos proximos periodos de risco.
// Doador: plano pessoal ("quando eu fico apto, ate quando doar") e aviso opcional por e-mail.
// Hospital aprovado: so NUMEROS (quantos doadores da cidade estarao aptos) e uma chamada por feriado.
// O hospital nunca recebe a lista de doadores nem sabe quem recebeu o e-mail.
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirHospitalAprovado } = require('../middleware/exigirPapel');
const { paraDia } = require('../regras/alerta');
const {
    PORQUE, DIAS_A_FRENTE, RISCOS, proximosPeriodos, planoDoDoador, contarParaHospital, selecionarParaChamado,
    podeChamar, descreverChamado
} = require('../regras/feriados');
const aviso = require('../servicos/avisoFeriado');

const router = express.Router();

const AVISO_MIGRACAO = 'O Calendário do sangue ainda não foi ativado no banco (rode db/criar-feriados.js).';

function periodosDeHoje() {
    return proximosPeriodos(paraDia(new Date()), DIAS_A_FRENTE);
}

function resumoDoPeriodo(p) {
    return {
        nome: p.nome, inicio: p.inicio, fim: p.fim, dias: p.dias, risco: p.risco, riscoRotulo: RISCOS[p.risco],
        emAndamento: p.emAndamento, diasParaInicio: p.diasParaInicio, ultimoDiaParaDoar: p.ultimoDiaParaDoar
    };
}

// ===================== PUBLICO =====================

router.get('/', (req, res) => {
    res.json({ geradoPara: paraDia(new Date()), porque: PORQUE, periodos: periodosDeHoje().map(resumoDoPeriodo) });
});

// ===================== DOADOR =====================

router.use('/meu-plano', autenticar, soDoador);
router.use('/aviso', autenticar, soDoador);

function soDoador(req, res, next) {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'O plano pessoal é para contas de doador.' });
    next();
}

router.get('/meu-plano', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [req.usuario.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Complete seu perfil para ver o seu plano.' });
        const d = r.rows[0];
        const hoje = paraDia(new Date());
        res.json({
            geradoPara: hoje,
            querAviso: d.quer_aviso_feriado === true,
            planos: periodosDeHoje().map((p) => ({ periodo: resumoDoPeriodo(p), plano: planoDoDoador(d, p, hoje) }))
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao montar o seu plano: ' + erro.message });
    }
});

// Liga ou desliga o aviso por e-mail (opt-in).
router.put('/aviso', async (req, res) => {
    if (!req.body || typeof req.body.querAviso !== 'boolean') {
        return res.status(400).json({ erro: 'Informe se o aviso fica ativo (true ou false).' });
    }
    try {
        const r = await pool.query(
            'UPDATE doadores SET quer_aviso_feriado = $1 WHERE usuario_id = $2 RETURNING quer_aviso_feriado',
            [req.body.querAviso, req.usuario.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Complete seu perfil primeiro.' });
        res.json({
            querAviso: r.rows[0].quer_aviso_feriado === true,
            mensagem: req.body.querAviso
                ? '🔔 Combinado! Vamos te avisar por e-mail alguns dias antes de feriados prolongados em que você puder doar.'
                : 'Aviso desligado. Você pode ligar de novo quando quiser.'
        });
    } catch (erro) {
        if (erro.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao salvar o aviso: ' + erro.message });
    }
});

// ===================== HOSPITAL =====================

async function carregarDoadores() {
    const r = await pool.query(
        `SELECT d.id, d.cidade, d.sexo, d.ultima_doacao, d.visibilidade, u.nome, u.email
           FROM doadores d JOIN usuarios u ON u.id = d.usuario_id`
    );
    return r.rows;
}

async function chamadasDoHospital(hospitalId) {
    try {
        const r = await pool.query('SELECT periodo_inicio, convocados FROM chamados_feriado WHERE hospital_id = $1', [hospitalId]);
        return { ok: true, linhas: r.rows };
    } catch (erro) {
        return { ok: false };
    }
}

// Numeros por periodo para o hospital planejar. Sem nenhum dado de pessoa.
router.get('/hospital', autenticar, exigirHospitalAprovado, async (req, res) => {
    try {
        const hoje = paraDia(new Date());
        const doadores = await carregarDoadores();
        const chamadas = await chamadasDoHospital(req.hospital.id);
        const feitas = new Map((chamadas.linhas || []).map((c) => [paraDia(c.periodo_inicio), c.convocados]));
        const periodos = periodosDeHoje().map((p) => {
            const permissao = podeChamar(p);
            return {
                ...resumoDoPeriodo(p),
                contagem: contarParaHospital(doadores, req.hospital.cidade, p, hoje),
                jaChamou: feitas.has(p.inicio),
                convocadosNaChamada: feitas.has(p.inicio) ? feitas.get(p.inicio) : null,
                podeChamar: permissao.ok && !feitas.has(p.inicio),
                motivoSemChamada: feitas.has(p.inicio) ? 'Você já chamou doadores para este período.' : (permissao.ok ? null : permissao.erro)
            };
        });
        res.json({ cidade: req.hospital.cidade, porque: PORQUE, periodos, chamadasAtivas: chamadas.ok });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao montar o calendário do hospital: ' + erro.message });
    }
});

// Abre a chamada "doe antes do feriado": e-mail para quem esta identificado, na cidade, e fica apto a tempo.
router.post('/hospital/chamar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const inicio = req.body && req.body.inicio;
    if (typeof inicio !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
        return res.status(400).json({ erro: 'Informe o início do período (AAAA-MM-DD).' });
    }
    try {
        const hoje = paraDia(new Date());
        const periodo = periodosDeHoje().find((p) => p.inicio === inicio);
        const permissao = podeChamar(periodo);
        if (!permissao.ok) return res.status(400).json({ erro: permissao.erro });

        const ja = await pool.query('SELECT id FROM chamados_feriado WHERE hospital_id = $1 AND periodo_inicio = $2', [req.hospital.id, inicio]);
        if (ja.rows.length > 0) return res.status(409).json({ erro: 'Você já chamou doadores para este período.' });

        const doadores = await carregarDoadores();
        const rAv = await pool.query('SELECT doador_id FROM avisos_feriado WHERE periodo_inicio = $1', [inicio]);
        const avisados = new Set(rAv.rows.map((x) => x.doador_id));
        const { convocados, resumo } = selecionarParaChamado(doadores, req.hospital.cidade, periodo, hoje, avisados);
        if (convocados.length === 0) {
            return res.json({ criado: false, resumo, mensagem: descreverChamado(resumo, periodo) });
        }

        const nomeHosp = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.usuario.id]);
        const hospital = nomeHosp.rows[0] ? nomeHosp.rows[0].nome : 'Um hospital';
        await pool.query(
            'INSERT INTO chamados_feriado (hospital_id, periodo_inicio, periodo_nome, convocados) VALUES ($1, $2, $3, $4)',
            [req.hospital.id, inicio, periodo.nome, convocados.length]
        );
        for (const doador of convocados) {
            await pool.query(
                "INSERT INTO avisos_feriado (doador_id, periodo_inicio, origem) VALUES ($1, $2, 'hospital')", [doador.id, inicio]);
            resend.emails.send({
                from: 'Hemare <onboarding@resend.dev>',
                to: doador.email,
                subject: aviso.assunto(periodo),
                html: aviso.html({ nome: doador.nome, periodo, plano: planoDoDoador(doador, periodo, hoje), hospital, cidade: req.hospital.cidade })
            }).catch(() => {});
        }
        res.status(201).json({ criado: true, resumo, mensagem: descreverChamado(resumo, periodo) });
    } catch (erro) {
        if (erro.code === '42703' || erro.code === '42P01') return res.status(500).json({ erro: AVISO_MIGRACAO });
        res.status(500).json({ erro: 'Erro ao abrir a chamada: ' + erro.message });
    }
});

module.exports = router;
