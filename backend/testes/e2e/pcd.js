// Teste de ponta a ponta: ficha PcD.
// Rode: node testes/e2e/pcd.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3076);
const { BACKEND, pool, emails, URL, api, conta, checar } = amb;

async function main() {
  await amb.iniciar(['ajustar-pcd.js']);

  async function doador(nome, email) {
    const t = await conta(nome, email, 'doador');
    await api('POST', '/doador/perfil', t, { tipoSanguineo: 'O+', sexo: 'F', cidade: 'Recife', cpf: '529.982.247-25', telefone: '81999990001', visibilidade: 'identificado' });
    return t;
  }
  const tLia = await doador('Lia Duarte', 'lia@x.com');
  const tOutra = await doador('Outra Pessoa', 'outra@x.com');
  const tSemPerfil = await conta('Sem Perfil', 'semperfil@x.com', 'doador');
  const tH = await conta('Hospital Recife', 'h1@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH, { cnpj: '11.111.111/0001-11', cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });
  await pool.query('UPDATE hospitais SET aprovado = true WHERE id = 1');
  const colunasLia = async () => (await pool.query("SELECT pcd, pcd_tipos, pcd_apoios, pcd_declarado_em FROM doadores WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'lia@x.com')")).rows[0];
  const declarar = (extra) => ({ declarado: true, tipos: ['fisica'], apoios: ['mobilidade'], consentimento: true, ...extra });

  console.log('--- Guia e ficha publicos (nao guardam nada) ---');
  let r = await api('GET', '/pcd/guia');
  checar('Guia publico traz causas, remedios, tipos e aviso', r.status === 200 && r.dados.causas.length === 11 && r.dados.medicamentos.length === 10 && r.dados.tipos.length === 7 && !!r.dados.aviso, r.dados && Object.keys(r.dados));
  r = await api('POST', '/pcd/ficha', null, { causas: ['nascenca'] });
  checar('Ficha sem login: verde para deficiencia de nascenca', r.status === 200 && r.dados.nivel === 'verde' && r.dados.levar[0] === 'Documento oficial com foto.', r.dados);
  r = await api('POST', '/pcd/ficha', null, { causas: ['avc'], medicamentos: ['antipsicotico'], decisao: 'com-apoio', apoios: ['libras'], idade: 17, pesoKg: 48 });
  checar('Ficha combinada: vermelho (AVC) e traz tudo que levar, apoios e nota', r.status === 200 && r.dados.nivel === 'vermelho' && r.dados.levar.length >= 4 && r.dados.apoios.length === 1 && r.dados.depois.length === 2 && /Hemominas/.test(r.dados.notaPratica), r.dados);
  r = await api('POST', '/pcd/ficha', null, { causas: ['epilepsia'] });
  checar('Epilepsia sem informar a situacao: 400 explicando', r.status === 400 && /epilepsia/i.test(r.dados.erro), r.dados);
  r = await api('POST', '/pcd/ficha', null, { causas: ['<script>'] });
  checar('Opcao inventada: 400', r.status === 400, r.dados);
  r = await api('POST', '/pcd/ficha', null, { causas: 'avc' });
  checar('Causas fora do formato de lista: 400', r.status === 400, r.dados);
  checar('A ficha nao gravou nada no banco', !(await colunasLia()).pcd);

  console.log('--- Declaracao no perfil: acesso ---');
  r = await api('GET', '/pcd/eu');
  checar('Sem login (401)', r.status === 401, r);
  r = await api('GET', '/pcd/eu', tH);
  checar('Hospital NAO acessa (403)', r.status === 403, r);
  r = await api('PUT', '/pcd/eu', tH, declarar());
  checar('Hospital NAO declara (403)', r.status === 403, r);
  r = await api('GET', '/pcd/eu', tSemPerfil);
  checar('Conta sem perfil: 404 pedindo para completar o perfil', r.status === 404, r);
  r = await api('GET', '/pcd/eu', tLia);
  checar('Antes de declarar: nao declarado, com as opcoes', r.status === 200 && r.dados.declarado === false && r.dados.tipos.length === 0 && r.dados.opcoes.tipos.length === 7, r.dados);

  console.log('--- Declaracao no perfil: regras ---');
  r = await api('PUT', '/pcd/eu', tLia, declarar({ consentimento: false }));
  checar('Sem consentimento: 400', r.status === 400, r);
  r = await api('PUT', '/pcd/eu', tLia, declarar({ tipos: [] }));
  checar('Sem tipo: 400', r.status === 400, r);
  r = await api('PUT', '/pcd/eu', tLia, declarar({ tipos: ['x'] }));
  checar('Tipo invalido: 400', r.status === 400, r);
  r = await api('PUT', '/pcd/eu', tLia, declarar({ apoios: ['x'] }));
  checar('Apoio invalido: 400', r.status === 400, r);
  checar('Nada foi gravado pelas tentativas invalidas', !(await colunasLia()).pcd);
  r = await api('PUT', '/pcd/eu', tLia, declarar({ tipos: ['fisica', 'auditiva', 'fisica'], apoios: ['mobilidade', 'libras'] }));
  checar('Declarar: 200, tipos sem repeticao, apoios e data do consentimento', r.status === 200 && r.dados.declarado === true && JSON.stringify(r.dados.tipos) === '["fisica","auditiva"]' && JSON.stringify(r.dados.apoios) === '["mobilidade","libras"]' && !!r.dados.declaradoEm, r.dados);
  r = await api('GET', '/pcd/eu', tLia);
  checar('A declaracao persiste', r.status === 200 && r.dados.declarado === true && r.dados.tipos.length === 2, r.dados);
  r = await api('GET', '/pcd/eu', tOutra);
  checar('Outra pessoa nao ve a declaracao da Lia', r.status === 200 && r.dados.declarado === false, r.dados);

  console.log('--- Privacidade: hospital nao enxerga ---');
  await api('POST', '/hospital/necessidade', tH, { tipoSanguineo: 'O+', urgencia: 'estavel' });
  r = await api('GET', '/hospital/match/1', tH);
  const bruta = JSON.stringify(r.dados);
  checar('Match mostra a Lia (identificada), mas nada de deficiencia', bruta.includes('Lia Duarte') && !/pcd|defici|fisica|auditiva|mobilidade|libras/i.test(bruta), bruta.slice(0, 300));
  r = await api('GET', '/perfil', tLia);
  checar('A previa "o que o hospital ve" lista a condicao de PcD entre o que nunca ve', r.status === 200 && JSON.stringify(r.dados).includes('Condição de PcD'), r.dados && Object.keys(r.dados));
  checar('O perfil comum nao devolve a condicao (so a rota /pcd/eu)', !/"pcd|fisica|auditiva/i.test(JSON.stringify(r.dados).replace('Condição de PcD', '')), r.dados);

  console.log('--- LGPD: baixar e excluir ---');
  const resp = await fetch(URL + '/perfil/exportar', { headers: { Authorization: 'Bearer ' + tLia } });
  const baixado = JSON.parse(await resp.text());
  checar('Baixar meus dados inclui a declaracao PcD', !!baixado.declaracaoPcd && baixado.declaracaoPcd.tipos.length === 2 && baixado.declaracaoPcd.apoios.length === 2, baixado.declaracaoPcd);
  const respOutra = await fetch(URL + '/perfil/exportar', { headers: { Authorization: 'Bearer ' + tOutra } });
  checar('Quem nao declarou recebe declaracaoPcd nulo', JSON.parse(await respOutra.text()).declaracaoPcd === null);

  console.log('--- Deixar de declarar ---');
  r = await api('PUT', '/pcd/eu', tLia, { declarado: false, tipos: ['fisica'] });
  const apagado = await colunasLia();
  checar('Desmarcar apaga tudo (tipos, apoios e data)', r.status === 200 && r.dados.declarado === false && r.dados.tipos.length === 0 && apagado.pcd === false && apagado.pcd_tipos === null && apagado.pcd_apoios === null && apagado.pcd_declarado_em === null, apagado);
  r = await api('PUT', '/pcd/eu', tLia, declarar({ tipos: ['tea'], apoios: [] }));
  checar('Declarar de novo sem apoios', r.status === 200 && r.dados.tipos[0] === 'tea' && r.dados.apoios.length === 0, r.dados);

  console.log('--- Excluir a conta apaga a declaracao ---');
  r = await api('POST', '/perfil/excluir', tLia, { senha: 'senha-forte-123' });
  const aposExcluir = (await pool.query("SELECT pcd, pcd_tipos, pcd_apoios, pcd_declarado_em FROM doadores WHERE usuario_id = (SELECT id FROM usuarios WHERE nome = 'Conta removida')")).rows[0];
  checar('Excluir a conta: 200 e a condicao de PcD some do banco', r.status === 200 && aposExcluir && !aposExcluir.pcd && aposExcluir.pcd_tipos === null && aposExcluir.pcd_apoios === null && aposExcluir.pcd_declarado_em === null, aposExcluir);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
