// Hemare - Fontes do feed de noticias (so feeds RSS que o proprio veiculo publica para ser lido por outros programas).
//
// Por que NAO usamos o Google Noticias? O feed dele diz, no proprio arquivo, que e "para um leitor de feeds pessoal,
// de uso nao comercial" e proibe qualquer outro uso. O GDELT e outras APIs gratuitas limitam o uso em sites publicos.
// Aqui o Hemare faz o que um leitor de feeds faz: le o RSS de cada veiculo e mostra SO titulo, um trecho curto, a
// imagem de divulgacao do feed e o LINK da materia original, com o nome da fonte. Quem quer ler tudo clica e vai ao site.
//
// tipo:
//   'sangue'  hemocentro: tudo que ele publica entra (categoria "Doacao de sangue" ou a mais especifica)
//   'saude'   editoria de saude: tudo entra (categoria "Saude", ou a mais especifica)
//   'geral'   noticias de tudo: so entra o que fala de doacao de sangue/orgaos, hemocentros ou campanhas de saude
// ativa: false = nao coleta ate alguem ligar (NOTICIAS_FONTES_OPCIONAIS=id1,id2 no .env). Usado para veiculos
//        comerciais cujos termos de RSS nao conseguimos confirmar.
// uf: estado fixo da fonte (hemocentro estadual, agencia de um governo estadual).
// semResumo: o feed nao traz um resumo util (so campos tecnicos): mostra so o titulo.
const FONTES = [
    { id: 'agencia-brasil-saude', nome: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/saude/feed.xml', tipo: 'saude', ativa: true,
        licenca: 'EBC (empresa pública): reprodução com crédito à Agência Brasil.' },
    { id: 'agencia-brasil', nome: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', tipo: 'geral', ativa: true,
        licenca: 'EBC (empresa pública): reprodução com crédito à Agência Brasil.' },
    { id: 'agencia-camara', nome: 'Agência Câmara', url: 'https://www.camara.leg.br/noticias/rss/ultimas-noticias', tipo: 'geral', ativa: true,
        licenca: 'Câmara dos Deputados: notícias podem ser reproduzidas desde que citada a fonte.' },
    { id: 'agencia-senado', nome: 'Agência Senado', url: 'https://www12.senado.leg.br/noticias/rss', tipo: 'geral', ativa: true,
        licenca: 'Senado Federal: reprodução livre mediante citação da Agência Senado.' },
    { id: 'fiocruz', nome: 'Agência Fiocruz de Notícias', url: 'https://agencia.fiocruz.br/rss.xml', tipo: 'saude', semResumo: true, ativa: true,
        licenca: 'Fundação pública de saúde; o Hemare mostra só o título e o link.' },
    { id: 'hemocentro-ribeirao', nome: 'Hemocentro de Ribeirão Preto (USP)', url: 'https://www.hemocentro.fmrp.usp.br/feed/', tipo: 'sangue', uf: 'SP', ativa: true,
        licenca: 'Hemocentro universitário: feed público do site; o Hemare mostra título, trecho e link.' },
    { id: 'agencia-minas', nome: 'Agência Minas', url: 'https://www.agenciaminas.mg.gov.br/rss', tipo: 'geral', uf: 'MG', ativa: true,
        licenca: 'Governo de Minas Gerais: agência oficial; o Hemare mostra título, trecho e link.' },
    { id: 'g1-saude', nome: 'g1', url: 'https://g1.globo.com/rss/g1/saude/', tipo: 'saude', ativa: false,
        licenca: 'Veículo comercial: termos do RSS não confirmados. Ligue só depois de conferir (NOTICIAS_FONTES_OPCIONAIS=g1-saude,g1).' },
    { id: 'g1', nome: 'g1', url: 'https://g1.globo.com/rss/g1/', tipo: 'geral', ativa: false,
        licenca: 'Veículo comercial: termos do RSS não confirmados. Ligue só depois de conferir.' }
];

// Fontes que valem agora: as ativas + as opcionais que o dono do sistema ligou no .env.
function fontesAtivas(opcionais) {
    const ligadas = String(opcionais === undefined ? process.env.NOTICIAS_FONTES_OPCIONAIS || '' : opcionais)
        .split(',').map((s) => s.trim()).filter(Boolean);
    return FONTES.filter((f) => f.ativa || ligadas.includes(f.id));
}

module.exports = { FONTES, fontesAtivas };
