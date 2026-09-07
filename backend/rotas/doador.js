// Hemare - Rotas do doador (completar/atualizar perfil).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');

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

module.exports = router;