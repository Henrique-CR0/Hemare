// Hemare - O que cada tipo de conta ve no menu e em quais telas publicas pode entrar.
// Regra: o doador so ve o que e de doador, o hospital so ve o que e de hospital, e o administrador so o que e dele.
// (Quem protege os dados de verdade e o backend: cada rota confere o tipo da conta. Aqui e so organizacao da tela.)

const INICIO = { para: '/', rotulo: 'Início' };
const ONDE_DOAR = { para: '/locais', rotulo: 'Onde doar' };
const POSSO_DOAR = { para: '/triagem', rotulo: 'Posso doar?' };
const ESTOQUE = { para: '/estoque', rotulo: 'Termômetro de estoque' };
const NOTICIAS = { para: '/noticias', rotulo: 'Notícias' };
const CLIMA = { para: '/clima', rotulo: 'Previsão do sangue' };
const APADRINHE = { para: '/apadrinhar', rotulo: 'Apadrinhe' };
const AGENDAR = { para: '/agendar', rotulo: 'Agendar doação' };
const RADAR = { para: '/radar', rotulo: 'Radar de aptidão' };

// Links do menu e se aparece o "Aprenda" (guia, mitos, direitos e placar: conteudo para doadores).
export function menuDe(tipo) {
  if (tipo === 'doador') {
    return { links: [INICIO, AGENDAR, ONDE_DOAR, POSSO_DOAR, ESTOQUE, NOTICIAS, CLIMA, APADRINHE], aprenda: true };
  }
  if (tipo === 'hospital') {
    return { links: [ESTOQUE, NOTICIAS, CLIMA, RADAR], aprenda: false };
  }
  if (tipo === 'admin') {
    return { links: [NOTICIAS, CLIMA, RADAR], aprenda: false };
  }
  // Visitante (sem login): o site inteiro aberto ao publico.
  return { links: [INICIO, ONDE_DOAR, POSSO_DOAR, ESTOQUE, NOTICIAS, CLIMA, APADRINHE], aprenda: true };
}

// Para onde vai o logotipo: visitante e doador vao para o inicio; hospital e administrador, para a sua area.
export function destinoDoLogo(tipo, rotaArea) {
  return tipo === 'hospital' || tipo === 'admin' ? rotaArea : '/';
}
