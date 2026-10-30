// Hemare - Agenda de doacao, lado do hospital e consulta publica de horarios.
//   GET    /agenda/hospitais                 hospitais aprovados com horarios livres (qualquer pessoa logada)
//   GET    /agenda/hospitais/:id/vagas       horarios livres de um hospital
//   POST   /agenda/vagas                     (hospital) abre vagas em lote
//   GET    /agenda/vagas                     (hospital) vagas do proprio hospital
//   PATCH  /agenda/vagas/:id                 (hospital) muda a capacidade
//   DELETE /agenda/vagas/:id                 (hospital) apaga uma vaga vazia
//   GET    /agenda/agendamentos?data=        (hospital) quem agendou para o dia
//   PATCH  /agenda/agendamentos/:id          (hospital) compareceu | faltou | cancelado
// O hospital ve so nome, tipo sanguineo e horario de quem agendou. Doacao confirmada entra na cadeia de confianca.
const express = require('express');
const pool = require('../banco');
const autenticar = require('../middleware/autenticar');
const { exigirHospitalAprovado } = require('../middleware/exigirPapel');
const { statusVerificacao } = require('../regras/verificacao');
const { paraDia } = require('../regras/alerta');
const { somarDias, dataValida } = require('../regras/campanha');
const A = require('../regras/agendamento');
const { registrarDoacao } = require('../servicos/registrarDoacao');

const router = express.Router();

const AVISO_MIGRACAO = 'O agendamento ainda não foi ativado no banco (rode db/criar-agendamentos.js).';

function idValido(texto) {
    return /^[0-9]{1,9}$/.test(String(texto)) ? Number(texto) : null;
}

function erroDeBanco(res, e, mensagem) {
    if (e.code === '42P01' || e.code === '42703') return res.status(500).json({ erro: AVISO_MIGRACAO });
    return res.status(500).json({ erro: mensagem + ': ' + e.message });
}

// Vaga ainda util para o doador: livre e com a antecedencia minima.
function vagaLivre(v, agora) {
    return v.reservadas < v.capacidade
        && A.momentoDaVaga(v.data, v.hora) >= agora.getTime() + A.ANTECEDENCIA_MIN_HORAS * 3600 * 1000;
}

// ===================== CONSULTA (doador ou qualquer pessoa logada) =====================

router.get('/hospitais', autenticar, async (req, res) => {
    try {
        const agora = new Date();
        const hoje = A.hojeNoBrasil(agora);
        const rH = await pool.query(
            'SELECT h.*, u.nome FROM hospitais h JOIN usuarios u ON u.id = h.usuario_id');
        const aprovados = rH.rows.filter((h) => statusVerificacao(h) === 'aprovado');
        const rV = await pool.query('SELECT hospital_id, data, hora, capacidade, reservadas FROM vagas_doacao WHERE data >= $1', [hoje]);
        const livresPorHospital = new Map();
        for (const v of rV.rows) {
            if (!vagaLivre({ ...v, data: paraDia(v.data) }, agora)) continue;
            const atual = livresPorHospital.get(v.hospital_id) || { vagas: 0, proxima: null };
            atual.vagas += v.capacidade - v.reservadas;
            const chave = paraDia(v.data) + ' ' + v.hora;
            if (!atual.proxima || chave < atual.proxima) atual.proxima = chave;
            livresPorHospital.set(v.hospital_id, atual);
        }
        const lista = aprovados
            .filter((h) => livresPorHospital.has(h.id))
            .map((h) => ({
                id: h.id, nome: h.nome, cidade: h.cidade, estado: h.estado,
                vagasLivres: livresPorHospital.get(h.id).vagas, proximoHorario: livresPorHospital.get(h.id).proxima
            }))
            .sort((a, b) => (a.proximoHorario < b.proximoHorario ? -1 : 1));
        res.json(lista);
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao listar hospitais com horários');
    }
});

