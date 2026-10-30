// Teste de ponta a ponta: canal de noticias por estado.
// Rode: node testes/e2e/noticias.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3073);
const { BACKEND, pool, emails, URL, api, conta, checar } = amb;
const perfilHosp = (cnpj) => ({ cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });

async function main() {
  await amb.iniciar(['criar-apadrinhamento.js', 'criar-campanhas.js', 'criar-noticias.js', 'popular-noticias.js']);

  const tDoador = await conta('Doador', 'd@x.com', 'doador');
  const tH1 = await conta('Hospital Um', 'h1@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH1, perfilHosp('11.111.111/0001-11')); // Recife/PE
  const tH2 = await conta('Hospital Dois', 'h2@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH2, { ...perfilHosp('22.222.222/0001-22'), cidade: 'Manaus', estado: 'AM' });
  await conta('Admin', 'adm@x.com', 'doador');
  await pool.query("UPDATE usuarios SET tipo = 'admin' WHERE email = 'adm@x.com'");
  const tAdmin = (await api('POST', '/auth/login', null, { email: 'adm@x.com', senha: 'senha-forte-123' })).dados.token;

  console.log('--- Povoamento inicial ---');
  const total = (await pool.query('SELECT COUNT(*) AS n FROM noticias')).rows[0].n;
  checar('27 avisos inseridos (um por estado)', Number(total) === 27, total);
  const ufs = (await pool.query('SELECT DISTINCT uf FROM noticias')).rows.length;
  checar('...cobrindo os 27 estados', ufs === 27, ufs);

  console.log('--- Panorama publico ---');
  let r = await api('GET', '/noticias');
  checar('Publico (sem login): 200 com 27 estados', r.status === 200 && r.dados.estados.length === 27, r.status);
  checar('Contagem por nivel soma 27', Object.values(r.dados.contagem).reduce((s, n) => s + n, 0) === 27, r.dados.contagem);
  const nivelSP = r.dados.estados.find((e) => e.sigla === 'SP');
  checar('SP: critico, com 1 aviso e link da fonte', nivelSP.nivel === 'critico' && nivelSP.noticias.length === 1 && nivelSP.noticias[0].url.startsWith('https://'), nivelSP);
  checar('Ordenado do mais grave para o mais tranquilo', ['critico', 'alerta', 'atencao', 'estavel', 'sem-dados'].indexOf(r.dados.estados[0].nivel)
    <= ['critico', 'alerta', 'atencao', 'estavel', 'sem-dados'].indexOf(r.dados.estados[26].nivel), r.dados.estados.map((e) => e.nivel));
  const ce = r.dados.estados.find((e) => e.sigla === 'CE');
  checar('CE: estavel (aviso) e sem sinais do Hemare', ce.nivel === 'estavel' && ce.nivelHemare === 'sem-dados', ce);
  checar('Nao expoe dado de usuario', !JSON.stringify(r.dados).includes('@x.com'));

  console.log('--- Sinais do Hemare ---');
  await pool.query('UPDATE hospitais SET aprovado = true');
  await pool.query("INSERT INTO estoque (hospital_id, tipo_sanguineo, nivel) VALUES (1, 'O-', 'critico'), (1, 'A+', 'estavel'), (2, 'B+', 'alerta')");
  await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'O-', urgencia: 'estavel' });
  r = await api('GET', '/noticias');
  const pe = r.dados.estados.find((e) => e.sigla === 'PE');
  checar('PE: 1 hospital, estoque com 1 critico de 2, nivel do Hemare critico', pe.sinais.hospitais === 1 && pe.sinais.estoque.critico === 1 && pe.sinais.estoque.total === 2 && pe.nivelHemare === 'critico', pe.sinais);
  const am = r.dados.estados.find((e) => e.sigla === 'AM');
  checar('AM: 1 estoque em alerta; nivel final = pior entre aviso (critico) e Hemare (alerta)', am.sinais.estoque.alerta === 1 && am.nivelHemare === 'alerta' && am.nivel === 'critico', am);
  await pool.query("UPDATE hospitais SET aprovado = false WHERE id = 2");
  r = await api('GET', '/noticias');
  checar('Hospital sem aprovacao nao conta nos sinais', r.dados.estados.find((e) => e.sigla === 'AM').nivelHemare === 'sem-dados', r.dados.estados.find((e) => e.sigla === 'AM').sinais);
  await api('POST', '/hospital/necessidade', tH1, { tipoSanguineo: 'A-', urgencia: 'emergencia' });
  r = await api('GET', '/noticias');
  checar('Pedido de emergencia aparece nos sinais (PE)', r.dados.estados.find((e) => e.sigla === 'PE').sinais.necessidadesUrgentes === 1);
  checar('Tabelas de campanhas/apadrinhamento ausentes nao derrubam (zeros)', r.dados.estados.find((e) => e.sigla === 'PE').sinais.campanhasAtivas === 0);

  console.log('--- Admin cadastra e remove ---');
  const aviso = { uf: 'pe', titulo: 'Hemope organiza mutirão de doação', resumo: 'O hemocentro fará um mutirão no fim de semana com horário estendido em Recife.', fonte: 'Hemope', url: 'https://www.hemope.pe.gov.br/mutirao', nivel: 'estavel', referencia: 'set/2026' };
  r = await api('POST', '/noticias', null, aviso);
  checar('Sem login (401)', r.status === 401, r);
  r = await api('POST', '/noticias', tDoador, aviso);
  checar('Doador NAO publica (403)', r.status === 403, r);
  r = await api('POST', '/noticias', tH1, aviso);
  checar('Hospital NAO publica (403)', r.status === 403, r);
  r = await api('POST', '/noticias', tAdmin, { ...aviso, url: 'javascript:alert(1)' });
  checar('Link javascript: recusado (400)', r.status === 400, r);
  r = await api('POST', '/noticias', tAdmin, { ...aviso, uf: 'ZZ' });
  checar('Estado invalido (400)', r.status === 400, r);
  r = await api('POST', '/noticias', tAdmin, aviso);
  const idNovo = r.dados && r.dados.id;
  checar('Admin publica (201)', r.status === 201 && idNovo > 0, r);
  r = await api('POST', '/noticias', tAdmin, aviso);
  checar('Mesmo link de novo (409)', r.status === 409, r);
  r = await api('GET', '/noticias');
  const pe2 = r.dados.estados.find((e) => e.sigla === 'PE');
  checar('PE: aviso novo vem primeiro e o nivel de avisos passa a estavel', pe2.noticias[0].id === idNovo && pe2.nivelNoticias === 'estavel' && pe2.noticias.length === 2, pe2.noticias.map((n) => [n.id, n.nivel]));
  r = await api('DELETE', '/noticias/' + idNovo, tDoador);
  checar('Doador NAO remove (403)', r.status === 403, r);
  r = await api('DELETE', '/noticias/abc', tAdmin);
  checar('id invalido (400)', r.status === 400, r);
  r = await api('DELETE', '/noticias/' + idNovo, tAdmin);
  checar('Admin remove (200)', r.status === 200, r);
  r = await api('DELETE', '/noticias/' + idNovo, tAdmin);
  checar('Remover de novo (404)', r.status === 404, r);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
