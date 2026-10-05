// Hemare - Rotas do apadrinhamento: pacientes com necessidade recorrente de sangue e seus padrinhos.
// Lista publica so mostra apelido, tipo, condicao (lista fixa) e contagem de padrinhos.
// O hospital nunca ve quem sao os padrinhos: so quantos sao e, ao "chamar", o email e enviado pelo Hemare.
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirHospitalAprovado } = require('../middleware/exigirPapel');
const { verificarElegibilidade } = require('../regras/elegibilidade');
const { escaparHtml } = require('../regras/html');
const { DIAS_ENTRE_ALERTAS } = require('../regras/alerta');
const {
    CONDICOES, validarCaso, podeApadrinhar, situacaoMeta, podeChamarAgora,
    selecionarPadrinhosParaChamada, descreverChamada
} = require('../regras/apadrinhamento');

const router = express.Router();

const CAMPOS_CASO = `c.id, c.apelido, c.tipo_sanguineo, c.condicao, c.frequencia_dias, c.meta_padrinhos, c.ultima_chamada,
                     u.nome AS hospital, h.cidade, h.estado`;

// Quantos padrinhos cada caso tem: { casoId: total }.
async function contarPadrinhos() {
    const r = await pool.query('SELECT caso_id, COUNT(*) AS total FROM padrinhos GROUP BY caso_id');
    const mapa = {};
    r.rows.forEach((l) => { mapa[l.caso_id] = Number(l.total); });
    return mapa;
}

// Formato publico de um caso (sem nada alem do que pode aparecer na lista).
function publicar(linha, contagem) {
    return {
        id: linha.id,
        apelido: linha.apelido,
        tipoSanguineo: linha.tipo_sanguineo,
        condicao: linha.condicao,
        frequenciaDias: linha.frequencia_dias,
        hospital: linha.hospital,
        cidade: linha.cidade,
        estado: linha.estado,
        ...situacaoMeta(contagem[linha.id] || 0, linha.meta_padrinhos)
    };
}

function idValido(texto) {
    return /^[0-9]{1,9}$/.test(String(texto)) ? Number(texto) : null;
}

// PUBLICO: pacientes que estao procurando padrinhos (so de hospitais aprovados).
router.get('/', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT ${CAMPOS_CASO}
               FROM casos_apadrinhamento c
               JOIN hospitais h ON h.id = c.hospital_id
               JOIN usuarios u ON u.id = h.usuario_id
              WHERE c.ativo = true AND h.aprovado = true
              ORDER BY c.criado_em DESC`
        );
        const contagem = await contarPadrinhos();
        res.json({ condicoes: CONDICOES, casos: r.rows.map((l) => publicar(l, contagem)) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao listar pacientes: ' + erro.message });
    }
});

// HOSPITAL: cadastra um paciente que precisa de padrinhos.
router.post('/', autenticar, exigirHospitalAprovado, async (req, res) => {
    const { erro, caso } = validarCaso(req.body);
    if (erro) return res.status(400).json({ erro });
    try {
        const r = await pool.query(
            `INSERT INTO casos_apadrinhamento (hospital_id, apelido, tipo_sanguineo, condicao, frequencia_dias, meta_padrinhos)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [req.hospital.id, caso.apelido, caso.tipoSanguineo, caso.condicao, caso.frequenciaDias, caso.metaPadrinhos]
        );
        res.status(201).json({ id: r.rows[0].id, mensagem: 'Paciente publicado! Os doadores compatíveis já podem apadrinhar.' });
    } catch (e) {
        res.status(500).json({ erro: 'Erro ao publicar o paciente: ' + e.message });
    }
});

