// Hemare - Porteiros por papel: usados DEPOIS do "autenticar".
const pool = require('../banco');
const { statusVerificacao, mensagemBloqueio } = require('../regras/verificacao');

// So deixa passar administradores.
function exigirAdmin(req, res, next) {
    if (req.usuario && req.usuario.tipo === 'admin') return next();
    return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
}

// So deixa passar hospitais com cadastro APROVADO por um administrador.
// Guarda a linha do hospital em req.hospital para a rota usar.
async function exigirHospitalAprovado(req, res, next) {
    if (!req.usuario || req.usuario.tipo !== 'hospital') {
        return res.status(403).json({ erro: 'Acesso restrito a hospitais.' });
    }
    try {
        const r = await pool.query('SELECT * FROM hospitais WHERE usuario_id = $1', [req.usuario.id]);
        if (r.rows.length === 0) {
            return res.status(400).json({ erro: 'Complete o perfil do hospital primeiro.' });
        }
        const hospital = r.rows[0];
        const status = statusVerificacao(hospital);
        if (status !== 'aprovado') {
            return res.status(403).json({ erro: mensagemBloqueio(status), statusVerificacao: status });
        }
        req.hospital = hospital;
        next();
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
}

module.exports = { exigirAdmin, exigirHospitalAprovado };
