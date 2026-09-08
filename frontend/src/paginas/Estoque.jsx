// Hemare - Pagina publica do termometro de estoque: mostra onde falta sangue.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

const ROTULO = { estavel: '🟢 Estável', alerta: '🟡 Alerta', critico: '🔴 Crítico', emergencia: '⚫ Emergência' };
const PESO = { emergencia: 0, critico: 1, alerta: 2, estavel: 3 }; // pra ordenar: mais urgente primeiro

function Estoque() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(URL_BACKEND + '/hospital/estoque-publico')
      .then((r) => r.json())
      .then((dados) => {
        const lista = Array.isArray(dados) ? dados : [];
        // Ordena: mais urgente primeiro.
        lista.sort((a, b) => (PESO[a.nivel] ?? 9) - (PESO[b.nivel] ?? 9));
        setItens(lista);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, []);

  // Quantos tipos estao em situacao urgente (critico/emergencia).
  const urgentes = itens.filter((i) => i.nivel === 'critico' || i.nivel === 'emergencia');

  return (
    <div className="estoque-pub">
      <h1>🌡️ Termômetro de estoque</h1>
      <p className="estoque-pub-sub">
        Veja onde há falta de sangue agora. Se o seu tipo está em alerta, sua doação pode salvar vidas hoje.
      </p>

      {urgentes.length > 0 && (
        <div className="estoque-chamado">
          🚨 <strong>{urgentes.length}</strong> {urgentes.length === 1 ? 'tipo precisa' : 'tipos precisam'} de doação com urgência!
          <Link to="/triagem" className="estoque-cta">Posso doar?</Link>
        </div>
      )}

      {carregando ? (
        <p className="locais-info">Carregando...</p>
      ) : itens.length === 0 ? (
        <p className="locais-info">Nenhum hospital publicou seu estoque ainda.</p>
      ) : (
        <div className="estoque-pub-lista">
          {itens.map((i, idx) => (
            <div key={idx} className={'estoque-pub-card nivel-fundo-' + i.nivel}>
              <div className="epc-tipo">{i.tipo_sanguineo}</div>
              <div className="epc-info">
                <strong>{i.hospital}</strong>
                <p>{i.cidade} - {i.estado}</p>
              </div>
              <div className="epc-nivel">{ROTULO[i.nivel] || i.nivel}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Estoque;