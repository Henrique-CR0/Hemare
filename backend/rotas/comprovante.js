// Hemare - Comprovante de doacao verificavel (publico).
// O link/QR do comprovante leva o hash da doacao. Qualquer pessoa (ex.: o RH) abre e o
// sistema confere na cadeia de confianca se aquele registro e verdadeiro e nao foi alterado.
const express = require('express');
const pool = require('../banco');
const { GENESIS, verificarRegistro } = require('../regras/cadeia');
const { hashValido, mascararCpf } = require('../regras/comprovante');

const router = express.Router();

router.get('/:hash', async (req, res) => {
    const hash = req.params.hash;
    if (!hashValido(hash)) {
        return res.status(400).json({ erro: 'Código de comprovante inválido.' });
    }

    try {
        const r = await pool.query(
            `SELECT dc.id, dc.hash, dc.hash_anterior, dc.doador_id, dc.hospital_id, dc.data_doacao,
                    ud.nome AS doador_nome, d.cpf,
                    uh.nome AS hospital_nome, h.cidade, h.estado, h.cnes
               FROM doacoes dc
               JOIN doadores d ON d.id = dc.doador_id
               JOIN usuarios ud ON ud.id = d.usuario_id
               JOIN hospitais h ON h.id = dc.hospital_id
               JOIN usuarios uh ON uh.id = h.usuario_id
              WHERE dc.hash = $1`,
            [hash]
        );
        if (r.rows.length === 0) {
            return res.status(404).json({ erro: 'Nenhuma doação encontrada com este código.' });
        }
        const doacao = r.rows[0];

        // Hash do registro anterior na cadeia (ou GENESIS, se for o primeiro de todos).
        const rAnterior = await pool.query(
            'SELECT hash FROM doacoes WHERE id < $1 ORDER BY id DESC LIMIT 1',
            [doacao.id]
        );
        const hashDoAnterior = rAnterior.rows.length > 0 ? rAnterior.rows[0].hash : GENESIS;
        const verificacao = verificarRegistro(doacao, hashDoAnterior);

        // So o necessario para o comprovante (LGPD): nome, CPF mascarado, data e local.
        res.json({
            ...verificacao,
            codigo: doacao.hash,
            registro: doacao.id,
            doacao: {
                data: doacao.data_doacao,
                doador: doacao.doador_nome,
                cpf: mascararCpf(doacao.cpf),
                hospital: doacao.hospital_nome,
                cidade: doacao.cidade,
                estado: doacao.estado,
                cnes: doacao.cnes
            }
        });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

module.exports = router;
