// Hemare - Servidor de DEMONSTRACAO com banco simulado (pg-mem) e dados de exemplo, para ver as telas sem tocar no banco real.
// Nada e gravado de verdade: ao parar o servidor, tudo some. E-mails sao interceptados (nada sai).
//   npm run servir-teste        (sobe na porta 3000; deixe o frontend em http://localhost:5173)
//
// Contas (senha de todas: senha-de-teste-123):
//   admin@teste.local      administrador
//   aprovado@teste.local   hospital APROVADO, com horarios abertos para os proximos dias
//   pendente@teste.local   hospital em verificacao
//   lia@teste.local        doadora com 2 doacoes registradas na cadeia de confianca
//   caio@teste.local       doador que nunca doou
const path = require('path');
const bcrypt = require(require.resolve('bcrypt', { paths: [path.join(__dirname, '..')] }));
const { criarAmbiente } = require('./ambiente');

const amb = criarAmbiente(Number(process.env.PORT) || 3000);
const { pool, BACKEND } = amb;
const { calcularHash, GENESIS } = require(path.join(BACKEND, 'regras/cadeia'));
const { somarDias } = require(path.join(BACKEND, 'regras/campanha'));
const { hojeNoBrasil } = require(path.join(BACKEND, 'regras/agendamento'));

async function main() {
    // Todas as migracoes que existem na pasta db/ e que o teste conhece.
    const extras = ['ajustar-raros.js', 'ajustar-pcd.js', 'criar-apadrinhamento.js', 'criar-campanhas.js', 'criar-noticias.js', 'criar-agendamentos.js', 'criar-feriados.js']
        .filter((f) => require('fs').existsSync(path.join(BACKEND, 'db', f)));
    await amb.iniciar(extras);

    const senha = await bcrypt.hash('senha-de-teste-123', 10);
    const usuario = async (nome, email, tipo) =>
        (await pool.query('INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES ($1, $2, $3, $4) RETURNING id', [nome, email, senha, tipo])).rows[0].id;
    const hoje = hojeNoBrasil();

    await usuario('Admin Teste', 'admin@teste.local', 'admin');

    const hospital = async (nome, email, cnpj, cnes, aprovado) => {
        const id = await usuario(nome, email, 'hospital');
        return (await pool.query(
            `INSERT INTO hospitais (usuario_id, cnpj, cnes, cep, endereco, numero, bairro, cidade, estado, aprovado)
             VALUES ($1, $2, $3, '50070-000', 'Av. Agamenon Magalhaes', '1000', 'Derby', 'Recife', 'PE', $4) RETURNING id`, [id, cnpj, cnes, aprovado])).rows[0].id;
    };
    const idAprovado = await hospital('Hemocentro Aprovado', 'aprovado@teste.local', '11.222.333/0001-44', '1122334', true);
    await hospital('Hospital Santa Clara', 'pendente@teste.local', '12.345.678/0001-90', '2345678', false);

    // Horarios abertos: proximos 10 dias, de 08:00 as 11:00, de meia em meia hora.
    for (let n = 1; n <= 10; n++) {
        for (const hora of ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']) {
            await pool.query('INSERT INTO vagas_doacao (hospital_id, data, hora, capacidade) VALUES ($1, $2, $3, 2)', [idAprovado, somarDias(hoje, n), hora]);
        }
    }

    const doador = async (nome, email, sexo, ultimaDoacao, total) => {
        const id = await usuario(nome, email, 'doador');
        return (await pool.query(
            `INSERT INTO doadores (usuario_id, tipo_sanguineo, sexo, cidade, visibilidade, telefone, ultima_doacao, total_doacoes)
             VALUES ($1, 'O+', $2, 'Recife', 'identificado', '(81) 99999-0001', $3, $4) RETURNING id`, [id, sexo, ultimaDoacao, total])).rows[0].id;
    };
    const idLia = await doador('Lia Duarte', 'lia@teste.local', 'F', somarDias(hoje, -100), 2);
    await doador('Caio Dias', 'caio@teste.local', 'M', null, 0);

    // Duas doacoes da Lia, encadeadas de verdade.
    let anterior = GENESIS;
    for (const data of [somarDias(hoje, -280), somarDias(hoje, -100)]) {
        const hash = calcularHash(anterior, idLia, idAprovado, data);
        await pool.query('INSERT INTO doacoes (doador_id, hospital_id, data_doacao, hash, hash_anterior) VALUES ($1, $2, $3, $4, $5)', [idLia, idAprovado, data, hash, anterior]);
        anterior = hash;
    }
    console.log('Servidor de demonstracao pronto em ' + amb.URL + ' (contas na documentacao do arquivo testes/servir.js).');
}

main().catch((erro) => { console.error(erro); process.exit(1); });
