// Hemare - Rotas do doador (completar/atualizar perfil).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

// COMPLETAR PERFIL: salva (ou atualiza) os dados do doador logado.
router.post('/perfil', autenticar, async (req, res) => {
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, sexo, cidade, nomeSocial, cpf } = req.body;

        if (!tipoSanguineo || !sexo || !cidade || !cpf) {
        return res.status(400).json({ erro: 'Preencha tipo sanguineo, sexo, cidade e CPF.' });
    }

    try {
        const existe = await pool.query('SELECT id FROM doadores WHERE usuario_id = $1', [usuarioId]);

        if (existe.rows.length > 0) {
            await pool.query(
                `UPDATE doadores SET tipo_sanguineo = $1, sexo = $2, cidade = $3, nome_social = $4, cpf = $5
                 WHERE usuario_id = $6`,
                [tipoSanguineo, sexo, cidade, nomeSocial || null, cpf || null, usuarioId]
            );
        } else {
            await pool.query(
                `INSERT INTO doadores (usuario_id, tipo_sanguineo, sexo, cidade, nome_social, cpf)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [usuarioId, tipoSanguineo, sexo, cidade, nomeSocial || null, cpf || null]
            );
        }

        res.json({ mensagem: 'Perfil salvo com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar perfil: ' + erro.message });
    }
});

module.exports = router;