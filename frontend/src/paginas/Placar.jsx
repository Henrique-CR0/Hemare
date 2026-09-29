// Hemare - Placar das cidades: quais cidades mais doam sangue (so numeros agregados).
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatar(numero) {
  return Number(numero).toLocaleString('pt-BR');
}

function Placar() {
  const [placar, setPlacar] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro

  useEffect(() => {
    fetch(URL_BACKEND + '/doador/placar')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((dados) => {
        setPlacar(dados);
        setSituacao('ok');
      })
      .catch(() => setSituacao('erro'));
  }, []);

  return (
    <div className="placar">
      <h1>🏙️ Placar das cidades</h1>
      <p className="placar-sub">
        As cidades onde os doadores do Hemare mais doaram sangue. Leve a sua cidade para o topo!
      </p>

      {situacao === 'carregando' && <p className="placar-vazio">Carregando o placar...</p>}
      {situacao === 'erro' && <p className="placar-vazio">Não foi possível carregar o placar agora.</p>}

      {situacao === 'ok' && (
        <>
          <div className="placar-totais">
            <div><strong>{formatar(placar.totalDoacoes)}</strong><span>doações confirmadas</span></div>
            <div><strong>{formatar(placar.totalVidas)}</strong><span>vidas que podem ter sido salvas</span></div>
            <div><strong>{formatar(placar.totalDoadores)}</strong><span>doadores cadastrados</span></div>
          </div>

          {placar.cidades.length === 0 ? (
            <p className="placar-vazio">
              Ainda não há cidades suficientes no placar. Cada doação confirmada conta!
            </p>
          ) : (
            <ol className="placar-lista">
              {placar.cidades.map((c) => (
                <li key={c.cidade} className={'placar-item' + (c.posicao <= 3 ? ' placar-podio' : '')}>
                  <span className="placar-pos" aria-label={c.posicao + 'º lugar'}>
                    {MEDALHAS[c.posicao] || c.posicao + 'º'}
                  </span>
                  <div className="placar-cidade">
                    <strong>{c.cidade}</strong>
                    <span>{formatar(c.doadores)} doadores</span>
                  </div>
                  <div className="placar-num">
                    <strong>{formatar(c.doacoes)}</strong>
                    <span>{c.doacoes === 1 ? 'doação' : 'doações'} · ❤️ {formatar(c.vidasSalvas)} vidas</span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <p className="placar-nota">
            🔒 Por privacidade, só aparecem cidades com pelo menos 3 doadores cadastrados, e nenhum doador é identificado.
          </p>
        </>
      )}

      <div className="placar-cta">
        <Link to="/triagem" className="cta-placar">Posso doar?</Link>
        <Link to="/locais" className="cta-placar cta-placar-vazado">Onde doar</Link>
      </div>
    </div>
  );
}

export default Placar;
