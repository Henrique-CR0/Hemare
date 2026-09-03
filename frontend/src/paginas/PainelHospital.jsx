// Hemare - Painel do hospital: publica necessidades e ve os doadores compativeis (match).
import { useState, useEffect } from 'react';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';
const TIPOS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

function PainelHospital() {
  const [necessidades, setNecessidades] = useState([]);
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [urgencia, setUrgencia] = useState('normal');
  const [mensagem, setMensagem] = useState('');
  const [match, setMatch] = useState(null); // resultado do match

  const token = localStorage.getItem('hemare_token');

  function carregarNecessidades() {
    fetch(URL_BACKEND + '/hospital/necessidades', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((r) => r.json())
      .then((dados) => setNecessidades(Array.isArray(dados) ? dados : []))
      .catch(() => {});
  }

  useEffect(() => { carregarNecessidades(); }, []);

  async function publicar() {
    if (!tipoSanguineo) { setMensagem('❌ Escolha o tipo sanguíneo.'); return; }
    setMensagem('Publicando...');
    try {
      const r = await fetch(URL_BACKEND + '/hospital/necessidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ tipoSanguineo, urgencia })
      });
      const d = await r.json();
      if (r.ok) {
        setMensagem('✅ ' + d.mensagem);
        setTipoSanguineo('');
        carregarNecessidades();
      } else {
        setMensagem('❌ ' + d.erro);
      }
    } catch (e) {
      setMensagem('❌ Erro ao publicar.');
    }
  }

  // Busca os doadores compativeis de uma necessidade.
  async function verMatch(necessidade) {
    setMatch({ carregando: true, necessidade });
    try {
      const r = await fetch(URL_BACKEND + '/hospital/match/' + necessidade.id, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      setMatch({ carregando: false, necessidade, ...d });
    } catch (e) {
      setMatch(null);
    }
  }

  return (
    <div className="painel">
      <h1>🏥 Painel do Hospital</h1>
      <p className="painel-sub">Publique uma necessidade de sangue e veja os doadores compatíveis.</p>

      {/* Publicar necessidade */}
      <div className="painel-caixa">
        <h2>Publicar necessidade</h2>
        <div className="painel-form">
          <select className="hemare-input" value={tipoSanguineo} onChange={(e) => setTipoSanguineo(e.target.value)}>
            <option value="">Tipo sanguíneo necessário...</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="hemare-input" value={urgencia} onChange={(e) => setUrgencia(e.target.value)}>
            <option value="normal">Urgência normal</option>
            <option value="urgente">Urgente</option>
          </select>
          <button className="hemare-botao" onClick={publicar}>Publicar</button>
        </div>
        {mensagem && <div className="painel-msg">{mensagem}</div>}
      </div>

      {/* Lista de necessidades */}
      <div className="painel-caixa">
        <h2>Minhas necessidades</h2>
        {necessidades.length === 0 ? (
          <p className="painel-vazio">Nenhuma necessidade publicada ainda.</p>
        ) : (
          <div className="nec-lista">
            {necessidades.map((n) => (
              <div key={n.id} className="nec-item">
                <div>
                  <span className="nec-tipo">{n.tipo_sanguineo}</span>
                  {n.urgencia === 'urgente' && <span className="nec-urgente">URGENTE</span>}
                </div>
                <button className="nec-botao" onClick={() => verMatch(n)}>Ver doadores compatíveis</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resultado do match */}
      {match && (
        <div className="painel-caixa">
          <h2>Doadores compatíveis com {match.necessidade.tipo_sanguineo}</h2>
          {match.carregando ? (
            <p className="painel-vazio">Buscando...</p>
          ) : (
            <>
              <p className="match-info">
                Tipos que podem doar para {match.tipoReceptor}: <strong>{match.tiposCompativeis.join(', ')}</strong>
              </p>
              {match.doadores.length === 0 ? (
                <p className="painel-vazio">Nenhum doador compatível cadastrado ainda.</p>
              ) : (
                <div className="match-lista">
                  {match.doadores.map((d, i) => (
                    <div key={i} className="match-card">
                      <span className="match-tipo">{d.tipo_sanguineo}</span>
                      <div>
                        <strong>{d.nome}</strong>
                        <p>{d.cidade}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PainelHospital;