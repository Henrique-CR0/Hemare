// Hemare - "Previsao do tempo do sangue": agrupa o estoque por cidade, com um "clima" geral.
const express = require('express');
const pool = require('../banco');

const router = express.Router();

// Peso de cada nivel, para calcular a "pior" situacao de uma cidade.
const PESO_NIVEL = { emergencia: 4, critico: 3, alerta: 2, estavel: 1 };

router.get('/', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT h.cidade, h.estado, e.tipo_sanguineo, e.nivel
             FROM estoque e
             JOIN hospitais h ON h.id = e.hospital_id`
        );

        // Agrupa por cidade.
        const cidades = {};
        r.rows.forEach((linha) => {
            const chave = linha.cidade + '/' + linha.estado;
            if (!cidades[chave]) {
                cidades[chave] = { cidade: linha.cidade, estado: linha.estado, tipos: [], piorPeso: 0 };
            }
            cidades[chave].tipos.push({ tipo: linha.tipo_sanguineo, nivel: linha.nivel });
            const peso = PESO_NIVEL[linha.nivel] || 1;
            if (peso > cidades[chave].piorPeso) cidades[chave].piorPeso = peso;
        });

        // Traduz o pior peso em um "clima".
        const climas = { 1: 'sol', 2: 'nublado', 3: 'chuva', 4: 'tempestade' };
        const resultado = Object.values(cidades).map((c) => ({
            cidade: c.cidade,
            estado: c.estado,
            clima: climas[c.piorPeso] || 'sol',
            tipos: c.tipos
        }));

        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;