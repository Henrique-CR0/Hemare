// Hemare - Notícias: feed de noticias (estilo Google Noticias) sobre doacao de sangue, campanhas e saude.
import FeedNoticias from '../componentes/FeedNoticias';

function Noticias() {
  return (
    <div className="noti">
      <h1>📰 Notícias</h1>
      <p className="noti-sub">
        Doação de sangue, campanhas, estoques e saúde, de fontes públicas e de hemocentros, atualizadas de hora em hora.
        Cada notícia abre no site de quem a publicou.
      </p>

      <FeedNoticias />

      <p className="conteudo-aviso">
        O Hemare mostra só o título, um trecho curto e a imagem de divulgação que cada fonte oferece nos seus feeds públicos (RSS),
        sempre com o nome da fonte e o link da matéria original; os direitos pertencem a quem publicou.
        Uma notícia não substitui o comunicado oficial do hemocentro: antes de ir doar, confirme os horários e a necessidade com ele.
      </p>
    </div>
  );
}

export default Noticias;
