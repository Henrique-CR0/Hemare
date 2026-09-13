// Hemare - Radar preditivo: mostra quantos doadores de cada tipo ficarao aptos em breve.
import { useState, useEffect } from 'react';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';
const ORDEM_TIPOS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

function Radar() {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hemare_token');
    fetch(URL_BACKEND + '/radar/aptidao', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((r) => r.json())
      .then((lista) => {
        const ordenada = Array.isArray(lista)
          ? [...lista].sort((a, b) => ORDEM_TIPOS.indexOf(a.tipo) - ORDEM_TIPOS.indexOf(b.tipo))
          : [];
        setDados(ordenada);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, []);

  return (
    <div className="painel">
      <h1>🔮 Radar preditivo de aptidão</h1>
      <p className="painel-sub">
        Veja quantos doadores de cada tipo estarão aptos a doar nos próximos dias — antecipe a convocação antes que falte sangue.
      </p>

      {carregando ? (
        <p className="painel-vazio">Calculando previsão...</p>
      ) : dados.length === 0 ? (
        <p className="painel-vazio">Ainda não há doadores suficientes para gerar a previsão.</p>
      ) : (
        <div className="radar-lista">
          {dados.map((d) => {
            const total = d.aptoAgora + d.em7Dias + d.em30Dias + d.maisDe30Dias;
            return (
              <div key={d.tipo} className="radar-card">
                <div className="radar-tipo">{d.tipo}</div>
                <div className="radar-barras">
                  <div className="radar-linha">
                    <span className="radar-rotulo">✅ Aptos agora</span>
                    <div className="radar-barra-fundo">
                      <div className="radar-barra radar-agora" style={{ width: (total ? (d.aptoAgora / total * 100) : 0) + '%' }}></div>
                    </div>
                    <span className="radar-numero">{d.aptoAgora}</span>
                  </div>
                  <div className="radar-linha">
                    <span className="radar-rotulo">🔜 Em até 7 dias</span>
                    <div className="radar-barra-fundo">
                      <div className="radar-barra radar-7d" style={{ width: (total ? (d.em7Dias / total * 100) : 0) + '%' }}></div>
                    </div>
                    <span className="radar-numero">{d.em7Dias}</span>
                  </div>
                  <div className="radar-linha">
                    <span className="radar-rotulo">📅 Em até 30 dias</span>
                    <div className="radar-barra-fundo">
                      <div className="radar-barra radar-30d" style={{ width: (total ? (d.em30Dias / total * 100) : 0) + '%' }}></div>
                    </div>
                    <span className="radar-numero">{d.em30Dias}</span>
                  </div>
                </div>
                {d.aptoAgora === 0 && d.em7Dias === 0 && (
                  <span className="radar-alerta">⚠️ Nenhum doador apto em breve</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Radar;