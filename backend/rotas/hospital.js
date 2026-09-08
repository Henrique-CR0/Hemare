// Hemare - Rotas do hospital (perfil, necessidades, match).
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { doadoresCompativeis } = require('../regras/compatibilidade');

const router = express.Router();

// COMPLETAR/ATUALIZAR PERFIL do hospital (dados completos).
router.post('/perfil', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { cnpj, cnes, cep, endereco, numero, bairro, complemento, cidade, estado } = req.body;

    if (!cnpj || !cnes || !cidade || !estado || !cep || !endereco || !numero || !bairro) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    try {
        const existe = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE hospitais SET cnpj=$1, cnes=$2, cep=$3, endereco=$4, numero=$5, bairro=$6,
                 complemento=$7, cidade=$8, estado=$9 WHERE usuario_id=$10`,
                [cnpj, cnes, cep, endereco, numero, bairro, complemento || null, cidade, estado, usuarioId]
            );
        } else {
            await pool.query(
                `INSERT INTO hospitais (usuario_id, cnpj, cnes, cep, endereco, numero, bairro, complemento, cidade, estado)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
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
            `SELECT u.nome, h.cidade, h.estado, h.aprovado
             FROM hospitais h JOIN usuarios u ON u.id = h.usuario_id
             WHERE h.usuario_id = $1`,
            [usuarioId]
        );
        if (r.rows.length === 0) return res.json(null);
        res.json(r.rows[0]);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// PUBLICAR uma necessidade (o hospital pede um tipo sanguineo).
router.post('/necessidade', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, tipoDoacao, urgencia } = req.body;

    if (!tipoSanguineo) {
        return res.status(400).json({ erro: 'Informe o tipo sanguineo necessario.' });
    }

    try {
        const rHosp = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (rHosp.rows.length === 0) {
            return res.status(400).json({ erro: 'Complete o perfil do hospital primeiro.' });
        }
        const hospitalId = rHosp.rows[0].id;

        await pool.query(
            'INSERT INTO necessidades (hospital_id, tipo_sanguineo, tipo_doacao, urgencia) VALUES ($1, $2, $3, $4)',
            [hospitalId, tipoSanguineo, tipoDoacao || 'sangue', urgencia || 'normal']
        );

        // Se for urgente, notifica os doadores compativeis e identificados.
        if (urgencia === 'critico' || urgencia === 'emergencia') {
            const { doadoresCompativeis } = require('../regras/compatibilidade');
            const tipos = doadoresCompativeis(tipoSanguineo);

            if (tipos.length > 0) {
                // Busca doadores compativeis, identificados, com email.
                const rDoa = await pool.query(
                    `SELECT u.nome, u.email
                     FROM doadores d
                     JOIN usuarios u ON u.id = d.usuario_id
                     WHERE d.tipo_sanguineo = ANY($1) AND d.visibilidade = 'identificado'`,
                    [tipos]
                );

                // Pega o nome do hospital para o email.
                const rHospNome = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [usuarioId]);
                const nomeHospital = rHospNome.rows[0] ? rHospNome.rows[0].nome : 'Um hospital';

                // Dispara um email para cada doador (sem travar a resposta).
                for (const doa of rDoa.rows) {
                    resend.emails.send({
                        from: 'Hemare <onboarding@resend.dev>',
                        to: doa.email,
                        subject: '🚨 Precisa-se de sangue ' + tipoSanguineo + ' com urgência!',
                        html: `
                            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                                <h2 style="color: #c8102e;">🩸 Hemare — Chamado urgente</h2>
                                <p>Olá, ${doa.nome}!</p>
                                <p><strong>${nomeHospital}</strong> precisa de sangue do tipo
                                <strong style="color:#c8102e;">${tipoSanguineo}</strong> com urgência.</p>
                                <p>Seu tipo sanguíneo é compatível! Se você puder doar, sua ajuda pode salvar vidas hoje.</p>
                                <p style="color:#666; font-size:13px;">Confirme sua aptidão e encontre onde doar no Hemare.</p>
                            </div>
                        `
                    }).catch(() => {}); // silencioso: se um email falhar, nao quebra o resto
                }
            }
        }

        res.status(201).json({ mensagem: 'Necessidade publicada!' });
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

// MATCH: dado o id de uma necessidade, acha os doadores compativeis e aptos.
router.get('/match/:necessidadeId', autenticar, async (req, res) => {
    try {
        const rNec = await pool.query('SELECT * FROM necessidades WHERE id = $1', [req.params.necessidadeId]);
        if (rNec.rows.length === 0) return res.status(404).json({ erro: 'Necessidade nao encontrada.' });
        const tipoReceptor = rNec.rows[0].tipo_sanguineo;

        const tiposCompativeis = doadoresCompativeis(tipoReceptor);
        if (tiposCompativeis.length === 0) {
            return res.json({ tipoReceptor, tiposCompativeis: [], doadores: [] });
        }

        // Busca doadores compativeis (traz o telefone para decidir o que mostrar).
        const r = await pool.query(
            `SELECT u.nome, d.tipo_sanguineo, d.cidade, d.visibilidade, d.telefone
             FROM doadores d JOIN usuarios u ON u.id = d.usuario_id
             WHERE d.tipo_sanguineo = ANY($1)`,
            [tiposCompativeis]
        );

        // Minimizacao de dados (LGPD): contato so aparece se o doador consentiu (identificado).
        const doadores = r.rows.map((doa) => {
            const identificado = doa.visibilidade === 'identificado';
            return {
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

// DEFINIR/ATUALIZAR o nivel de estoque de um tipo sanguineo (hospital logado).
router.post('/estoque', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, nivel } = req.body;

    const niveisValidos = ['estavel', 'alerta', 'critico', 'emergencia'];
    if (!tipoSanguineo || !niveisValidos.includes(nivel)) {
        return res.status(400).json({ erro: 'Tipo sanguíneo e nível válidos são obrigatórios.' });
    }

    try {
        const rHosp = await pool.query('SELECT id FROM hospitais WHERE usuario_id = $1', [usuarioId]);
        if (rHosp.rows.length === 0) {
            return res.status(400).json({ erro: 'Complete o perfil do hospital primeiro.' });
        }
        const hospitalId = rHosp.rows[0].id;

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
             ORDER BY u.nome, e.tipo_sanguineo`
        );
        res.json(r.rows);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;