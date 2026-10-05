// Hemare - Promessas de doacao do doador em campanhas de reposicao (na area do doador).
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

function formatar(dia) {
  return dia.split('-').reverse().join('/');
}

function MinhasPromessas() {
  const [promessas, setPromessas] = useState([]);
  const [aviso, setAviso] = useState('');
  const token = localStorage.getItem('hemare_token');

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/campanha/minhas-promessas', { headers: { 'Authorization': 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => ativo() && setPromessas(Array.isArray(lista) ? lista : []))
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function cancelar(p) {
    if (!window.confirm('Cancelar sua promessa para ' + p.apelido + '?')) return;
    try {
      const r = await fetch(URL_BACKEND + '/campanha/' + p.codigo + '/prometer', {
        method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      setAviso(d.mensagem || d.erro);
      if (r.ok) carregar();
    } catch {
      setAviso('Não consegui falar com o servidor.');
    }
  }

  if (promessas.length === 0) return null;

  const jaDoou = promessas.some((p) => p.confirmada);

  return (
    <section className="amigo" aria-labelledby="promessas-titulo">
      <h2 id="promessas-titulo" className="amigo-titulo">🤝 Minhas promessas de doação</h2>
      <ul className="apad-lista">
        {promessas.map((p) => (
          <li key={p.codigo} className="apad-caso">
            <strong>{p.apelido}</strong>
            <span className="apad-local">{p.hospital} — {p.cidade}</span>
            <p className="apad-meta">
              {p.confirmada ? '✅ Doação confirmada — obrigado!' : '📅 Você prometeu doar em ' + formatar(p.dataPrevista)}
            </p>
            <div className="apad-acoes">
              <Link to={'/campanha/' + p.codigo} className="conq-btn conq-btn-vazado">Ver campanha</Link>
              {!p.confirmada && <button type="button" className="conq-btn conq-btn-vazado" onClick={() => cancelar(p)}>Cancelar promessa</button>}
            </div>
          </li>
        ))}
      </ul>
      {jaDoou && (
        <p className="amigo-sub">
          💛 Muita gente doa só uma vez por alguém que conhece. Que tal continuar? Ative o lembrete em “Minhas conquistas”
          e receba um aviso quando puder doar de novo.
        </p>
      )}
      {aviso && <p className="conq-copia" role="status">{aviso}</p>}
    </section>
  );
}

export default MinhasPromessas;