router.get('/hospitais/:id/vagas', autenticar, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Hospital inválido.' });
    try {
        const agora = new Date();
        const rH = await pool.query('SELECT h.*, u.nome FROM hospitais h JOIN usuarios u ON u.id = h.usuario_id WHERE h.id = $1', [id]);
        if (rH.rows.length === 0 || statusVerificacao(rH.rows[0]) !== 'aprovado') {
            return res.status(404).json({ erro: 'Hospital não encontrado.' });
        }
        const rV = await pool.query(
            'SELECT id, data, hora, capacidade, reservadas FROM vagas_doacao WHERE hospital_id = $1 AND data >= $2 ORDER BY data, hora',
            [id, A.hojeNoBrasil(agora)]);
        const dias = new Map();
        for (const v of rV.rows) {
            const vaga = { ...v, data: paraDia(v.data) };
            if (!vagaLivre(vaga, agora)) continue;
            if (!dias.has(vaga.data)) dias.set(vaga.data, []);
            dias.get(vaga.data).push({ vagaId: vaga.id, hora: vaga.hora, livres: vaga.capacidade - vaga.reservadas });
        }
        const h = rH.rows[0];
        res.json({
            hospital: { id: h.id, nome: h.nome, cidade: h.cidade, estado: h.estado, endereco: [h.endereco, h.numero, h.bairro].filter(Boolean).join(', ') },
            dias: [...dias.entries()].map(([data, horarios]) => ({ data, horarios }))
        });
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao listar horários');
    }
});

// ===================== HOSPITAL: vagas =====================

router.post('/vagas', autenticar, exigirHospitalAprovado, async (req, res) => {
    const { erro, vagas } = A.validarLote(req.body, A.hojeNoBrasil(new Date()));
    if (erro) return res.status(400).json({ erro });
    try {
        const de = vagas[0].data, ate = vagas[vagas.length - 1].data;
        const rEx = await pool.query('SELECT data, hora FROM vagas_doacao WHERE hospital_id = $1 AND data >= $2 AND data <= $3', [req.hospital.id, de, ate]);
        const existentes = new Set(rEx.rows.map((v) => paraDia(v.data) + ' ' + v.hora));
        let criadas = 0;
        for (const v of vagas) {
            if (existentes.has(v.data + ' ' + v.hora)) continue;
            await pool.query('INSERT INTO vagas_doacao (hospital_id, data, hora, capacidade) VALUES ($1, $2, $3, $4)', [req.hospital.id, v.data, v.hora, v.capacidade]);
            criadas++;
        }
        res.status(201).json({
            criadas, jaExistiam: vagas.length - criadas,
            mensagem: criadas > 0 ? '📅 ' + criadas + ' horário(s) aberto(s) para agendamento.' : 'Esses horários já estavam abertos.'
        });
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao abrir os horários');
    }
});

router.get('/vagas', autenticar, exigirHospitalAprovado, async (req, res) => {
    const hoje = A.hojeNoBrasil(new Date());
    const de = req.query.de === undefined ? hoje : req.query.de;
    const ate = req.query.ate === undefined ? somarDias(hoje, A.MAX_DIAS_A_FRENTE) : req.query.ate;
    if (!dataValida(de) || !dataValida(ate)) return res.status(400).json({ erro: 'Use datas no formato AAAA-MM-DD em "de" e "ate".' });
    try {
        const r = await pool.query(
            'SELECT id, data, hora, capacidade, reservadas FROM vagas_doacao WHERE hospital_id = $1 AND data >= $2 AND data <= $3 ORDER BY data, hora',
            [req.hospital.id, de, ate]);
        res.json(r.rows.map((v) => ({ id: v.id, data: paraDia(v.data), hora: v.hora, capacidade: v.capacidade, reservadas: v.reservadas })));
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao listar as vagas');
    }
});

router.patch('/vagas/:id', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Vaga inválida.' });
    try {
        const r = await pool.query('SELECT id, capacidade, reservadas FROM vagas_doacao WHERE id = $1 AND hospital_id = $2', [id, req.hospital.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Horário não encontrado.' });
        const conferido = A.validarCapacidade(req.body && req.body.capacidade, r.rows[0].reservadas);
        if (conferido.erro) return res.status(400).json({ erro: conferido.erro });
        // O WHERE confere de novo: se alguem reservou entre a leitura e a escrita, nao reduz abaixo das reservas.
        const u = await pool.query(
            'UPDATE vagas_doacao SET capacidade = $1 WHERE id = $2 AND hospital_id = $3 AND reservadas <= $1 RETURNING id, data, hora, capacidade, reservadas',
            [conferido.capacidade, id, req.hospital.id]);
        if (u.rows.length === 0) return res.status(409).json({ erro: 'Alguém acabou de agendar este horário. Tente de novo.' });
        const v = u.rows[0];
        res.json({ id: v.id, data: paraDia(v.data), hora: v.hora, capacidade: v.capacidade, reservadas: v.reservadas });
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao mudar a capacidade');
    }
});

router.delete('/vagas/:id', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ erro: 'Vaga inválida.' });
    try {
        const r = await pool.query('SELECT id, reservadas FROM vagas_doacao WHERE id = $1 AND hospital_id = $2', [id, req.hospital.id]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'Horário não encontrado.' });
        const pode = A.podeApagarVaga(r.rows[0]);
        if (!pode.ok) return res.status(409).json({ erro: pode.erro });
        const antigos = await pool.query('SELECT id FROM agendamentos WHERE vaga_id = $1', [id]); // cancelados antigos seguram a chave
        if (antigos.rows.length > 0) return res.status(409).json({ erro: 'Este horário tem histórico de agendamentos e não pode ser apagado. Reduza a capacidade se quiser.' });
        await pool.query('DELETE FROM vagas_doacao WHERE id = $1 AND hospital_id = $2 AND reservadas = 0', [id, req.hospital.id]);
        res.status(204).end();
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao apagar o horário');
    }
});

