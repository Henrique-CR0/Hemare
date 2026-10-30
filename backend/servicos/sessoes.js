// Hemare - Encerrar sessoes de verdade.
// O JWT e "sem estado": enquanto nao expira, qualquer copia dele funciona. Para poder encerrar sessoes (trocou a senha,
// excluiu a conta, pediu "sair de todos os aparelhos") a tabela usuarios guarda "sessao_valida_apos": tokens emitidos ANTES
// desse instante deixam de valer. O valor fica em cache por poucos segundos para nao pesar em cada requisicao.
//
// Se a coluna ainda nao existe (db/ajustar-sessao.js nao rodou) tudo continua funcionando como antes: ninguem e barrado.
const pool = require('../banco');

const VALIDADE_DO_CACHE_MS = 30 * 1000;
const cache = new Map(); // usuarioId -> { valor: ms ou null, ate: ms }

// Instante (ms) antes do qual os tokens deste usuario nao valem mais, ou null.
async function validaApos(usuarioId) {
    const agora = Date.now();
    const guardado = cache.get(usuarioId);
    if (guardado && guardado.ate > agora) return guardado.valor;
    let valor = null;
    try {
        const r = await pool.query('SELECT sessao_valida_apos FROM usuarios WHERE id = $1', [usuarioId]);
        if (r.rows.length > 0 && r.rows[0].sessao_valida_apos) valor = new Date(r.rows[0].sessao_valida_apos).getTime();
    } catch (erro) {
        valor = null; // coluna ainda nao criada (ou banco indisponivel): nao derruba o site por causa disto
    }
    if (cache.size > 5000) cache.clear();
    cache.set(usuarioId, { valor, ate: agora + VALIDADE_DO_CACHE_MS });
    return valor;
}

// O token vale? iat e o instante de emissao (segundos). Emitido no mesmo segundo da revogacao ainda vale
// (e o login logo depois de trocar a senha).
function tokenRevogado(payload, validaApos_ms) {
    if (!validaApos_ms) return false;
    return Number(payload.iat) < Math.floor(validaApos_ms / 1000);
}

// Encerra todas as sessoes do usuario (menos as emitidas a partir de agora).
async function revogarTodas(usuarioId) {
    cache.delete(usuarioId);
    try {
        // Usa o relogio do servidor da aplicacao (o mesmo que carimba o "iat" do token), nao o do banco.
        await pool.query('UPDATE usuarios SET sessao_valida_apos = $1 WHERE id = $2', [new Date(), usuarioId]);
        return true;
    } catch (erro) {
        return false; // coluna ainda nao criada
    }
}

function limparCache() { cache.clear(); }

module.exports = { validaApos, tokenRevogado, revogarTodas, limparCache };
