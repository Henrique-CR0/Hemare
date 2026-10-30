// Teste de ponta a ponta: apadrinhamento de pacientes.
// Rode: node testes/e2e/apadrinhamento.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3071);
const { BACKEND, pool, emails, URL, api, conta, checar } = amb;
const perfilHosp = (cnpj) => ({ cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });

async function main() {
  await amb.iniciar(['criar-apadrinhamento.js']);

  const perfil = (tipo, sexo, cpf) => ({ tipoSanguineo: tipo, sexo, cidade: 'Recife', cpf, visibilidade: 'anonimo' });
  const caso = (extra) => ({ autorizacao: true, apelido: 'Paciente Aurora', tipoSanguineo: 'A+', condicao: 'Talassemia', frequenciaDias: 30, ...extra });

  const tAna = await conta('Ana Padrinha', 'ana@x.com', 'doador');
  await api('POST', '/doador/perfil', tAna, perfil('O-', 'F', '1'));
  const tBruno = await conta('Bruno B', 'bruno@x.com', 'doador');
  await api('POST', '/doador/perfil', tBruno, perfil('B+', 'M', '2'));
  const tSemPerfil = await conta('Sem Perfil', 'sp@x.com', 'doador');
  const tH1 = await conta('Hospital Um', 'h1@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH1, perfilHosp('11.111.111/0001-11'));
  const tH2 = await conta('Hospital Dois', 'h2@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH2, perfilHosp('22.222.222/0001-22'));

  console.log('--- Quem pode cadastrar pacientes ---');
  let r = await api('POST', '/apadrinhamento', tH1, caso());
  checar('Hospital pendente NAO cadastra (403)', r.status === 403, r);
  await pool.query('UPDATE hospitais SET aprovado = true');
  r = await api('POST', '/apadrinhamento', tAna, caso());
  checar('Doador NAO cadastra (403)', r.status === 403, r);
  r = await api('POST', '/apadrinhamento', null, caso());
  checar('Sem login (401)', r.status === 401, r);
  r = await api('POST', '/apadrinhamento', tH1, caso({ autorizacao: false }));
  checar('Sem autorizacao do paciente: 400', r.status === 400, r);
  r = await api('POST', '/apadrinhamento', tH1, caso({ apelido: 'Maria 12345678901' }));
  checar('Apelido com CPF: 400', r.status === 400, r);
  r = await api('POST', '/apadrinhamento', tH1, caso({ condicao: 'Historia longa e identificavel' }));
  checar('Condicao em texto livre: 400', r.status === 400, r);
  r = await api('POST', '/apadrinhamento', tH1, caso());
  const idCaso = r.dados && r.dados.id;
  checar('Hospital aprovado cadastra: 201', r.status === 201 && idCaso > 0, r);

  console.log('--- Lista publica ---');
  r = await api('GET', '/apadrinhamento');
  const item = r.dados && r.dados.casos && r.dados.casos[0];
  checar('Publica (sem login) mostra o paciente', r.status === 200 && r.dados.casos.length === 1, r);
  checar('Mostra apelido, tipo, hospital, cidade e meta', item && item.apelido === 'Paciente Aurora' && item.tipoSanguineo === 'A+'
    && item.hospital === 'Hospital Um' && item.cidade === 'Recife' && item.meta === 6 && item.padrinhos === 0, item);
  await pool.query('UPDATE hospitais SET aprovado = false WHERE id = 1');
  r = await api('GET', '/apadrinhamento');
  checar('Hospital que perdeu a aprovacao some da lista', r.dados.casos.length === 0, r.dados);
  await pool.query('UPDATE hospitais SET aprovado = true WHERE id = 1');

  console.log('--- Apadrinhar ---');
  r = await api('POST', '/apadrinhamento/abc/apadrinhar', tAna);
  checar('id invalido: 400', r.status === 400, r);
  r = await api('POST', '/apadrinhamento/999/apadrinhar', tAna);
  checar('paciente inexistente: 404', r.status === 404, r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/apadrinhar', tSemPerfil);
  checar('Sem perfil de doador: 404', r.status === 404, r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/apadrinhar', tH1);
  checar('Hospital NAO apadrinha (403)', r.status === 403, r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/apadrinhar', tBruno);
  checar('Tipo incompativel (B+ para A+): 409 com motivo', r.status === 409 && r.dados.erro.includes('B+'), r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/apadrinhar', tAna);
  checar('Ana (O-) apadrinha: 201', r.status === 201, r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/apadrinhar', tAna);
  checar('Apadrinhar de novo: 409', r.status === 409, r);
  r = await api('GET', '/apadrinhamento');
  checar('Lista mostra 1 padrinho e nenhum dado dele', r.dados.casos[0].padrinhos === 1
    && !JSON.stringify(r.dados).includes('Ana') && !JSON.stringify(r.dados).includes('ana@'), r.dados);

  console.log('--- Meus afilhados e emblema ---');
  r = await api('GET', '/apadrinhamento/meus-afilhados', tAna);
  checar('Ana ve 1 afilhado e que esta apta', r.status === 200 && r.dados.afilhados.length === 1 && r.dados.elegibilidade.apto === true, r.dados);
  r = await api('GET', '/doador/conquistas', tAna);
  checar('Ana ganha o emblema Padrinho', r.dados.emblemas.find((e) => e.id === 'padrinho').conquistado === true);
  r = await api('GET', '/doador/conquistas', tBruno);
  checar('Bruno nao tem o emblema', r.dados.emblemas.find((e) => e.id === 'padrinho').conquistado === false);

  console.log('--- Chamar padrinhos ---');
  r = await api('GET', '/apadrinhamento/meus-casos', tH1);
  checar('Hospital ve o proprio paciente, 1 padrinho, pode chamar', r.dados.length === 1 && r.dados[0].padrinhos === 1 && r.dados[0].chamada.pode === true, r.dados);
  checar('...sem ver quem sao os padrinhos', !JSON.stringify(r.dados).includes('Ana') && !JSON.stringify(r.dados).includes('ana@'), r.dados);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/chamar', tH2);
  checar('Outro hospital NAO chama (404)', r.status === 404, r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/chamar', tAna);
  checar('Doador NAO chama (403)', r.status === 403, r);
  emails.length = 0;
  r = await api('POST', '/apadrinhamento/' + idCaso + '/chamar', tH1);
  checar('Hospital chama: 1 padrinho convocado', r.status === 200 && r.dados.convocados === 1, r);
  checar('Email foi para a Ana e cita o afilhado', emails.length === 1 && emails[0].to === 'ana@x.com' && emails[0].subject.includes('Paciente Aurora'), emails.map((e) => [e.to, e.subject]));
  r = await api('POST', '/apadrinhamento/' + idCaso + '/chamar', tH1);
  checar('Segundo chamado na mesma semana: 409', r.status === 409 && emails.length === 1, r);

  console.log('--- Limite de afilhados por doador ---');
  for (const apelido of ['Paciente Sol', 'Paciente Lua', 'Paciente Mar']) {
    const c = await api('POST', '/apadrinhamento', tH2, caso({ apelido }));
    r = await api('POST', '/apadrinhamento/' + c.dados.id + '/apadrinhar', tAna);
    if (apelido === 'Paciente Mar') checar('4o afilhado: 409 (limite de 3)', r.status === 409, r);
    else checar(apelido + ': ok', r.status === 201, r);
  }

  console.log('--- Deixar de ser padrinho ---');
  r = await api('DELETE', '/apadrinhamento/' + idCaso + '/apadrinhar', tAna);
  checar('Ana sai do apadrinhamento: 200', r.status === 200, r);
  r = await api('DELETE', '/apadrinhamento/' + idCaso + '/apadrinhar', tAna);
  checar('Sair de novo: 404', r.status === 404, r);

  console.log('--- Encerrar pedido ---');
  r = await api('POST', '/apadrinhamento/' + idCaso + '/encerrar', tH2);
  checar('Outro hospital NAO encerra (404)', r.status === 404, r);
  r = await api('POST', '/apadrinhamento/' + idCaso + '/encerrar', tH1);
  checar('Dono encerra: 200', r.status === 200, r);
  r = await api('GET', '/apadrinhamento');
  checar('Pedido encerrado sai da lista publica', !r.dados.casos.some((c) => c.id === idCaso), r.dados.casos.map((c) => c.apelido));
  r = await api('POST', '/apadrinhamento/' + idCaso + '/apadrinhar', tAna);
  checar('Apadrinhar pedido encerrado: 409', r.status === 409, r);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