// ===================== HOSPITAL: quem agendou =====================

router.get('/agendamentos', autenticar, exigirHospitalAprovado, async (req, res) => {
    const data = req.query.data === undefined ? A.hojeNoBrasil(new Date()) : req.query.data;
    if (!dataValida(data)) return res.status(400).json({ erro: 'Use a data no formato AAAA-MM-DD.' });
    try {
        const r = await pool.query(
            `SELECT a.id, a.status, v.data, v.hora, u.nome, d.nome_social, d.tipo_sanguineo, d.visibilidade, d.telefone
               FROM agendamentos a
               JOIN vagas_doacao v ON v.id = a.vaga_id
               JOIN doadores d ON d.id = a.doador_id
               JOIN usuarios u ON u.id = d.usuario_id
              WHERE v.hospital_id = $1 AND v.data = $2
              ORDER BY v.hora, a.id`,
            [req.hospital.id, data]);
        res.json({
            data,
            agendamentos: r.rows.filter((a) => a.status !== 'cancelado').map((a) => ({
                id: a.id, status: a.status, hora: a.hora, ...A.visaoDoAgendado(a)
            }))
        });
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao listar os agendamentos');
    }
});

router.patch('/agendamentos/:id', autenticar, exigirHospitalAprovado, async (req, res) => {
    const id = idValido(req.params.id);
    const novoStatus = req.body && req.body.status;
    if (!id) return res.status(400).json({ erro: 'Agendamento inválido.' });
    try {
        const r = await pool.query(
            `SELECT a.id, a.status, a.doador_id, a.vaga_id, v.data, v.hora
               FROM agendamentos a JOIN vagas_doacao v ON v.id = a.vaga_id
              WHERE a.id = $1 AND v.hospital_id = $2`,
            [id, req.hospital.id]);
        const ag = r.rows[0];
        const vaga = ag ? { data: paraDia(ag.data), hora: ag.hora } : null;
        const pode = A.podeMudarStatus(ag, novoStatus, vaga, new Date());
        if (!pode.ok) return res.status(pode.status).json({ erro: pode.erro });

        if (novoStatus === 'compareceu') {
            const resultado = await registrarDoacao(req.hospital.id, ag.doador_id);
            if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
            await pool.query("UPDATE agendamentos SET status = 'compareceu', doacao_id = $1, atualizado_em = NOW() WHERE id = $2", [resultado.doacaoId, id]);
            return res.json({ id, status: 'compareceu', selo: resultado.hash, mensagem: '✅ Doação confirmada e registrada na cadeia de confiança.' });
        }
        if (novoStatus === 'cancelado') {
            await pool.query("UPDATE agendamentos SET status = 'cancelado', atualizado_em = NOW() WHERE id = $1", [id]);
            await pool.query('UPDATE vagas_doacao SET reservadas = reservadas - 1 WHERE id = $1 AND reservadas > 0', [ag.vaga_id]);
            return res.json({ id, status: 'cancelado', mensagem: 'Agendamento cancelado e vaga liberada.' });
        }
        await pool.query("UPDATE agendamentos SET status = 'faltou', atualizado_em = NOW() WHERE id = $1", [id]);
        res.json({ id, status: 'faltou', mensagem: 'Falta registrada.' });
    } catch (e) {
        erroDeBanco(res, e, 'Erro ao atualizar o agendamento');
    }
});

module.exports = router;
