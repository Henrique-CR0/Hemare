// Teste de ponta a ponta: verificacao de hospitais por um administrador (pendente, aprovado, recusado) e seus bloqueios.
// Rode: node testes/e2e/verificacao-hospital.js   (ou  npm test)
const amb = require('../ambiente').criarAmbiente(3070);
const { pool, emails, api, conta, checar } = amb;
const perfilHosp = (cnpj) => ({ cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });

async function main() {
  await amb.iniciar([]);

  console.log('--- Cadastro ---');
  const rAdmin = await api('POST', '/auth/cadastro', null, { nome: 'Invasor', email: 'x@x.com', senha: 'senha-forte-123', tipo: 'admin' });
  checar('Cadastro como admin pelo site e recusado (400)', rAdmin.status === 400, rAdmin);

  const tDoador = await conta('Doador Um', 'd1@x.com', 'doador');
  await api('POST', '/doador/perfil', tDoador, { tipoSanguineo: 'O-', sexo: 'M', cidade: 'Recife', cpf: '1', telefone: '81999990000', visibilidade: 'identificado' });
  const tH1 = await conta('Hospital Um', 'h1@x.com', 'hospital');
  const tH2 = await conta('Hospital Dois', 'h2@x.com', 'hospital');

  const rPerfilDoador = await api('POST', '/hospital/perfil', tDoador, perfilHosp('11'));
  checar('Doador nao cria perfil de hospital (403)', rPerfilDoador.status === 403, rPerfilDoador);

  console.log('--- Hospital novo fica pendente ---');
  await api('POST', '/hospital/perfil', tH1, perfilHosp('11.111.111/0001-11'));
  await api('POST', '/hospital/perfil', tH2, perfilHosp('22.222.222/0001-22'));
  let meus = await api('GET', '/hospital/meus-dados', tH1);
  checar('Hospital novo: status pendente', meus.dados.statusVerificacao === 'pendente', meus.dados);
  let r = await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'O-', urgencia: 'emergencia' });
  checar('Pendente NAO publica necessidade (403)', r.status === 403, r);
  checar('Pendente NAO dispara emails de emergencia', emails.length === 0, emails.length);
  r = await api('POST', '/hospital/estoque', tH1, { tipoSanguineo: 'O-', nivel: 'critico' });
  checar('Pendente NAO altera estoque (403)', r.status === 403, r);
  r = await api('POST', '/hospital/confirmar-doacao', tH1, { doadorId: 1 });
  checar('Pendente NAO confirma doacao (403)', r.status === 403, r);

  console.log('--- Doador nao acessa rotas de hospital ---');
  r = await api('GET', '/hospital/match/1', tDoador);
  checar('Doador NAO ve match/telefones (403)', r.status === 403, r);
  r = await api('POST', '/hospital/confirmar-doacao', tDoador, { doadorId: 1 });
  checar('Doador NAO confirma doacao (403)', r.status === 403, r);

  console.log('--- Admin ---');
  const tAdmin = await conta('Admin', 'adm@x.com', 'doador');
  r = await api('GET', '/admin/hospitais', tAdmin);
  checar('Antes de virar admin: 403', r.status === 403, r);
  // Simula o script db/tornar-admin.js
  await pool.query("UPDATE usuarios SET tipo = 'admin' WHERE LOWER(email) = $1", ['adm@x.com']);
  const tAdmin2 = (await api('POST', '/auth/login', null, { email: 'adm@x.com', senha: 'senha-forte-123' })).dados.token;
  r = await api('GET', '/admin/hospitais', tAdmin2);
  checar('Admin lista 2 pendentes', r.status === 200 && r.dados.length === 2, r);
  const idH1 = r.dados.find((h) => h.email === 'h1@x.com').id;
  const idH2 = r.dados.find((h) => h.email === 'h2@x.com').id;
  r = await api('GET', '/admin/hospitais', tH1);
  checar('Hospital NAO acessa /admin (403)', r.status === 403, r);
  r = await api('POST', '/admin/hospitais/abc/aprovar', tAdmin2);
  checar('id invalido: 400', r.status === 400, r);
  r = await api('POST', '/admin/hospitais/999/aprovar', tAdmin2);
  checar('Hospital inexistente: 404', r.status === 404, r);

  console.log('--- Recusa ---');
  r = await api('POST', '/admin/hospitais/' + idH1 + '/recusar', tAdmin2, { motivo: 'curto' });
  checar('Recusa sem motivo suficiente: 400', r.status === 400, r);
  r = await api('POST', '/admin/hospitais/' + idH1 + '/recusar', tAdmin2, { motivo: 'CNES <b>nao</b> encontrado no DATASUS' });
  checar('Recusa com motivo: 200', r.status === 200, r);
  meus = await api('GET', '/hospital/meus-dados', tH1);
  checar('Hospital ve status recusado e o motivo', meus.dados.statusVerificacao === 'recusado' && meus.dados.motivo_recusa.includes('CNES'), meus.dados);
  const emailRecusa = emails.find((e) => e.to === 'h1@x.com');
  checar('Email de recusa enviado ao hospital', !!emailRecusa);
  checar('Motivo escapado no email (sem <b>)', emailRecusa && !emailRecusa.html.includes('<b>nao</b>') && emailRecusa.html.includes('&lt;b&gt;'));
  r = await api('GET', '/admin/hospitais?status=recusado', tAdmin2);
  checar('Filtro recusado: 1', r.dados.length === 1, r.dados);
  await api('POST', '/hospital/perfil', tH1, perfilHosp('11.111.111/0001-11'));
  meus = await api('GET', '/hospital/meus-dados', tH1);
  checar('Reenviar dados apos recusa volta para pendente', meus.dados.statusVerificacao === 'pendente', meus.dados);

  console.log('--- Aprovacao ---');
  await api('POST', '/admin/hospitais/' + idH1 + '/aprovar', tAdmin2);
  await api('POST', '/admin/hospitais/' + idH2 + '/aprovar', tAdmin2);
  meus = await api('GET', '/hospital/meus-dados', tH1);
  checar('Hospital aprovado', meus.dados.statusVerificacao === 'aprovado', meus.dados);
  r = await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'O-', urgencia: 'normal' });
  checar('Aprovado publica necessidade (201)', r.status === 201, r);
  const nec = (await api('GET', '/hospital/necessidades', tH1)).dados[0];
  r = await api('GET', '/hospital/match/' + nec.id, tH1);
  checar('Dono ve match com telefone do doador identificado', r.status === 200 && r.dados.doadores.some((d) => d.telefone === '81999990000'), r);
  r = await api('GET', '/hospital/match/' + nec.id, tH2);
  checar('Outro hospital NAO ve match da necessidade alheia (404)', r.status === 404, r);
  r = await api('POST', '/hospital/estoque', tH1, { tipoSanguineo: 'O-', nivel: 'critico' });
  checar('Aprovado altera estoque', r.status === 200, r);
  r = await api('POST', '/hospital/confirmar-doacao', tH1, { doadorId: 1 });
  checar('Aprovado confirma doacao', r.status === 200, r);

  console.log('--- Estoque publico e troca de CNPJ ---');
  await api('POST', '/admin/hospitais/' + idH2 + '/recusar', tAdmin2, { motivo: 'Revogado: dados inconsistentes' });
  r = await api('GET', '/hospital/estoque-publico');
  checar('Estoque publico mostra so hospitais aprovados', r.dados.length === 1 && r.dados[0].hospital === 'Hospital Um', r.dados);
  await api('POST', '/hospital/perfil', tH1, perfilHosp('99.999.999/0001-99'));
  meus = await api('GET', '/hospital/meus-dados', tH1);
  checar('Trocar o CNPJ volta para pendente', meus.dados.statusVerificacao === 'pendente', meus.dados);
  r = await api('GET', '/hospital/estoque-publico');
  checar('...e some do estoque publico', r.dados.length === 0, r.dados);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
