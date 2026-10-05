// Hemare - Registra uma doacao confirmada na cadeia de confianca (hash encadeado).
// Usado pela confirmacao normal do hospital e pela confirmacao de promessas de campanha,
// para que as duas sigam exatamente a mesma regra.
const pool = require('../banco');
const { calcularHash, GENESIS } = require('../regras/cadeia');

// Devolve { hash, doacaoId } se deu certo, ou { status, erro } se nao pode registrar.
async function registrarDoacao(hospitalId, doadorId) {
    const cliente = await pool.connect();
    try {
        const doador = await cliente.query('SELECT id FROM doadores WHERE id = $1', [doadorId]);
        if (doador.rows.length === 0) {
            return { status: 404, erro: 'Doador não encontrado.' };
        }

        const jaDoou = await cliente.query(
            'SELECT id FROM doacoes WHERE doador_id = $1 AND data_doacao = CURRENT_DATE',
            [doadorId]
        );
        if (jaDoou.rows.length > 0) {
            return { status: 400, erro: 'Esta doação já foi confirmada hoje.' };
        }

        await cliente.query('BEGIN');

        // Pega o hash do ULTIMO registro de toda a cadeia (nao so deste doador - a cadeia e global).
        const rUltimo = await cliente.query('SELECT hash FROM doacoes ORDER BY id DESC LIMIT 1');
        const hashAnterior = rUltimo.rows.length > 0 ? rUltimo.rows[0].hash : GENESIS;

        // Calcula o novo hash, ligado ao anterior (o "elo da corrente").
        const dataHoje = new Date().toISOString().slice(0, 10);
        const novoHash = calcularHash(hashAnterior, doadorId, hospitalId, dataHoje);

        const inserida = await cliente.query(
            'INSERT INTO doacoes (doador_id, hospital_id, hash, hash_anterior) VALUES ($1, $2, $3, $4) RETURNING id',
            [doadorId, hospitalId, novoHash, hashAnterior]
        );
        await cliente.query(
            'UPDATE doadores SET ultima_doacao = CURRENT_DATE, total_doacoes = COALESCE(total_doacoes,0) + 1 WHERE id = $1',
            [doadorId]
        );

        await cliente.query('COMMIT');
        return { hash: novoHash, doacaoId: inserida.rows[0].id };
    } catch (erro) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw erro;
    } finally {
        cliente.release();
    }
}

module.exports = { registrarDoacao };
