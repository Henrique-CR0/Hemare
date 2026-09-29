// Hemare - Rotas do hospital (perfil, necessidades, match, estoque, doacoes, cadeia de confianca).
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirHospitalAprovado } = require('../middleware/exigirPapel');
const { statusVerificacao } = require('../regras/verificacao');
const { doadoresCompativeis } = require('../regras/compatibilidade');
const { selecionarDoadoresParaAlerta, descreverAlerta, DIAS_ENTRE_ALERTAS } = require('../regras/alerta');
const { escaparHtml } = require('../regras/html');
const { calcularHash, GENESIS } = require('../regras/cadeia');
const { registrarDoacao } = require('../servicos/registrarDoacao');

const router = express.Router();

// COMPLETAR/ATUALIZAR PERFIL do hospital (dados completos).
router.post('/perfil', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { cnpj, cnes, cep, endereco, numero, bairro, complemento, cidade, estado } = req.body;

    if (!cnpj || !cnes || !cidade || !estado || !cep || !endereco || !numero || !bairro) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    if (req.usuario.tipo !== 'hospital') {
        return res.status(403).json({ erro: 'Apenas contas de hospital podem ter perfil de hospital.' });
    }

    try {
        const existe = await pool.query('SELECT id, cnpj, cnes, aprovado FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (existe.rows.length > 0) {
            // Se o CNPJ ou o CNES mudar, o hospital volta para verificacao.
            // Reenviar os dados depois de uma recusa tambem volta para "pendente" (motivo apagado).
            const atual = existe.rows[0];
            const mudouIdentidade = atual.cnpj !== cnpj || atual.cnes !== cnes;
            const continuaAprovado = atual.aprovado === true && !mudouIdentidade;
            await pool.query(
                `UPDATE hospitais SET cnpj=$1, cnes=$2, cep=$3, endereco=$4, numero=$5, bairro=$6,
                 complemento=$7, cidade=$8, estado=$9, aprovado=$10, motivo_recusa=NULL
                 WHERE usuario_id=$11`,
                [cnpj, cnes, cep, endereco, numero, bairro, complemento || null, cidade, estado, continuaAprovado, usuarioId]
            );
        } else {
            // Todo hospital novo comeca PENDENTE: um administrador precisa aprovar.
            await pool.query(
                `INSERT INTO hospitais (usuario_id, cnpj, cnes, cep, endereco, numero, bairro, complemento, cidade, estado, aprovado)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)`,
                [usuarioId, cnpj, cnes, cep, endereco, numero, bairro, complemento || null, cidade, estado]
            );
        }
        res.json({ mensagem: 'Perfil do hospital salvo!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar perfil: ' + erro.message });
    }
});

