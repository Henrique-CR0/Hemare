// Hemare - Tarefa automatica: coleta os feeds de noticias (ao ligar o servidor e a cada hora).
// Para desligar (ex.: servidor de testes): COLETAR_NOTICIAS=nao no .env. Tambem da para rodar na mao:  node tarefas/coletarNoticias.js
require('dotenv').config();
const pool = require('../banco');
const { coletar } = require('../servicos/coletorNoticias');

const INTERVALO_MINUTOS = 60;

async function rodada() {
    try {
        const r = await coletar();
        const falhas = r.fontes.filter((f) => !f.ok).map((f) => f.id);
        console.log('📰 Notícias coletadas: ' + r.novos + ' novas' + (falhas.length ? ' (fora do ar: ' + falhas.join(', ') + ')' : ''));
        return r;
    } catch (erro) {
        console.log('⚠️  Coleta de notícias não rodou: ' + erro.message);
        return null;
    }
}

function agendarColetaDeNoticias() {
    if (process.env.COLETAR_NOTICIAS === 'nao') return;
    setTimeout(rodada, 5 * 1000); // logo ao ligar, para a pagina nao ficar vazia
    setInterval(rodada, INTERVALO_MINUTOS * 60 * 1000).unref();
}

if (require.main === module) {
    rodada().finally(() => pool.end());
}

module.exports = { agendarColetaDeNoticias };
