// Hemare - Pacientes que o doador apadrinha (na area do doador), com opcao de sair.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

function MeusAfilhados() {
  const [dados, setDados] = useState(null);
  const [aviso, setAviso] = useState('');
  const token = localStorage.getItem('hemare_token');

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/apadrinhamento/meus-afilhados', { headers: { 'Authorization': 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => ativo() && setDados(d))
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function sair(caso) {
    if (!window.confirm('Deixar de ser padrinho de ' + caso.apelido + '?')) return;
    try {
      const r = await fetch(URL_BACKEND + '/apadrinhamento/' + caso.id + '/apadrinhar', {
        method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      setAviso(d.mensagem || d.erro);
      if (r.ok) carregar();
    } catch {
      setAviso('Não consegui falar com o servidor.');
    }
  }

  // Sem afilhados: mostra so o convite (o emblema de padrinho incentiva o primeiro).
  if (!dados) return null;
  const { afilhados, elegibilidade } = dados;

  if (afilhados.length === 0) {
    return (
      <section className="amigo" aria-labelledby="afilhados-titulo">
        <h2 id="afilhados-titulo" className="amigo-titulo">💝 Apadrinhe um paciente</h2>
        <p className="amigo-sub">
          Alguns pacientes precisam de sangue a cada poucas semanas, a vida toda. Apadrinhar é se comprometer a voltar a doar por eles.
        </p>
        <Link to="/apadrinhar" className="conq-btn">Ver pacientes que procuram padrinhos</Link>
      </section>
    );
  }

  return (
    <section className="amigo" aria-labelledby="afilhados-titulo">
      <h2 id="afilhados-titulo" className="amigo-titulo">💝 Meus afilhados</h2>
      {elegibilidade && (
        <p className="amigo-sub">
          {elegibilidade.apto
            ? '✅ Você já pode doar de novo: seus afilhados agradecem! Se um hospital precisar, você recebe um email.'
            : '⏳ Você poderá doar de novo em ' + elegibilidade.diasRestantes + ' dias. Enquanto isso, eles contam com você.'}
        </p>
      )}
      <ul className="apad-lista">
        {afilhados.map((a) => (
          <li key={a.id} className="apad-caso">
            <div className="apad-topo">
              <span className="apad-tipo">{a.tipoSanguineo}</span>
              <div>
                <strong>{a.apelido}</strong>
                <span className="apad-local">{a.hospital} — {a.cidade}{a.estado ? '/' + a.estado : ''}</span>
              </div>
            </div>
            <p className="apad-meta">{a.padrinhos} de {a.meta} padrinhos · precisa de sangue a cada {a.frequenciaDias} dias</p>
            <button type="button" className="conq-btn conq-btn-vazado" onClick={() => sair(a)}>Deixar de apadrinhar</button>
          </li>
        ))}
      </ul>
      {aviso && <p className="conq-copia" role="status">{aviso}</p>}
      <Link to="/apadrinhar" className="hemare-link">Ver outros pacientes →</Link>
    </section>
  );
}

export default MeusAfilhados;