// DADOS do hospital logado (nome, cidade, status de verificacao).
router.get('/meus-dados', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    try {
        const r = await pool.query(
            `SELECT u.nome, h.cidade, h.estado, h.aprovado, h.motivo_recusa
             FROM hospitais h JOIN usuarios u ON u.id = h.usuario_id
             WHERE h.usuario_id = $1`,
            [usuarioId]
        );
        if (r.rows.length === 0) return res.json(null);
        res.json({ ...r.rows[0], statusVerificacao: statusVerificacao(r.rows[0]) });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// PUBLICAR uma necessidade (o hospital pede um tipo sanguineo).
router.post('/necessidade', autenticar, exigirHospitalAprovado, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, tipoDoacao, urgencia } = req.body;

    if (!tipoSanguineo) {
        return res.status(400).json({ erro: 'Informe o tipo sanguineo necessario.' });
    }

    try {
        const hospitalId = req.hospital.id;

        await pool.query(
            'INSERT INTO necessidades (hospital_id, tipo_sanguineo, tipo_doacao, urgencia) VALUES ($1, $2, $3, $4)',
            [hospitalId, tipoSanguineo, tipoDoacao || 'sangue', urgencia || 'normal']
        );

        // ALERTA INTELIGENTE: so chama quem e compativel, identificado, apto hoje,
        // da mesma cidade e sem alerta recente (regra em regras/alerta.js).
        let alerta = null;
        if (urgencia === 'critico' || urgencia === 'emergencia') {
            const tipos = doadoresCompativeis(tipoSanguineo);
            const rDoa = await pool.query(
                `SELECT d.id, u.nome, u.email, d.tipo_sanguineo, d.sexo, d.cidade, d.visibilidade,
                        d.ultima_doacao, d.ultimo_alerta
                   FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
                  WHERE d.tipo_sanguineo = ANY($1)`,
                [tipos]
            );
            const cidade = req.hospital.cidade;
            const { convocados, resumo } = selecionarDoadoresParaAlerta(rDoa.rows, { tiposCompativeis: tipos, cidadeHospital: cidade });

            if (convocados.length > 0) {
                // Marca a data do alerta, para o mesmo doador nao ser chamado de novo em poucos dias.
                const ids = convocados.map((d) => d.id);
                const marcadores = ids.map((_, i) => '$' + (i + 1)).join(', ');
                await pool.query('UPDATE doadores SET ultimo_alerta = CURRENT_DATE WHERE id IN (' + marcadores + ')', ids);

                const rHospNome = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [usuarioId]);
                const nomeHospital = escaparHtml(rHospNome.rows[0] ? rHospNome.rows[0].nome : 'Um hospital');
                const tipo = escaparHtml(tipoSanguineo);

                for (const doa of convocados) {
                    resend.emails.send({
                        from: 'Hemare <onboarding@resend.dev>',
                        to: doa.email,
                        subject: '🚨 Precisa-se de sangue ' + tipoSanguineo + ' com urgência em ' + cidade + '!',
                        html: `
                            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                                <h2 style="color: #c8102e;">🩸 Hemare — Chamado urgente</h2>
                                <p>Olá, ${escaparHtml(doa.nome)}!</p>
                                <p><strong>${nomeHospital}</strong>, em ${escaparHtml(cidade)}, precisa de sangue do tipo
                                <strong style="color:#c8102e;">${tipo}</strong> com urgência.</p>
                                <p>Você foi chamado(a) porque seu tipo é compatível, você mora na mesma cidade e,
                                pelo intervalo desde a sua última doação, <strong>já pode doar</strong>.</p>
                                <p style="color:#666; font-size:13px;">Confirme sua aptidão na triagem do Hemare antes de ir.
                                Para não te incomodar, você recebe no máximo um chamado a cada ${DIAS_ENTRE_ALERTAS} dias.</p>
                            </div>
                        `
                    }).catch(() => {});
                }
            }
            alerta = { ...resumo, mensagem: descreverAlerta(resumo, cidade) };
        }

        res.status(201).json({
            mensagem: 'Necessidade publicada!' + (alerta ? ' ' + alerta.mensagem : ''),
            alerta
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao publicar: ' + erro.message });
    }
});

// LISTAR as necessidades do hospital logado.
router.get('/necessidades', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    try {
        const rHosp = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (rHosp.rows.length === 0) return res.json([]);
        const hospitalId = rHosp.rows[0].id;

        const r = await pool.query(
            'SELECT * FROM necessidades WHERE hospital_id = $1 ORDER BY criada_em DESC',
            [hospitalId]
        );
        res.json(r.rows);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// MATCH: dado o id de uma necessidade, acha os doadores compativeis.
// So o hospital aprovado DONO da necessidade ve os doadores (e o contato de quem consentiu).
router.get('/match/:necessidadeId', autenticar, exigirHospitalAprovado, async (req, res) => {
    try {
        const rNec = await pool.query(
            'SELECT * FROM necessidades WHERE id = $1 AND hospital_id = $2',
            [req.params.necessidadeId, req.hospital.id]
        );
        if (rNec.rows.length === 0) return res.status(404).json({ erro: 'Necessidade nao encontrada.' });
        const tipoReceptor = rNec.rows[0].tipo_sanguineo;

        const tiposCompativeis = doadoresCompativeis(tipoReceptor);
        if (tiposCompativeis.length === 0) {
            return res.json({ tipoReceptor, tiposCompativeis: [], doadores: [] });
        }

        const r = await pool.query(
            `SELECT d.id, u.nome, d.tipo_sanguineo, d.cidade, d.visibilidade, d.telefone
             FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
             WHERE d.tipo_sanguineo = ANY($1)`,
            [tiposCompativeis]
        );

        const doadores = r.rows.map((doa) => {
            const identificado = doa.visibilidade === 'identificado';
            return {
                doador_id: identificado ? doa.id : null,
                nome: identificado ? doa.nome : 'Doador anônimo',
                tipo_sanguineo: doa.tipo_sanguineo,
                cidade: doa.cidade,
                telefone: identificado ? (doa.telefone || 'Não informado') : null,
                identificado: identificado
            };
        });

        res.json({ tipoReceptor, tiposCompativeis, doadores });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// CONFIRMAR DOACAO: registra a doacao com hash encadeado (cadeia de confianca / auditabilidade).
router.post('/confirmar-doacao', autenticar, exigirHospitalAprovado, async (req, res) => {
    const { doadorId } = req.body;

    if (!doadorId) return res.status(400).json({ erro: 'Doador inválido.' });

    try {
        const resultado = await registrarDoacao(req.hospital.id, doadorId);
        if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
        res.json({ mensagem: 'Doação confirmada e registrada com selo de auditoria! 🩸🔗', hash: resultado.hash });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao confirmar: ' + erro.message });
    }
});

// PUBLICO: verifica a integridade de toda a cadeia de doacoes (auditoria).
router.get('/cadeia/verificar', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, doador_id, hospital_id, data_doacao, hash, hash_anterior FROM doacoes ORDER BY id ASC');
        let hashEsperado = GENESIS;
        let integra = true;
        const detalhes = [];

        for (const doacao of r.rows) {
            const dataFormatada = new Date(doacao.data_doacao).toISOString().slice(0, 10);
            const recalculado = calcularHash(hashEsperado, doacao.doador_id, doacao.hospital_id, dataFormatada);
            const bate = recalculado === doacao.hash;
            if (!bate) integra = false;
            detalhes.push({ id: doacao.id, valido: bate });
            hashEsperado = doacao.hash;
        }

        res.json({
            totalRegistros: r.rows.length,
            cadeiaIntegra: integra,
            mensagem: integra
                ? 'Todos os registros de doação estão íntegros e não foram adulterados.'
                : 'Atenção: foi detectada inconsistência em um ou mais registros.',
            detalhes
        });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// DEFINIR/ATUALIZAR o nivel de estoque de um tipo sanguineo (hospital logado).
router.post('/estoque', autenticar, exigirHospitalAprovado, async (req, res) => {
    const { tipoSanguineo, nivel } = req.body;

    const niveisValidos = ['estavel', 'alerta', 'critico', 'emergencia'];
    if (!tipoSanguineo || !niveisValidos.includes(nivel)) {
        return res.status(400).json({ erro: 'Tipo sanguíneo e nível válidos são obrigatórios.' });
    }

    try {
        const hospitalId = req.hospital.id;

        await pool.query(
            `INSERT INTO estoque (hospital_id, tipo_sanguineo, nivel, atualizado_em)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (hospital_id, tipo_sanguineo)
             DO UPDATE SET nivel = $3, atualizado_em = NOW()`,
            [hospitalId, tipoSanguineo, nivel]
        );
        res.json({ mensagem: 'Estoque atualizado!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao atualizar estoque: ' + erro.message });
    }
});

// LISTAR o estoque do hospital logado.
router.get('/estoque', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    try {
        const rHosp = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (rHosp.rows.length === 0) return res.json([]);
        const hospitalId = rHosp.rows[0].id;

        const r = await pool.query('SELECT tipo_sanguineo, nivel FROM estoque WHERE hospital_id = $1', [hospitalId]);
        res.json(r.rows);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// PUBLICO: lista o estoque de todos os hospitais (para o termometro publico).
router.get('/estoque-publico', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT u.nome AS hospital, h.cidade, h.estado, e.tipo_sanguineo, e.nivel, e.atualizado_em
             FROM estoque e
             JOIN hospitais h ON h.id = e.hospital_id
             JOIN usuarios u ON u.id = h.usuario_id
             WHERE h.aprovado = true
             ORDER BY u.nome, e.tipo_sanguineo`
        );
        res.json(r.rows);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;