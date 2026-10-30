// Teste de ponta a ponta: campanhas de reposicao ("Quem doa por mim").
// Rode: node testes/e2e/campanha.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3072);
const { BACKEND, pool, emails, URL, api, conta, checar } = amb;
const perfilHosp = (cnpj) => ({ cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });

const dia = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function main() {
  await amb.iniciar(['criar-apadrinhamento.js', 'criar-campanhas.js']);

  const perfil = (tipo, sexo, cpf) => ({ tipoSanguineo: tipo, sexo, cidade: 'Recife', cpf, telefone: '8199990000' + cpf, visibilidade: 'anonimo' });
  const nova = (extra) => ({ autorizacao: true, apelido: 'Seu Antonio', metaBolsas: 3, ...extra });

  const tAna = await conta('Ana Amiga', 'ana@x.com', 'doador');
  await api('POST', '/doador/perfil', tAna, perfil('O-', 'F', '1'));
  const tBruno = await conta('Bruno Recente', 'bruno@x.com', 'doador');
  await api('POST', '/doador/perfil', tBruno, perfil('B+', 'M', '2'));
  const tSemPerfil = await conta('Sem Perfil', 'sp@x.com', 'doador');
  const tH1 = await conta('Hospital Um', 'h1@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH1, perfilHosp('11.111.111/0001-11'));
  const tH2 = await conta('Hospital Dois', 'h2@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH2, perfilHosp('22.222.222/0001-22'));
  const idAna = (await pool.query("SELECT d.id FROM doadores d JOIN usuarios u ON u.id = d.usuario_id WHERE u.email = 'ana@x.com'")).rows[0].id;
  const idBruno = (await pool.query("SELECT d.id FROM doadores d JOIN usuarios u ON u.id = d.usuario_id WHERE u.email = 'bruno@x.com'")).rows[0].id;
  await pool.query("UPDATE doadores SET ultima_doacao = CURRENT_DATE - 1 WHERE id = " + idBruno);

  console.log('--- Quem abre campanha ---');
  let r = await api('POST', '/campanha', tH1, nova());
  checar('Hospital pendente NAO abre (403)', r.status === 403, r);
  await pool.query('UPDATE hospitais SET aprovado = true');
  r = await api('POST', '/campanha', tAna, nova());
  checar('Doador NAO abre (403)', r.status === 403, r);
  r = await api('POST', '/campanha', null, nova());
  checar('Sem login (401)', r.status === 401, r);
  r = await api('POST', '/campanha', tH1, nova({ autorizacao: false }));
  checar('Sem autorizacao: 400', r.status === 400, r);
  r = await api('POST', '/campanha', tH1, nova({ apelido: 'Antonio Silva 12345678901' }));
  checar('Apelido com CPF: 400', r.status === 400, r);
  r = await api('POST', '/campanha', tH1, nova({ metaBolsas: 0 }));
  checar('Meta zero: 400', r.status === 400, r);
  r = await api('POST', '/campanha', tH1, nova());
  const codigo = r.dados && r.dados.codigo;
  checar('Hospital aprovado abre: 201 com codigo', r.status === 201 && /^[A-HJ-NP-Z2-9]{8}$/.test(codigo), r);

  console.log('--- Pagina publica ---');
  r = await api('GET', '/campanha/' + codigo);
  checar('Publica (sem login): meta 3, 0 doadas, aberta, 15 dias', r.status === 200 && r.dados.metaBolsas === 3 && r.dados.confirmadas === 0
    && r.dados.status === 'aberta' && r.dados.diasRestantes === 15 && r.dados.faltam === 3, r.dados);
  checar('Mostra apelido, hospital e cidade', r.dados.apelido === 'Seu Antonio' && r.dados.hospital === 'Hospital Um' && r.dados.cidade === 'Recife', r.dados);
  r = await api('GET', '/campanha/ABC');
  checar('Codigo malformado: 404', r.status === 404, r);
  r = await api('GET', '/campanha/ZZZZZZZZ');
  checar('Codigo inexistente: 404', r.status === 404, r);
  await pool.query('UPDATE hospitais SET aprovado = false WHERE id = 1');
  r = await api('GET', '/campanha/' + codigo);
  checar('Hospital sem aprovacao: campanha some (404)', r.status === 404, r);
  await pool.query('UPDATE hospitais SET aprovado = true WHERE id = 1');

  console.log('--- Prometer doacao ---');
  r = await api('POST', '/campanha/' + codigo + '/prometer', tSemPerfil, { data: dia(3) });
  checar('Sem perfil: 404', r.status === 404, r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tH1, { data: dia(3) });
  checar('Hospital NAO promete (403)', r.status === 403, r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tAna, { data: dia(-2) });
  checar('Data no passado: 400', r.status === 400, r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tAna, { data: dia(20) });
  checar('Depois do fim da campanha: 400', r.status === 400, r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tAna, { data: 'amanha' });
  checar('Data invalida: 400', r.status === 400, r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tBruno, { data: dia(3) });
  checar('Bruno doou ontem: ainda no intervalo (400)', r.status === 400 && r.dados.erro.includes('intervalo'), r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tAna, { data: dia(3) });
  checar('Ana promete: 201 e avisa que o hospital ve nome e telefone', r.status === 201 && r.dados.mensagem.includes('nome e telefone'), r);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tAna, { data: dia(4) });
  checar('Prometer de novo: 400', r.status === 400, r);
  r = await api('GET', '/campanha/' + codigo);
  checar('Publica mostra 1 prometida, sem dado da Ana', r.dados.prometidas === 1 && !JSON.stringify(r.dados).includes('Ana') && !JSON.stringify(r.dados).includes('ana@'), r.dados);

  console.log('--- Hospital ve as promessas ---');
  r = await api('GET', '/campanha/minhas', tH1);
  const camp = r.dados && r.dados[0];
  checar('Hospital dono ve nome, telefone e data da Ana', camp && camp.promessas.length === 1 && camp.promessas[0].nome === 'Ana Amiga'
    && camp.promessas[0].telefone === '81999900001' && camp.promessas[0].dataPrevista === dia(3) && camp.promessas[0].confirmada === false, r.dados);
  r = await api('GET', '/campanha/minhas', tH2);
  checar('Outro hospital NAO ve (lista vazia)', r.status === 200 && r.dados.length === 0, r.dados);
  r = await api('GET', '/campanha/minhas', tAna);
  checar('Doador NAO acessa /minhas (403)', r.status === 403, r);

  console.log('--- Confirmar doacao ---');
  r = await api('POST', '/campanha/' + codigo + '/confirmar', tH2, { doadorId: idAna });
  checar('Outro hospital NAO confirma (404)', r.status === 404, r);
  r = await api('POST', '/campanha/' + codigo + '/confirmar', tAna, { doadorId: idAna });
  checar('Doador NAO confirma (403)', r.status === 403, r);
  r = await api('POST', '/campanha/' + codigo + '/confirmar', tH1, { doadorId: idBruno });
  checar('Quem nao prometeu NAO e confirmado (404)', r.status === 404, r);
  r = await api('POST', '/campanha/' + codigo + '/confirmar', tH1, { doadorId: 'abc' });
  checar('doadorId invalido: 400', r.status === 400, r);
  r = await api('POST', '/campanha/' + codigo + '/confirmar', tH1, { doadorId: idAna });
  checar('Hospital confirma a doacao da Ana: 200 com hash', r.status === 200 && /^[0-9a-f]{64}$/.test(r.dados.hash), r);
  r = await api('POST', '/campanha/' + codigo + '/confirmar', tH1, { doadorId: idAna });
  checar('Confirmar de novo: 409', r.status === 409, r);
  r = await api('GET', '/campanha/' + codigo);
  checar('Progresso: 1 de 3 (33%), faltam 2, 0 prometidas pendentes', r.dados.confirmadas === 1 && r.dados.porcentagem === 33 && r.dados.faltam === 2 && r.dados.prometidas === 0, r.dados);
  r = await api('GET', '/hospital/cadeia/verificar');
  checar('Cadeia de confianca continua integra', r.dados.cadeiaIntegra === true && r.dados.totalRegistros === 1, r.dados);
  r = await api('GET', '/doador/conquistas', tAna);
  checar('Ana: 1 doacao e emblema Solidario', r.dados.totalDoacoes === 1 && r.dados.emblemas.find((e) => e.id === 'solidario').conquistado === true, r.dados.emblemas);
  r = await api('GET', '/doador/conquistas', tBruno);
  checar('Bruno nao tem o emblema', r.dados.emblemas.find((e) => e.id === 'solidario').conquistado === false);
  r = await api('GET', '/campanha/minhas-promessas', tAna);
  checar('Ana ve a promessa como confirmada', r.status === 200 && r.dados.length === 1 && r.dados[0].confirmada === true && r.dados[0].apelido === 'Seu Antonio', r.dados);
  r = await api('DELETE', '/campanha/' + codigo + '/prometer', tAna);
  checar('Nao cancela promessa ja confirmada (404)', r.status === 404, r);

  console.log('--- Desistir da promessa ---');
  await pool.query('UPDATE doadores SET ultima_doacao = NULL WHERE id = ' + idBruno);
  r = await api('POST', '/campanha/' + codigo + '/prometer', tBruno, { data: dia(5) });
  checar('Bruno (agora apto) promete: 201', r.status === 201, r);
  r = await api('DELETE', '/campanha/' + codigo + '/prometer', tBruno);
  checar('Bruno desiste: 200', r.status === 200, r);
  r = await api('GET', '/campanha/' + codigo);
  checar('Desistencia sai da contagem', r.dados.prometidas === 0, r.dados);

  console.log('--- Doacao normal do hospital continua igual ---');
  r = await api('POST', '/hospital/confirmar-doacao', tH1, { doadorId: idBruno });
  checar('Confirmar doacao normal: 200', r.status === 200, r);
  // (A regra "mesma pessoa no mesmo dia" compara com CURRENT_DATE no banco; o pg-mem guarda DATE com hora e nao a enxerga.
  //  Fica de fora aqui e vale no Postgres de verdade.)
  r = await api('POST', '/hospital/confirmar-doacao', tH1, { doadorId: 9999 });
  checar('Doador inexistente: 404', r.status === 404, r);

  console.log('--- Prazo e encerramento ---');
  await pool.query("UPDATE campanhas_reposicao SET expira_em = CURRENT_DATE - 1");
  r = await api('GET', '/campanha/' + codigo);
  checar('Passou do prazo: expirada e sem novas promessas', r.dados.status === 'expirada' && r.dados.aceitaPromessas === false, r.dados);
  await pool.query("UPDATE campanhas_reposicao SET expira_em = CURRENT_DATE + 10");
  r = await api('POST', '/campanha/' + codigo + '/encerrar', tH2);
  checar('Outro hospital NAO encerra (404)', r.status === 404, r);
  r = await api('POST', '/campanha/' + codigo + '/encerrar', tH1);
  checar('Dono encerra: 200', r.status === 200, r);
  r = await api('GET', '/campanha/' + codigo);
  checar('Publica mostra encerrada', r.dados.status === 'encerrada', r.dados);
  r = await api('GET', '/campanha/minhas', tH1);
  checar('Some da lista do hospital', r.dados.length === 0, r.dados);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
