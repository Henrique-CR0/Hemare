// Hemare - Rotas de locais de doacao (lista publica, com busca opcional por cidade).
const express = require('express');
const pool = require('../banco');

const router = express.Router();

// LISTAR locais. Aceita ?cidade=Recife para filtrar.
router.get('/', async (req, res) => {
    const cidade = req.query.cidade;

    try {
        let resultado;
        if (cidade) {
            // Busca por cidade (ILIKE = ignora maiuscula/minuscula; % = "contem").
            resultado = await pool.query(
                'SELECT * FROM locais WHERE cidade ILIKE $1 OR estado ILIKE $1 ORDER BY nome',
                ['%' + cidade + '%']
            );
        } else {
            resultado = await pool.query('SELECT * FROM locais ORDER BY estado, nome');
        }
        res.json(resultado.rows);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar locais: ' + erro.message });
    }
});

module.exports = router;