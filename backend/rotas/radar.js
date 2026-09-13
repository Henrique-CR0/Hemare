// Hemare - Radar preditivo: estima quantos doadores de cada tipo ficarao aptos em breve.
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { verificarElegibilidade } = require('../regras/elegibilidade');

const router = express.Router();

router.get('/aptidao', autenticar, async (req, res) => {
    try {
        const r = await pool.query('SELECT tipo_sanguineo, sexo, ultima_doacao FROM doadores');

        // Um "balde" de contagem para cada tipo sanguineo encontrado.
        const baldes = {};

        r.rows.forEach((doa) => {
            if (!doa.sexo || (doa.sexo !== 'M' && doa.sexo !== 'F')) return;

            const tipo = doa.tipo_sanguineo;
            if (!baldes[tipo]) {
                baldes[tipo] = { tipo, aptoAgora: 0, em7Dias: 0, em30Dias: 0, maisDe30Dias: 0 };
            }

            const resultado = verificarElegibilidade(doa.ultima_doacao, doa.sexo);

            if (resultado.apto) {
                baldes[tipo].aptoAgora++;
            } else if (resultado.diasRestantes <= 7) {
                baldes[tipo].em7Dias++;
            } else if (resultado.diasRestantes <= 30) {
                baldes[tipo].em30Dias++;
            } else {
                baldes[tipo].maisDe30Dias++;
            }
        });

        res.json(Object.values(baldes));
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;