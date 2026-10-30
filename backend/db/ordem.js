// Hemare - Ordem dos scripts do banco. Fonte unica: `npm run migrar` e os testes leem esta lista.
// Todos os scripts podem rodar de novo sem problema. Para um banco NOVO, a ordem importa: cada um depende dos anteriores.
// (Os scripts "ajustar-*" mais antigos guardam as colunas que as tabelas "criar-*" nao tem: sem eles o cadastro nao funciona.)
//
// Scripts que NAO entram de proposito (rode na mao quando precisar):
//   tornar-admin.js     precisa do e-mail:  node db/tornar-admin.js seu@email.com
//   listar-tabelas.js   so confere o que existe
//   listar-usuarios.js  so confere quem se cadastrou
const MIGRACOES = [
    { arquivo: 'criar-tabelas.js', descricao: 'usuários e doadores' },
    { arquivo: 'ajustar-coluna.js', descricao: 'tipo sanguíneo com texto maior (Rh nulo)' },
    { arquivo: 'ajustar-doadores.js', descricao: 'nome social e CPF' },
    { arquivo: 'ajustar-contato.js', descricao: 'telefone do doador' },
    { arquivo: 'criar-hospital.js', descricao: 'hospitais e necessidades' },
    { arquivo: 'ajustar-hospitais.js', descricao: 'CNPJ e endereço completo do hospital' },
    { arquivo: 'ajustar-cnes.js', descricao: 'CNES do hospital' },
    { arquivo: 'criar-locais.js', descricao: 'locais de doação' },
    { arquivo: 'popular-locais.js', descricao: 'hemocentros de todo o Brasil' },
    { arquivo: 'atualizar-coordenadas.js', descricao: 'latitude e longitude dos hemocentros (mapa)' },
    { arquivo: 'criar-recuperacao.js', descricao: 'códigos de recuperação de senha' },
    { arquivo: 'criar-estoque.js', descricao: 'estoque de sangue' },
    { arquivo: 'criar-doacoes.js', descricao: 'doações confirmadas' },
    { arquivo: 'ajustar-cadeia.js', descricao: 'cadeia de confiança (hash das doações)' },
    { arquivo: 'ajustar-verificacao.js', descricao: 'verificação de hospitais (novos começam pendentes)' },
    { arquivo: 'ajustar-alertas.js', descricao: 'data do último alerta de cada doador' },
    { arquivo: 'ajustar-lembretes.js', descricao: 'lembrete de retorno (opt-in)' },
    { arquivo: 'ajustar-indicacao.js', descricao: 'código de convite (Traga um amigo)' },
    { arquivo: 'ajustar-perfil.js', descricao: 'perfil completo do doador' },
    { arquivo: 'ajustar-raros.js', descricao: 'rede de sangue raro' },
    { arquivo: 'ajustar-pcd.js', descricao: 'ficha PcD' },
    { arquivo: 'criar-apadrinhamento.js', descricao: 'apadrinhamento de pacientes' },
    { arquivo: 'criar-campanhas.js', descricao: 'campanhas de reposição' },
    { arquivo: 'criar-noticias.js', descricao: 'canal de notícias' },
    { arquivo: 'popular-noticias.js', descricao: 'panorama inicial dos 27 estados' },
    { arquivo: 'criar-agendamentos.js', descricao: 'agenda de doações' },
    { arquivo: 'ajustar-sessao.js', descricao: 'sessões encerráveis (trocar senha, sair de todos)' }
];

// Scripts de db/ que de proposito ficam fora da lista (o teste de estrutura confere que nada ficou esquecido).
const FORA_DA_LISTA = ['ordem.js', 'migrar.js', 'tornar-admin.js', 'listar-tabelas.js', 'listar-usuarios.js'];

module.exports = { MIGRACOES, FORA_DA_LISTA };
