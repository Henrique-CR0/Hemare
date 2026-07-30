// Hemare - Rotas do doador (completar/atualizar perfil).
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');

const router = express.Router();

// COMPLETAR PERFIL: salva (ou atualiza) os dados do doador logado.
// Protegida pelo "porteiro": so acessa quem esta logado.
router.post('/perfil', autenticar, async (req, res) => {
    // Quem esta logado vem do token (colocado pelo porteiro em req.usuario).
    const usuarioId = req.usuario.id;
    const { tipoSanguineo, sexo, cidade } = req.body;

    if (!tipoSanguineo || !sexo || !cidade) {
        return res.status(400).json({ erro: 'Preencha tipo sanguineo, sexo e cidade.' });
    }

    try {
        // Verifica se esse usuario ja tem perfil de doador.
        const existe = await pool.query('SELECT id FROM doadores WHERE usuario_id = $1', [usuarioId]);

        if (existe.rows.length > 0) {
            // Ja existe: atualiza.
            await pool.query(
                'UPDATE doadores SET tipo_sanguineo = $1, sexo = $2, cidade = $3 WHERE usuario_id = $4',
                [tipoSanguineo, sexo, cidade, usuarioId]
            );
        } else {
            // Nao existe: cria.
            await pool.query(
                'INSERT INTO doadores (usuario_id, tipo_sanguineo, sexo, cidade) VALUES ($1, $2, $3, $4)',
                [usuarioId, tipoSanguineo, sexo, cidade]
            );
        }

        res.json({ mensagem: 'Perfil salvo com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao salvar perfil: ' + erro.message });
    }
});

module.exports = router;