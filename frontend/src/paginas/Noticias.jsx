// Hemare - Notícias: o feed de noticias (estilo Google Noticias) e o panorama da doacao de sangue por estado.
import SubAbas, { useAba } from '../componentes/SubAbas';
import FeedNoticias from '../componentes/FeedNoticias';
import PanoramaEstados from '../componentes/PanoramaEstados';

const ABAS = [
  { id: 'ultimas', rotulo: '📰 Últimas notícias' },
  { id: 'estados', rotulo: '🗺️ Panorama por estado' }
];

function Noticias() {
  const [aba, trocarAba] = useAba(ABAS.map((a) => a.id));

  return (
    <div className="noti">
      <h1>📰 Notícias</h1>
      <p className="noti-sub">
        Doação de sangue, campanhas, estoques e saúde, de fontes públicas e de hemocentros, atualizadas de hora em hora.
        Cada notícia abre no site de quem a publicou.
      </p>

      <SubAbas abas={ABAS} atual={aba} aoTrocar={trocarAba} />

      {aba === 'ultimas' ? <FeedNoticias /> : <PanoramaEstados />}

      <p className="conteudo-aviso">
        O Hemare mostra só o título, um trecho curto e a imagem de divulgação que cada fonte oferece nos seus feeds públicos (RSS),
        sempre com o nome da fonte e o link da matéria original; os direitos pertencem a quem publicou.
        Uma notícia não substitui o comunicado oficial do hemocentro: antes de ir doar, confirme os horários e a necessidade com ele.
      </p>
    </div>
  );
}

export default Noticias;