// HOSPITAL: seus pacientes ativos, com quantos padrinhos e se ja pode chamar de novo.
router.get('/meus-casos', autenticar, exigirHospitalAprovado, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT ${CAMPOS_CASO}
               FROM casos_apadrinhamento c
               JOIN hospitais h ON h.id = c.hospital_id
               JOIN usuarios u ON u.id = h.usuario_id
              WHERE c.hospital_id = $1 AND c.ativo = true
              ORDER BY c.criado_em DESC`,
            [req.hospital.id]
        );
        const contagem = await contarPadrinhos();
        res.json(r.rows.map((l) => ({ ...publicar(l, contagem), chamada: podeChamarAgora(l.ultima_chamada) })));
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao listar seus pacientes: ' + erro.message });
    }
});

// HOSPITAL: encerra o pedido (o paciente sai da lista publica).
router.post('/:id/encerrar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Paciente invalido.' });
    try {
        const r = await pool.query(
            'UPDATE casos_apadrinhamento SET ativo = false WHERE id = $1 AND hospital_id = $2 AND ativo = true RETURNING id',
            [id, req.hospital.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Paciente não encontrado.' });
        res.json({ mensagem: 'Pedido encerrado. Obrigado por cuidar de quem precisa!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao encerrar: ' + erro.message });
    }
});

// HOSPITAL: chama por email os padrinhos deste paciente que ja podem doar (no maximo 1 vez por semana).
router.post('/:id/chamar', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Paciente invalido.' });
    try {
        const rCaso = await pool.query(
            'SELECT * FROM casos_apadrinhamento WHERE id = $1 AND hospital_id = $2 AND ativo = true',
            [id, req.hospital.id]
        );
        if (rCaso.rows.length === 0) return res.status(404).json({ erro: 'Paciente não encontrado.' });
        const caso = rCaso.rows[0];

        const espera = podeChamarAgora(caso.ultima_chamada);
        if (!espera.pode) {
            return res.status(409).json({
                erro: 'Os padrinhos deste paciente já foram chamados há pouco. Novo chamado em ' + espera.diasRestantes
                    + (espera.diasRestantes === 1 ? ' dia.' : ' dias.')
            });
        }

        const rPad = await pool.query(
            `SELECT d.id, u.nome, u.email, d.sexo, d.ultima_doacao, d.ultimo_alerta
               FROM padrinhos p
               JOIN doadores d ON d.id = p.doador_id
               JOIN usuarios u ON u.id = d.usuario_id
              WHERE p.caso_id = $1`,
            [caso.id]
        );
        const { convocados, resumo } = selecionarPadrinhosParaChamada(rPad.rows);

        if (convocados.length > 0) {
            const ids = convocados.map((d) => d.id);
            const marcadores = ids.map((_, i) => '$' + (i + 1)).join(', ');
            await pool.query('UPDATE doadores SET ultimo_alerta = CURRENT_DATE WHERE id IN (' + marcadores + ')', ids);
            await pool.query('UPDATE casos_apadrinhamento SET ultima_chamada = CURRENT_DATE WHERE id = $1', [caso.id]);

            const rNome = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.usuario.id]);
            const hospital = escaparHtml(rNome.rows[0] ? rNome.rows[0].nome : 'Um hospital');

            for (const padrinho of convocados) {
                resend.emails.send({
                    from: 'Hemare <onboarding@resend.dev>',
                    to: padrinho.email,
                    subject: '💝 Seu afilhado ' + caso.apelido + ' precisa de você',
                    html: `
                        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                            <h2 style="color: #c8102e;">🩸 Hemare — Chamado de padrinho</h2>
                            <p>Olá, ${escaparHtml(padrinho.nome)}!</p>
                            <p>Você é padrinho (ou madrinha) de <strong>${escaparHtml(caso.apelido)}</strong>, paciente do
                            <strong>${hospital}</strong>, que precisa de sangue do tipo
                            <strong style="color:#c8102e;">${escaparHtml(caso.tipo_sanguineo)}</strong> com regularidade.</p>
                            <p>Pelo intervalo desde a sua última doação, você <strong>já pode doar</strong>. Sua doação faz diferença de verdade.</p>
                            <p style="color:#666; font-size:13px;">Faça a triagem no Hemare antes de ir. Você recebe no máximo um chamado a cada
                            ${DIAS_ENTRE_ALERTAS} dias e pode deixar de ser padrinho quando quiser, na sua área.</p>
                        </div>
                    `
                }).catch(() => {});
            }
        }
        res.json({ ...resumo, mensagem: descreverChamada(resumo) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao chamar os padrinhos: ' + erro.message });
    }
});

// Acha o doador logado e quantos pacientes (ativos) ele ja apadrinha.
async function buscarDoador(usuario) {
    if (usuario.tipo !== 'doador') return { status: 403, erro: 'Só contas de doador podem apadrinhar.' };
    const r = await pool.query('SELECT * FROM doadores WHERE usuario_id = $1', [usuario.id]);
    if (r.rows.length === 0) return { status: 404, erro: 'Complete seu perfil (tipo sanguíneo) para apadrinhar.' };
    return { doador: r.rows[0] };
}

// DOADOR: vira padrinho de um paciente.
router.post('/:id/apadrinhar', autenticar, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Paciente invalido.' });
    try {
        const achado = await buscarDoador(req.usuario);
        if (achado.erro) return res.status(achado.status).json({ erro: achado.erro });
        const doador = achado.doador;

        const rCaso = await pool.query(
            `SELECT c.id, c.apelido, c.tipo_sanguineo, c.ativo
               FROM casos_apadrinhamento c JOIN hospitais h ON h.id = c.hospital_id
              WHERE c.id = $1 AND h.aprovado = true`,
            [id]
        );
        if (rCaso.rows.length === 0) return res.status(404).json({ erro: 'Paciente não encontrado.' });
        const caso = rCaso.rows[0];

        const rJa = await pool.query('SELECT id FROM padrinhos WHERE caso_id = $1 AND doador_id = $2', [caso.id, doador.id]);
        const rQtd = await pool.query(
            `SELECT COUNT(*) AS total FROM padrinhos p JOIN casos_apadrinhamento c ON c.id = p.caso_id
              WHERE p.doador_id = $1 AND c.ativo = true`,
            [doador.id]
        );
        const veredito = podeApadrinhar({
            tipoDoador: doador.tipo_sanguineo,
            tipoPaciente: caso.tipo_sanguineo,
            afilhadosAtuais: Number(rQtd.rows[0].total),
            jaEPadrinho: rJa.rows.length > 0,
            casoAtivo: caso.ativo === true
        });
        if (!veredito.pode) return res.status(409).json({ erro: veredito.motivo });

        await pool.query('INSERT INTO padrinhos (caso_id, doador_id) VALUES ($1, $2)', [caso.id, doador.id]);
        res.status(201).json({ mensagem: '💝 Você agora é padrinho de ' + caso.apelido + '! Vamos te avisar quando puder doar.' });
    } catch (erro) {
        if (erro.code === '23505') return res.status(409).json({ erro: 'Você já é padrinho ou madrinha deste paciente.' });
        res.status(500).json({ erro: 'Erro ao apadrinhar: ' + erro.message });
    }
});

// DOADOR: deixa de ser padrinho (a qualquer momento, sem explicacao).
router.delete('/:id/apadrinhar', autenticar, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Paciente invalido.' });
    try {
        const achado = await buscarDoador(req.usuario);
        if (achado.erro) return res.status(achado.status).json({ erro: achado.erro });
        const r = await pool.query('DELETE FROM padrinhos WHERE caso_id = $1 AND doador_id = $2 RETURNING id', [id, achado.doador.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Você não é padrinho deste paciente.' });
        res.json({ mensagem: 'Pronto, você deixou de ser padrinho. Obrigado por ter ajudado!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao sair do apadrinhamento: ' + erro.message });
    }
});

// DOADOR: pacientes que ele apadrinha e se ja pode doar.
router.get('/meus-afilhados', autenticar, async (req, res) => {
    try {
        const achado = await buscarDoador(req.usuario);
        if (achado.erro) return res.status(achado.status).json({ erro: achado.erro });
        const doador = achado.doador;

        const r = await pool.query(
            `SELECT ${CAMPOS_CASO}
               FROM padrinhos p
               JOIN casos_apadrinhamento c ON c.id = p.caso_id
               JOIN hospitais h ON h.id = c.hospital_id
               JOIN usuarios u ON u.id = h.usuario_id
              WHERE p.doador_id = $1 AND c.ativo = true AND h.aprovado = true
              ORDER BY p.criado_em DESC`,
            [doador.id]
        );
        const contagem = await contarPadrinhos();
        const elegibilidade = (doador.sexo === 'M' || doador.sexo === 'F')
            ? verificarElegibilidade(doador.ultima_doacao, doador.sexo)
            : null;
        res.json({ afilhados: r.rows.map((l) => publicar(l, contagem)), elegibilidade });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar seus afilhados: ' + erro.message });
    }
});

module.exports = router;
