// Hemare - Dados da pagina "Status do desenvolvimento" do administrador: o relatorio (docs/STATUS.md) e o uso real do sistema.
// So NUMEROS agregados: nenhum nome, e-mail ou dado de saude passa por aqui.
const fs = require('fs');
const path = require('path');
const pool = require('../banco');

const RELATORIO = path.join(__dirname, '..', '..', 'docs', 'STATUS.md');

function lerRelatorio() {
    try {
        return fs.readFileSync(RELATORIO, 'utf8').replace(/\r\n/g, '\n');
    } catch (erro) {
        return null; // o servidor foi publicado sem a pasta docs/
    }
}

// Uma consulta que pode falhar sem derrubar a pagina (ex.: tabela de um recurso novo ainda nao criada).
async function opcional(sql, valores, padrao) {
    try {
        return (await pool.query(sql, valores)).rows;
    } catch (erro) {
        return padrao;
    }
}

const contagem = (linhas, chave) => Object.fromEntries(linhas.map((l) => [l[chave], Number(l.n)]));

async function usoDoSistema(agora) {
    const ha7dias = new Date((agora || new Date()).getTime() - 7 * 86400000);
    const [tipos, novos, hospitais, doacoes, agendamentos, feed] = await Promise.all([
        pool.query('SELECT tipo, COUNT(*) AS n FROM usuarios GROUP BY tipo'),
        pool.query('SELECT COUNT(*) AS n FROM usuarios WHERE criado_em >= $1', [ha7dias]),
        pool.query('SELECT COUNT(*) AS n FROM hospitais WHERE aprovado = true'),
        pool.query('SELECT COUNT(*) AS n FROM doacoes'),
        opcional('SELECT status, COUNT(*) AS n FROM agendamentos GROUP BY status', [], []),
        opcional('SELECT COUNT(*) AS n, MAX(coletada_em) AS ultima FROM noticias_feed', [], [{ n: 0, ultima: null }])
    ]);
    const porTipo = contagem(tipos.rows, 'tipo');
    return {
        contas: { doadores: porTipo.doador || 0, hospitais: porTipo.hospital || 0, administradores: porTipo.admin || 0, novasNos7Dias: Number(novos.rows[0].n) },
        hospitaisAprovados: Number(hospitais.rows[0].n),
        doacoesConfirmadas: Number(doacoes.rows[0].n),
        agendamentos: contagem(agendamentos, 'status'),
        noticias: { total: Number(feed[0].n), ultimaColeta: feed[0].ultima ? new Date(feed[0].ultima).toISOString() : null }
    };
}

async function montar() {
    return { relatorio: lerRelatorio(), uso: await usoDoSistema(), geradoEm: new Date().toISOString() };
}

module.exports = { montar, usoDoSistema, lerRelatorio };
