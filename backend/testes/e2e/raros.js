// Teste de ponta a ponta: rede de sangue raro.
// Rode: node testes/e2e/raros.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3075);
const { BACKEND, pool, emails, URL, api, conta, checar } = amb;
const perfilHosp = (cnpj) => ({ cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });

async function main() {
  await amb.iniciar(['ajustar-raros.js']);

  const entrar = (extra) => ({ participar: true, fenotipo: 'rh-nulo', alcance: 'estado', consentimento: true, ...extra });
  async function doador(nome, email, tipo, sexo, cidade, estado, telefone) {
    const t = await conta(nome, email, 'doador');
    await api('POST', '/doador/perfil', t, { tipoSanguineo: tipo, sexo, cidade, cpf: '529.982.247-25', telefone, visibilidade: 'anonimo' });
    await pool.query("UPDATE doadores SET estado = '" + estado + "' WHERE usuario_id = (SELECT id FROM usuarios WHERE email = '" + email + "')");
    return t;
  }
  const tRita = await doador('Rita Souza', 'rita@x.com', 'Rh nulo (sangue dourado)', 'F', 'Recife', 'PE', '81999990001');
  const tCaio = await doador('Caio Lima', 'caio@x.com', 'Rh nulo (sangue dourado)', 'M', 'Natal', 'RN', '84999990002');
  const tPaula = await doador('Paula Reis', 'paula@x.com', 'O-', 'F', 'Recife', 'PE', '81999990003');
  const tComum = await doador('Zeca Comum', 'zeca@x.com', 'A+', 'M', 'Recife', 'PE', '81999990004');
  const tSemTel = await doador('Sem Telefone', 'semtel@x.com', 'O+', 'F', 'Recife', 'PE', '');
  const tH1 = await conta('Hospital Recife', 'h1@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH1, perfilHosp('11.111.111/0001-11'));
  const tH2 = await conta('Hospital Manaus', 'h2@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH2, { ...perfilHosp('22.222.222/0001-22'), cidade: 'Natal', estado: 'RN' });
  const tH3 = await conta('Hospital Pendente', 'h3@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH3, { ...perfilHosp('33.333.333/0001-33'), cidade: 'Manaus', estado: 'AM' });
  await pool.query('UPDATE hospitais SET aprovado = true WHERE id IN (1, 2)');
  const idRita = (await pool.query("SELECT d.id FROM doadores d JOIN usuarios u ON u.id = d.usuario_id WHERE u.email = 'rita@x.com'")).rows[0].id;
  const idPaula = (await pool.query("SELECT d.id FROM doadores d JOIN usuarios u ON u.id = d.usuario_id WHERE u.email = 'paula@x.com'")).rows[0].id;

  console.log('--- Acesso e entrada na rede ---');
  let r = await api('GET', '/raros/eu');
  checar('Sem login (401)', r.status === 401, r);
  r = await api('GET', '/raros/eu', tH1);
  checar('Hospital NAO usa a area do doador (403)', r.status === 403, r);
  r = await api('GET', '/raros/eu', tRita);
  checar('Doador ve que ainda nao participa e a lista de fenotipos', r.status === 200 && r.dados.participa === false && r.dados.fenotipos.length === 5 && r.dados.perfilPronto === true, r.dados);
  r = await api('PUT', '/raros/eu', tRita, entrar({ consentimento: false }));
  checar('Sem consentimento: 400', r.status === 400, r);
  r = await api('PUT', '/raros/eu', tRita, entrar({ fenotipo: 'O-' }));
  checar('Fenotipo fora da lista: 400', r.status === 400, r);
  r = await api('PUT', '/raros/eu', tSemTel, entrar());
  checar('Sem telefone no perfil: 400', r.status === 400 && r.dados.erro.includes('telefone'), r);
  r = await api('PUT', '/raros/eu', tRita, entrar());
  const codigoRita = r.dados.codigo;
  checar('Rita entra: status declarado, com codigo de 8 caracteres', r.status === 200 && r.dados.participa === true && r.dados.status === 'declarado' && /^[A-HJ-NP-Z2-9]{8}$/.test(codigoRita), r.dados);
  r = await api('PUT', '/raros/eu', tCaio, entrar());
  const codigoCaio = r.dados.codigo;
  r = await api('PUT', '/raros/eu', tPaula, entrar({ fenotipo: 'bombay', alcance: 'pais' }));
  const codigoPaula = r.dados.codigo;
  checar('Codigos diferentes por pessoa', new Set([codigoRita, codigoCaio, codigoPaula]).size === 3);

  console.log('--- Sem confirmacao, a rede nao chama ninguem ---');
  r = await api('GET', '/raros/previa?fenotipo=rh-nulo', tH1);
  checar('Previa: rede vazia (declarados nao contam)', r.status === 200 && r.dados.resumo.naRede === 0, r.dados);
  const motivo = 'Paciente em cirurgia cardiaca sem unidade compativel no estoque.';
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'rh-nulo', motivo });
  checar('Pedido sem confirmados: nao cria e explica', r.status === 200 && r.dados.criado === false, r.dados);

  console.log('--- Hospital confere o laudo pelo codigo ---');
  r = await api('GET', '/raros/codigo/' + codigoRita, tRita);
  checar('Doador NAO usa a rota do hospital (403)', r.status === 403, r);
  r = await api('GET', '/raros/codigo/' + codigoRita, tH3);
  checar('Hospital pendente NAO consulta (403)', r.status === 403, r);
  r = await api('GET', '/raros/codigo/ZZZZZZZZ', tH1);
  checar('Codigo desconhecido: 404', r.status === 404, r);
  r = await api('GET', '/raros/codigo/ABC', tH1);
  checar('Codigo malformado: 404', r.status === 404, r);
  r = await api('GET', '/raros/codigo/' + codigoRita.toLowerCase(), tH1);
  checar('Hospital ve so o primeiro nome e o fenotipo declarado', r.status === 200 && r.dados.primeiroNome === 'Rita' && r.dados.fenotipo === 'rh-nulo' && r.dados.status === 'declarado', r.dados);
  checar('...sem telefone, e-mail, CPF nem sobrenome', !/9999|@|529|Souza/.test(JSON.stringify(r.dados)), r.dados);
  r = await api('POST', '/raros/codigo/' + codigoRita + '/confirmar', tH1);
  checar('Hospital confirma a Rita: 200', r.status === 200, r);
  r = await api('POST', '/raros/codigo/' + codigoRita + '/confirmar', tH1);
  checar('Confirmar de novo: 409', r.status === 409, r);
  await api('POST', '/raros/codigo/' + codigoCaio + '/confirmar', tH2);
  await api('POST', '/raros/codigo/' + codigoPaula + '/confirmar', tH1);
  r = await api('GET', '/raros/eu', tRita);
  checar('Rita agora esta confirmada', r.dados.status === 'confirmado' && r.dados.confirmadoEm !== null, r.dados);

  console.log('--- Previa so com numeros ---');
  r = await api('GET', '/raros/previa?fenotipo=rh-nulo', tH1);
  checar('Rede tem 2 (Rita e Caio); ao alcance do Recife: 1; chamaveis agora: 1', r.dados.resumo.naRede === 2 && r.dados.resumo.noAlcance === 1 && r.dados.resumo.convocados === 1, r.dados);
  checar('Previa NAO revela quem sao (sem nomes, e-mails ou ids)', !/Rita|Caio|@|"id"/.test(JSON.stringify(r.dados)), r.dados);
  r = await api('GET', '/raros/previa?fenotipo=xyz', tH1);
  checar('Previa com fenotipo invalido: 400', r.status === 400, r);

  console.log('--- Abrir o pedido ---');
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'rh-nulo', motivo: 'urgente' });
  checar('Motivo curto: 400', r.status === 400, r);
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'rh-nulo', motivo, apelidoPaciente: 'Maria 12345678901' });
  checar('Apelido com CPF: 400', r.status === 400, r);
  r = await api('POST', '/raros/pedidos', tH3, { fenotipo: 'rh-nulo', motivo });
  checar('Hospital pendente NAO abre pedido (403)', r.status === 403, r);
  r = await api('POST', '/raros/pedidos', tRita, { fenotipo: 'rh-nulo', motivo });
  checar('Doador NAO abre pedido (403)', r.status === 403, r);
  emails.length = 0;
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'rh-nulo', motivo, apelidoPaciente: 'Paciente Aurora' });
  const idPedido = r.dados.id;
  checar('Pedido criado: 1 doador chamado (so a Rita)', r.status === 201 && r.dados.criado === true && r.dados.resumo.convocados === 1, r.dados);
  checar('Um e-mail, para a Rita, sem dados dela nem o motivo clinico', emails.length === 1 && emails[0].to === 'rita@x.com'
    && !/9999|529|cirurgia|cardiaca/.test(emails[0].html) && emails[0].html.includes('Hospital Recife') && emails[0].subject.includes('Rh nulo'), emails.map((e) => [e.to, e.subject]));
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'rh-nulo', motivo });
  checar('Novo pedido: Rita ja foi chamada (espera de 7 dias), nada criado', r.status === 200 && r.dados.criado === false && emails.length === 1, r.dados);

  console.log('--- O doador responde ---');
  r = await api('GET', '/raros/eu', tRita);
  checar('Rita ve o chamado (hospital, cidade, prazo ~72h)', r.dados.chamados.length === 1 && r.dados.chamados[0].hospital === 'Hospital Recife'
    && r.dados.chamados[0].horasRestantes >= 71 && r.dados.chamados[0].resposta === null && r.dados.chamados[0].apelidoPaciente === 'Paciente Aurora', r.dados.chamados);
  r = await api('GET', '/raros/eu', tCaio);
  checar('Caio (fora do alcance) nao recebeu chamado', r.dados.chamados.length === 0, r.dados.chamados);
  r = await api('GET', '/raros/pedidos', tH1);
  checar('Hospital ainda NAO ve contato de ninguem (0 disponiveis, 1 sem resposta)', r.dados[0].disponiveis.length === 0 && r.dados[0].semResposta === 1 && r.dados[0].convocados === 1
    && !/9999|Rita/.test(JSON.stringify(r.dados)), r.dados);
  r = await api('POST', '/raros/convocacoes/' + idPedido + '/responder', tRita, { resposta: 'talvez' });
  checar('Resposta invalida: 400', r.status === 400, r);
  r = await api('POST', '/raros/convocacoes/' + idPedido + '/responder', tCaio, { resposta: 'disponivel' });
  checar('Quem nao foi chamado NAO responde (404)', r.status === 404, r);
  r = await api('POST', '/raros/convocacoes/999/responder', tRita, { resposta: 'disponivel' });
  checar('Pedido inexistente (404)', r.status === 404, r);
  r = await api('POST', '/raros/convocacoes/' + idPedido + '/responder', tH1, { resposta: 'disponivel' });
  checar('Hospital NAO responde por doador (403)', r.status === 403, r);
  r = await api('POST', '/raros/convocacoes/' + idPedido + '/responder', tRita, { resposta: 'disponivel' });
  checar('Rita responde "posso ajudar": 200', r.status === 200, r);
  r = await api('GET', '/raros/pedidos', tH1);
  checar('Agora o hospital ve nome e telefone da Rita (so dela)', r.dados[0].disponiveis.length === 1 && r.dados[0].disponiveis[0].nome === 'Rita Souza'
    && r.dados[0].disponiveis[0].telefone === '81999990001' && r.dados[0].semResposta === 0, r.dados[0]);
  r = await api('GET', '/raros/pedidos', tH2);
  checar('Outro hospital NAO ve esse pedido', r.status === 200 && r.dados.length === 0, r.dados);

  console.log('--- Confirmar a doacao ---');
  r = await api('POST', '/raros/pedidos/' + idPedido + '/confirmar-doacao', tH2, { doadorId: idRita });
  checar('Outro hospital NAO confirma (404)', r.status === 404, r);
  r = await api('POST', '/raros/pedidos/' + idPedido + '/confirmar-doacao', tH1, { doadorId: idPaula });
  checar('Quem nao respondeu neste pedido NAO e confirmado (404)', r.status === 404, r);
  r = await api('POST', '/raros/pedidos/' + idPedido + '/confirmar-doacao', tH1, { doadorId: 'abc' });
  checar('doadorId invalido: 400', r.status === 400, r);
  r = await api('POST', '/raros/pedidos/' + idPedido + '/confirmar-doacao', tH1, { doadorId: idRita });
  checar('Hospital confirma a doacao da Rita: 200 com selo', r.status === 200 && /^[0-9a-f]{64}$/.test(r.dados.hash), r);
  r = await api('POST', '/raros/pedidos/' + idPedido + '/confirmar-doacao', tH1, { doadorId: idRita });
  checar('Confirmar de novo: 409', r.status === 409, r);
  r = await api('GET', '/hospital/cadeia/verificar');
  checar('Cadeia de confianca integra', r.dados.cadeiaIntegra === true && r.dados.totalRegistros === 1, r.dados);
  r = await api('GET', '/doador/conquistas', tRita);
  checar('Rita: 1 doacao e emblema Rede de sangue raro', r.dados.totalDoacoes === 1 && r.dados.emblemas.find((e) => e.id === 'rede-rara').conquistado === true, r.dados.emblemas.map((e) => e.id + ':' + e.conquistado));
  r = await api('GET', '/doador/conquistas', tComum);
  checar('Doador comum nao tem o emblema', r.dados.emblemas.find((e) => e.id === 'rede-rara').conquistado === false);

  console.log('--- Encerrar e expirar ---');
  r = await api('POST', '/raros/pedidos/' + idPedido + '/encerrar', tH2);
  checar('Outro hospital NAO encerra (404)', r.status === 404, r);
  r = await api('POST', '/raros/pedidos/' + idPedido + '/encerrar', tH1);
  checar('Dono encerra: 200', r.status === 200, r);
  r = await api('GET', '/raros/pedidos', tH1);
  checar('Pedido encerrado: contatos protegidos de novo', r.dados[0].estado === 'encerrado' && r.dados[0].disponiveis.length === 0 && r.dados[0].disponiveisTotal === 1, r.dados[0]);
  r = await api('GET', '/raros/eu', tRita);
  checar('Some dos chamados da Rita', r.dados.chamados.length === 0, r.dados.chamados);
  r = await api('POST', '/raros/convocacoes/' + idPedido + '/responder', tRita, { resposta: 'indisponivel' });
  checar('Responder a pedido encerrado: 409', r.status === 409, r);

  await pool.query("INSERT INTO pedidos_raros (hospital_id, fenotipo, motivo, expira_em, convocados) VALUES (1, 'bombay', 'Pedido de teste para o limite de pedidos abertos.', NOW() + INTERVAL '2 days', 1), (1, 'bombay', 'Pedido de teste para o limite de pedidos abertos.', NOW() + INTERVAL '2 days', 1), (1, 'bombay', 'Pedido de teste para o limite de pedidos abertos.', NOW() + INTERVAL '2 days', 1)");
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'bombay', motivo });
  checar('3 pedidos abertos: o 4o e recusado (409)', r.status === 409, r);
  await pool.query("UPDATE pedidos_raros SET expira_em = NOW() - INTERVAL '1 hour' WHERE id > " + idPedido);
  r = await api('POST', '/raros/pedidos', tH1, { fenotipo: 'bombay', motivo });
  checar('Pedidos vencidos nao contam no limite (Paula, bombay, e chamada)', r.status === 201 && r.dados.resumo.convocados === 1, r.dados);
  const novoId = r.dados.id;
  await pool.query("UPDATE pedidos_raros SET expira_em = NOW() - INTERVAL '1 hour' WHERE id = " + novoId);
  r = await api('POST', '/raros/convocacoes/' + novoId + '/responder', tPaula, { resposta: 'disponivel' });
  checar('Responder a pedido expirado: 409', r.status === 409, r);

  console.log('--- Sair da rede e mudar de fenotipo ---');
  r = await api('PUT', '/raros/eu', tRita, { participar: false });
  checar('Rita sai da rede', r.status === 200 && r.dados.participa === false, r.dados);
  await pool.query('UPDATE doadores SET raro_ultima_notificacao = NULL');
  r = await api('GET', '/raros/previa?fenotipo=rh-nulo', tH1);
  checar('Quem saiu nao aparece mais na rede (so o Caio)', r.dados.resumo.naRede === 1, r.dados);
  r = await api('PUT', '/raros/eu', tRita, entrar());
  checar('Voltar com o mesmo fenotipo mantem a confirmacao', r.dados.status === 'confirmado', r.dados);
  r = await api('PUT', '/raros/eu', tRita, entrar({ fenotipo: 'bombay' }));
  checar('Mudar de fenotipo volta para "declarado"', r.dados.status === 'declarado' && r.dados.fenotipo === 'bombay', r.dados);

  console.log('--- Dados e exclusao de conta ---');
  const exp = await fetch(URL + '/perfil/exportar', { headers: { Authorization: 'Bearer ' + tRita } }).then((x) => x.json());
  checar('Exportar inclui a participacao na rede', exp.redeSangueRaro && exp.redeSangueRaro.fenotipo === 'bombay' && exp.redeSangueRaro.participa === true, exp.redeSangueRaro);
  r = await api('POST', '/perfil/excluir', tRita, { senha: 'senha-forte-123' });
  checar('Excluir a conta: 200', r.status === 200, r);
  const d = (await pool.query('SELECT * FROM doadores WHERE id = ' + idRita)).rows[0];
  checar('Dados da rede apagados (fenotipo, codigo, consentimento)', d.raro_fenotipo === null && d.raro_codigo === null && d.raro_consentimento === false && d.raro_status === null, d);
  const cv = (await pool.query('SELECT COUNT(*) AS n FROM convocacoes_raras WHERE doador_id = ' + idRita)).rows[0].n;
  checar('Chamado com doacao confirmada fica (sem dado pessoal); a cadeia segue integra', Number(cv) === 1 && (await api('GET', '/hospital/cadeia/verificar')).dados.cadeiaIntegra === true, cv);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
