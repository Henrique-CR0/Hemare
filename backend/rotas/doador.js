// Hemare - Rotas do doador (completar/atualizar perfil, conquistas e placar publico).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { calcularConquistas, montarPlacar } = require('../regras/gamificacao');
const { verificarElegibilidade } = require('../regras/elegibilidade');

const router = express.Router();

// COMPLETAR PERFIL: salva os dados do doador logado.
router.post('/perfil', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, sexo, cidade, nomeSocial, cpf, telefone, visibilidade } = req.body;

    if (!tipoSanguineo || !sexo || !cidade || !cpf) {
        return res.status(400).json({ erro: 'Preencha tipo sanguineo, sexo, cidade e CPF.' });
    }

    const vis = visibilidade === 'identificado' ? 'identificado' : 'anonimo';

    try {
        const existe = await pool.query('SELECT id FROM doadores WHERE usuario_id = $1', [usuarioId]);
        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE doadores SET tipo_sanguineo=$1, sexo=$2, cidade=$3, nome_social=$4, cpf=$5, telefone=$6, visibilidade=$7
                 WHERE usuario_id=$8`,
                [tipoSanguineo, sexo, cidade, nomeSocial || null, cpf || null, telefone || null, vis, usuarioId]
            );
        } else {
            await pool.query(
                `INSERT INTO doadores (usuario_id, tipo_sanguineo, sexo, cidade, nome_social, cpf, telefone, visibilidade)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [usuarioId, tipoSanguineo, sexo, cidade, nomeSocial || null, cpf || null, telefone || null, vis]
            );
        }
        res.json({ mensagem: 'Perfil salvo com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar perfil: ' + erro.message });
    }
});

// CONQUISTAS: nivel, emblemas e quando o doador logado pode doar de novo (gamificacao).
router.get('/conquistas', autenticar, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT d.id, d.tipo_sanguineo, d.sexo, d.visibilidade, d.ultima_doacao,
                    COALESCE(d.total_doacoes, 0) AS total_doacoes,
                    (SELECT COUNT(*) FROM doacoes x
                      WHERE x.doador_id = d.id AND x.data_doacao >= CURRENT_DATE - INTERVAL '12 months') AS doacoes_ultimo_ano
               FROM doadores d WHERE d.usuario_id = $1`,
            [req.usuario.id]
        );

        if (r.rows.length === 0) {
            return res.status(404).json({ erro: 'Complete seu perfil para ver suas conquistas.' });
        }

        const doa = r.rows[0];
        const conquistas = calcularConquistas({
            totalDoacoes: doa.total_doacoes,
            doacoesUltimoAno: Number(doa.doacoes_ultimo_ano),
            tipoSanguineo: doa.tipo_sanguineo,
            visibilidade: doa.visibilidade
        });

        // Quando pode doar de novo (so se o sexo estiver informado como M/F).
        const elegibilidade = (doa.sexo === 'M' || doa.sexo === 'F')
            ? verificarElegibilidade(doa.ultima_doacao, doa.sexo)
            : null;

        res.json({ ...conquistas, elegibilidade });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar conquistas: ' + erro.message });
    }
});

// PUBLICO: placar das cidades que mais doam (so numeros agregados, sem dados pessoais).
router.get('/placar', async (req, res) => {
    try {
        // Agrupa ignorando maiusculas e espacos ("Recife" e "recife " sao a mesma cidade).
        const r = await pool.query(
            `SELECT MIN(TRIM(cidade)) AS cidade,
                    COUNT(*) AS doadores,
                    COALESCE(SUM(total_doacoes), 0) AS doacoes
               FROM doadores
              WHERE cidade IS NOT NULL AND TRIM(cidade) <> ''
              GROUP BY LOWER(TRIM(cidade))`
        );
        res.json(montarPlacar(r.rows));
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao montar o placar: ' + erro.message });
    }
});

module.exports = router;