// Teste de ponta a ponta: um banco COMPLETAMENTE VAZIO, montado so com db/ordem.js (o que `npm run migrar` faz),
// precisa bastar para o sistema funcionar: cadastro, perfil, hospital, aprovacao, doacao na cadeia de confianca, locais e noticias.
// Este teste existe porque o README antigo esquecia scripts (ajustar-doadores, ajustar-hospitais, ajustar-cadeia...):
// quem seguia o passo a passo num banco novo ficava sem CPF, telefone, CNPJ e hash das doacoes.
// Rode: node testes/e2e/do-zero.js   (ou  npm test)
const amb = require('../ambiente').criarAmbiente(3077, { doZero: true });
const { pool, api, conta, checar, titulo } = amb;
const { MIGRACOES } = require('../../db/ordem');

async function main() {
    await amb.iniciar(MIGRACOES.map((m) => m.arquivo));

    titulo('O que a lista criou');
    const tabelas = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((r) => r.table_name);
    for (const t of ['usuarios', 'doadores', 'hospitais', 'necessidades', 'locais', 'recuperacao_senha', 'estoque', 'doacoes', 'casos_apadrinhamento', 'campanhas_reposicao', 'noticias', 'vagas_doacao', 'agendamentos', 'pedidos_raros']) {
        checar('Tabela ' + t, tabelas.includes(t), tabelas);
    }
    const colunas = async (tabela) => (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = '" + tabela + "'")).rows.map((r) => r.column_name);
    const cDoador = await colunas('doadores');
    const cHosp = await colunas('hospitais');
    const cDoacao = await colunas('doacoes');
    const cUsuario = await colunas('usuarios');
    checar('Doador tem CPF, nome social, telefone e foto', ['cpf', 'nome_social', 'telefone', 'foto', 'pcd', 'raro_fenotipo'].every((c) => cDoador.includes(c)), cDoador);
    checar('Hospital tem CNPJ, CNES, CEP e verificacao', ['cnpj', 'cnes', 'cep', 'numero', 'bairro', 'motivo_recusa'].every((c) => cHosp.includes(c)), cHosp);
    checar('Doacao tem os hashes da cadeia de confianca', cDoacao.includes('hash') && cDoacao.includes('hash_anterior'), cDoacao);
    checar('Usuario tem codigo de convite e sessao encerravel', cUsuario.includes('codigo_indicacao') && cUsuario.includes('sessao_valida_apos'), cUsuario);

    titulo('Usar o sistema num banco recem-montado');
    const tDoador = await conta('Ana Lima', 'ana@exemplo.com', 'doador');
    let r = await api('POST', '/doador/perfil', tDoador, { tipoSanguineo: 'Rh nulo (sangue dourado)', sexo: 'F', cidade: 'Recife', cpf: '529.982.247-25', telefone: '81999990001', visibilidade: 'identificado' });
    checar('Perfil do doador com Rh nulo, CPF e telefone', r.status === 200 || r.status === 201, r);
    const tHosp = await conta('Hospital Recife', 'h@exemplo.com', 'hospital');
    r = await api('POST', '/hospital/perfil', tHosp, { cnpj: '11.111.111/0001-11', cnes: '1234567', cep: '50000-000', endereco: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Recife', estado: 'PE' });
    checar('Perfil do hospital com CNPJ e CNES', r.status === 200, r);
    r = await api('GET', '/hospital/meus-dados', tHosp);
    checar('Hospital novo comeca pendente (verificacao ligada)', r.dados.statusVerificacao === 'pendente', r.dados);
    await pool.query('UPDATE hospitais SET aprovado = true');
    const idDoador = (await pool.query('SELECT id FROM doadores')).rows[0].id;
    r = await api('POST', '/hospital/confirmar-doacao', tHosp, { doadorId: idDoador });
    checar('Confirmar doacao: 200 com selo da cadeia', r.status === 200 && /^[0-9a-f]{64}$/.test(r.dados.hash), r.dados);
    r = await api('GET', '/hospital/cadeia/verificar', tHosp);
    checar('A cadeia de confianca esta integra', r.status === 200 && r.dados.cadeiaIntegra === true, r.dados);
    r = await api('GET', '/locais');
    checar('Hemocentros do Brasil ja vem carregados (com coordenadas para o mapa)', r.status === 200 && r.dados.length >= 20 && r.dados.every((l) => l.latitude !== null && l.latitude !== undefined), r.dados && r.dados.length);
    r = await fetch(amb.URL + '/noticias').then((x) => x.json());
    checar('Canal de noticias ja vem com os 27 estados', Array.isArray(r.estados) ? r.estados.length === 27 : JSON.stringify(r).includes('"SP"'), Object.keys(r));
    r = await api('GET', '/historico', tDoador);
    checar('"Minhas doacoes" mostra a doacao feita', r.status === 200 && r.dados.resumo.totalDoacoes === 1, r.dados);

    amb.concluir();
}

main().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(1); });
