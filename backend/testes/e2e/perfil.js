// Teste de ponta a ponta: perfil do doador (foto, dados, LGPD).
// Rode: node testes/e2e/perfil.js   (ou  npm test)
const path = require('path');
const amb = require('../ambiente').criarAmbiente(3074);
const { BACKEND, pool, emails, URL, api, conta, checar } = amb;
const perfilHosp = (cnpj) => ({ cnpj, cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/';

async function main() {
  await amb.iniciar(['criar-apadrinhamento.js', 'criar-campanhas.js', 'ajustar-raros.js']);

  const CPF_ANA = '529.982.247-25';
  const tAna = await conta('Ana Souza', 'ana@x.com', 'doador');
  await api('POST', '/doador/perfil', tAna, { tipoSanguineo: 'O-', sexo: 'F', cidade: 'Recife', cpf: CPF_ANA, telefone: '81999990001', visibilidade: 'anonimo' });
  const tBruno = await conta('Bruno Lima', 'bruno@x.com', 'doador');
  await api('POST', '/doador/perfil', tBruno, { tipoSanguineo: 'A+', sexo: 'M', cidade: 'Olinda', cpf: '111.444.777-35', telefone: '81988880002', visibilidade: 'identificado' });
  const tNovo = await conta('Novo Doador', 'novo@x.com', 'doador'); // ainda sem perfil
  const tH = await conta('Hospital Um', 'h@x.com', 'hospital');
  await api('POST', '/hospital/perfil', tH, perfilHosp('11.111.111/0001-11'));
  await pool.query('UPDATE hospitais SET aprovado = true');
  const idAna = (await pool.query("SELECT d.id FROM doadores d JOIN usuarios u ON u.id = d.usuario_id WHERE u.email = 'ana@x.com'")).rows[0].id;

  const form = (extra) => ({
    nome: 'Ana Souza', nomeSocial: '', tipoSanguineo: 'O-', sexo: 'F', genero: '', cidade: 'Recife', estado: '', dataNascimento: '',
    pesoKg: '', telefone: '(81) 99999-0001', visibilidade: 'anonimo', contatoEmergenciaNome: '', contatoEmergenciaTelefone: '', ...extra
  });

  console.log('--- Acesso ---');
  let r = await api('GET', '/perfil');
  checar('Sem login (401)', r.status === 401, r);
  r = await api('GET', '/perfil', tH);
  checar('Hospital NAO acessa (403)', r.status === 403, r);
  r = await api('GET', '/perfil', tNovo);
  checar('Doador sem perfil: 404 pedindo para completar', r.status === 404, r);

  console.log('--- Ver o proprio perfil ---');
  r = await api('GET', '/perfil', tAna);
  checar('Ana ve seu perfil', r.status === 200 && r.dados.nome === 'Ana Souza' && r.dados.tipoSanguineo === 'O-' && r.dados.email === 'ana@x.com', r.dados);
  checar('CPF vem mascarado, nunca inteiro', r.dados.cpfMascarado === '***.982.247-**' && r.dados.temCpf === true && !JSON.stringify(r.dados).includes(CPF_ANA), r.dados.cpfMascarado);
  checar('Completude baixa e com sugestoes (foto etc.)', r.dados.completude.porcentagem < 100 && r.dados.completude.faltando.some((f) => f.campo === 'foto'), r.dados.completude);
  checar('Visao do hospital: anonimo, telefone protegido', r.dados.visaoDoHospital.identificado === false
    && r.dados.visaoDoHospital.ve.find((i) => i.rotulo === 'Telefone').valor === 'Protegido 🔒', r.dados.visaoDoHospital);
  checar('Nivel inicial: Futuro doador', r.dados.nivel.nome === 'Futuro doador', r.dados.nivel);

  console.log('--- Validacao ao editar ---');
  r = await api('PUT', '/perfil', tAna, form({ nome: 'Ana 2' }));
  checar('Nome com numero: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ cpf: '111.111.111-11' }));
  checar('CPF invalido: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ visibilidade: 'identificado', telefone: '' }));
  checar('Identificado sem telefone: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ dataNascimento: '2999-01-01' }));
  checar('Nascimento no futuro: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ foto: 'data:image/png;base64,iVBORw0KGgo=' }));
  checar('Foto PNG: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ foto: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUg==' }));
  checar('Foto que diz ser JPEG mas nao e: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ foto: 'data:image/jpeg;base64,/9j/' + 'A'.repeat(150000) }));
  checar('Foto grande demais: 400', r.status === 400, r);
  r = await api('PUT', '/perfil', tAna, form({ foto: 'data:image/jpeg;base64,/9j/' + 'A'.repeat(300000) }));
  checar('Corpo enorme: recusado antes (413)', r.status === 413, r.status);
  r = await api('PUT', '/perfil', null, form());
  checar('Editar sem login (401)', r.status === 401, r);

  console.log('--- Editar o perfil ---');
  r = await api('PUT', '/perfil', tAna, form({
    nome: 'Ana Maria Souza', nomeSocial: 'Mariana', genero: 'mulher-trans', estado: 'pe', dataNascimento: '1992-04-15', pesoKg: 64,
    visibilidade: 'identificado', foto: JPEG, contatoEmergenciaNome: 'João Souza', contatoEmergenciaTelefone: '81988887777'
  }));
  checar('Perfil completo salvo: 200', r.status === 200, r);
  checar('Completude 100% (CPF antigo foi mantido)', r.dados.perfil.completude.porcentagem === 100 && r.dados.perfil.temCpf === true, r.dados.perfil.completude);
  checar('Devolve usuario atualizado para o navegador', r.dados.usuario.nome === 'Ana Maria Souza', r.dados.usuario);
  r = await api('GET', '/perfil', tAna);
  checar('Dados persistidos', r.dados.nome === 'Ana Maria Souza' && r.dados.nomeSocial === 'Mariana' && r.dados.genero === 'mulher-trans' && r.dados.estado === 'PE'
    && r.dados.dataNascimento === '1992-04-15' && r.dados.pesoKg === 64 && r.dados.foto === JPEG && r.dados.contatoEmergenciaTelefone === '(81) 98888-7777', r.dados);
  checar('Visao do hospital agora: identificado, com NOME SOCIAL e telefone', r.dados.visaoDoHospital.identificado === true
    && r.dados.visaoDoHospital.ve.find((i) => i.rotulo === 'Nome').valor === 'Mariana'
    && r.dados.visaoDoHospital.ve.find((i) => i.rotulo === 'Telefone').valor === '(81) 99999-0001', r.dados.visaoDoHospital);
  const login = await api('POST', '/auth/login', null, { email: 'ana@x.com', senha: 'senha-forte-123' });
  checar('Login mostra o novo nome da conta', login.dados.usuario.nome === 'Ana Maria Souza', login.dados.usuario);

  console.log('--- A visao do hospital e verdadeira (match) ---');
  await api('POST', '/hospital/necessidade', tH, { tipoSanguineo: 'O-', urgencia: 'estavel' });
  r = await api('GET', '/hospital/match/1', tH);
  const naLista = r.dados && r.dados.doadores && r.dados.doadores.find((d) => d.nome === 'Mariana');
  checar('Match mostra a Ana pelo nome social, com telefone', !!naLista && naLista.telefone === '(81) 99999-0001' && naLista.identificado === true, r.dados);
  const bruta = JSON.stringify(r.dados);
  checar('Match NAO traz foto, CPF, nascimento, peso, email nem contato de emergencia', !bruta.includes('/9j/') && !bruta.includes('982.247') && !bruta.includes('1992') && !bruta.includes('ana@x.com') && !bruta.includes('João Souza') && !bruta.includes('"peso'), bruta.slice(0, 300));
  await api('PUT', '/perfil', tAna, form({ nome: 'Ana Maria Souza', nomeSocial: 'Mariana', visibilidade: 'anonimo' }));
  r = await api('GET', '/hospital/match/1', tH);
  checar('Voltando para anonimo, o match esconde nome e telefone', !JSON.stringify(r.dados).includes('Mariana') && !JSON.stringify(r.dados).includes('99999-0001'), r.dados);

  console.log('--- Foto: manter e remover ---');
  r = await api('GET', '/perfil', tAna);
  checar('Salvar sem o campo foto mantem a foto', r.dados.foto === JPEG, r.dados.foto && r.dados.foto.slice(0, 30));
  r = await api('PUT', '/perfil', tAna, form({ nome: 'Ana Maria Souza', foto: null }));
  checar('foto null remove', r.status === 200 && r.dados.perfil.foto === null, r.dados.perfil.foto);

  console.log('--- Criar o perfil pela tela nova ---');
  r = await api('PUT', '/perfil', tNovo, { nome: 'Novo Doador', tipoSanguineo: 'B-', sexo: 'M', cidade: 'Caruaru', cpf: '52998224725' });
  checar('Doador sem perfil cria o perfil: 200', r.status === 200 && r.dados.perfil.tipoSanguineo === 'B-' && r.dados.perfil.cpfMascarado === '***.982.247-**', r.dados);

  console.log('--- Baixar meus dados (LGPD) ---');
  await api('POST', '/hospital/confirmar-doacao', tH, { doadorId: idAna });
  const caso = await api('POST', '/apadrinhamento', tH, { autorizacao: true, apelido: 'Paciente Aurora', tipoSanguineo: 'A+', condicao: 'Talassemia', frequenciaDias: 30 });
  await api('POST', '/apadrinhamento/' + caso.dados.id + '/apadrinhar', tAna);
  const resp = await fetch(URL + '/perfil/exportar', { headers: { Authorization: 'Bearer ' + tAna } });
  const arquivo = await resp.json();
  checar('Exportar: arquivo para baixar (JSON)', resp.status === 200 && /attachment/.test(resp.headers.get('content-disposition') || ''), resp.headers.get('content-disposition'));
  checar('Exportar traz conta, perfil (com CPF) e doacao', arquivo.conta.email === 'ana@x.com' && arquivo.perfil.cpf === CPF_ANA && arquivo.doacoesConfirmadas.length === 1 && /^[0-9a-f]{64}$/.test(arquivo.doacoesConfirmadas[0].selo), arquivo);
  checar('Exportar traz o paciente apadrinhado', arquivo.pacientesApadrinhados.length === 1 && arquivo.pacientesApadrinhados[0].apelido === 'Paciente Aurora', arquivo.pacientesApadrinhados);
  checar('Exportar NAO traz dado de outros doadores', !JSON.stringify(arquivo).includes('bruno') && !JSON.stringify(arquivo).includes('111.444.777'), 'ok');
  r = await api('GET', '/perfil/exportar', null);
  checar('Exportar sem login (401)', r.status === 401, r);

  console.log('--- Excluir a conta ---');
  r = await api('POST', '/perfil/excluir', tAna, {});
  checar('Sem senha: 400', r.status === 400, r);
  r = await api('POST', '/perfil/excluir', tAna, { senha: 'errada-errada' });
  checar('Senha errada: 403', r.status === 403, r);
  r = await api('POST', '/perfil/excluir', tH, { senha: 'senha-forte-123' });
  checar('Hospital NAO usa esta rota (403)', r.status === 403, r);
  const antes = (await pool.query('SELECT COUNT(*) AS n FROM padrinhos')).rows[0].n;
  r = await api('POST', '/perfil/excluir', tAna, { senha: 'senha-forte-123' });
  checar('Senha certa: conta excluida (200)', r.status === 200, r);
  r = await api('POST', '/auth/login', null, { email: 'ana@x.com', senha: 'senha-forte-123' });
  checar('Nao consegue mais entrar (401)', r.status === 401, r);
  r = await api('GET', '/perfil', tAna);
  checar('Token antigo nao funciona mais (401)', r.status === 401, r);
  r = await api('POST', '/perfil/excluir', tAna, { senha: 'senha-forte-123' });
  checar('Excluir de novo (401)', r.status === 401, r);
  const u = (await pool.query("SELECT * FROM usuarios WHERE id = (SELECT usuario_id FROM doadores WHERE id = " + idAna + ")")).rows[0];
  const d = (await pool.query('SELECT * FROM doadores WHERE id = ' + idAna)).rows[0];
  checar('Conta anonimizada (nome, email, tipo)', u.nome === 'Conta removida' && /^removido-\d+@/.test(u.email) && u.tipo === 'removido', { nome: u.nome, email: u.email, tipo: u.tipo });
  checar('Dados pessoais apagados do doador', d.cpf === null && d.telefone === null && d.nome_social === null && d.foto === null && d.data_nascimento === null
    && d.contato_emergencia_nome === null && d.cidade === '' && d.visibilidade === 'anonimo', d);
  const depois = (await pool.query('SELECT COUNT(*) AS n FROM padrinhos')).rows[0].n;
  checar('Apadrinhamentos removidos', Number(antes) === 1 && Number(depois) === 0, [antes, depois]);
  r = await api('GET', '/hospital/cadeia/verificar');
  checar('Doacao continua na cadeia de confianca, que segue integra', r.dados.totalRegistros === 1 && r.dados.cadeiaIntegra === true, r.dados);
  r = await api('GET', '/perfil', tBruno);
  checar('Outro doador nao foi afetado', r.status === 200 && r.dados.nome === 'Bruno Lima' && r.dados.temCpf === true, r.dados);

  amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
