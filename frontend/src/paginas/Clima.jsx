// Hemare - Previsao do tempo do sangue: mostra a situacao do estoque por cidade, estilo meteorologia.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { URL_BACKEND } from '../config';

const CLIMA_INFO = {
  sol: { icone: '☀️', rotulo: 'Estável', cor: 'clima-sol' },
  nublado: { icone: '🌥️', rotulo: 'Atenção', cor: 'clima-nublado' },
  chuva: { icone: '🌧️', rotulo: 'Crítico', cor: 'clima-chuva' },
  tempestade: { icone: '⛈️', rotulo: 'Emergência', cor: 'clima-tempestade' }
};

function Clima() {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(URL_BACKEND + '/clima')
      .then((r) => r.json())
      .then((lista) => {
        setDados(Array.isArray(lista) ? lista : []);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, []);

  return (
    <div className="clima-pagina">
      <h1>🌦️ Previsão do tempo do sangue</h1>
      <p className="clima-sub">
        Assim como uma previsão do tempo, veja a "situação" da doação de sangue nas cidades cadastradas.
      </p>

      {carregando ? (
        <p className="locais-info">Carregando previsão...</p>
      ) : dados.length === 0 ? (
        <p className="locais-info">Nenhuma cidade com estoque publicado ainda.</p>
      ) : (
        <div className="clima-grade">
          {dados.map((c, i) => {
            const info = CLIMA_INFO[c.clima] || CLIMA_INFO.sol;
            return (
              <div key={i} className={'clima-card ' + info.cor}>
                <div className="clima-icone">{info.icone}</div>
                <h3>{c.cidade} - {c.estado}</h3>
                <span className="clima-rotulo">{info.rotulo}</span>
                <div className="clima-tipos">
                  {c.tipos.map((t, j) => (
                    <span key={j} className="clima-tipo-chip">{t.tipo}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link to="/estoque" className="link-radar">🌡️ Ver termômetro de estoque detalhado →</Link>
    </div>
  );
}

export default Clima;