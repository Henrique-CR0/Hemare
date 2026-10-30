// Hemare - "Minhas doacoes": historico do doador (doacoes confirmadas na cadeia de confianca, agendamentos,
// quantas vidas, quando fica apto de novo e quantas doacoes ainda cabem no ano).
//   GET /historico   (doador logado)
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { paraDia } = require('../regras/alerta');
const { montarHistorico, proximoPasso } = require('../regras/agendamento');

const router = express.Router();

router.use(autenticar, (req, res, next) => {
    if (req.usuario.tipo !== 'doador') return res.status(403).json({ erro: 'O histórico é para contas de doador.' });
    next();
});

// Consulta opcional: se a tabela de agendamentos ainda nao existe, o historico de doacoes continua funcionando.
async function opcional(sql, parametros) {
    try {
        return (await pool.query(sql, parametros || [])).rows;
    } catch (erro) {
        return [];
    }
}

// DOADOR: "Minhas doacoes": total, vidas, quando fica apto, limite do ano e linha do tempo com selo da cadeia.
router.get('/', async (req, res) => {
    try {
        const rD = await pool.query('SELECT id, sexo, ultima_doacao, total_doacoes FROM doadores WHERE usuario_id = $1', [req.usuario.id]);
        if (rD.rows.length === 0) return res.status(404).json({ erro: 'Complete seu perfil para ver o seu histórico.' });
        const doador = rD.rows[0];

        const doacoes = await opcional(
            `SELECT dc.id, dc.data_doacao, dc.hash, uh.nome AS hospital, h.cidade
               FROM doacoes dc JOIN hospitais h ON h.id = dc.hospital_id JOIN usuarios uh ON uh.id = h.usuario_id
              WHERE dc.doador_id = $1 ORDER BY dc.id DESC`, [doador.id]);
        const agendamentos = await opcional(
            `SELECT a.id, a.status, v.data, v.hora, uh.nome AS hospital, h.cidade
               FROM agendamentos a JOIN vagas_doacao v ON v.id = a.vaga_id
               JOIN hospitais h ON h.id = v.hospital_id JOIN usuarios uh ON uh.id = h.usuario_id
              WHERE a.doador_id = $1`, [doador.id]);

        const historico = montarHistorico(doacoes, agendamentos.map((a) => ({ ...a, data: paraDia(a.data) })), doador, paraDia(new Date()));
        res.json({ ...historico, proximoPasso: proximoPasso(historico.resumo) });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao montar o seu histórico: ' + erro.message });
    }
});

module.exports = router;
