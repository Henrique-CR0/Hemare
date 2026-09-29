// Hemare - Lista das doacoes confirmadas do doador, com link para o comprovante verificavel.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

function formatarData(texto) {
  const [ano, mes, dia] = String(texto).slice(0, 10).split('-');
  return dia + '/' + mes + '/' + ano;
}

function MinhasDoacoes() {
  const [doacoes, setDoacoes] = useState([]);

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/doador/doacoes', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('hemare_token') }
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => ativo && setDoacoes(Array.isArray(lista) ? lista : []))
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  // Sem doacoes confirmadas ainda: nao mostra nada (as conquistas ja incentivam a primeira).
  if (doacoes.length === 0) return null;

  return (
    <section className="doacoes" aria-labelledby="doacoes-titulo">
      <h2 id="doacoes-titulo" className="doacoes-titulo">📄 Minhas doações</h2>
      <p className="doacoes-sub">Cada doação confirmada tem um comprovante que qualquer pessoa pode verificar — útil para a folga no trabalho.</p>
      <ul className="doacoes-lista">
        {doacoes.map((d) => (
          <li key={d.id} className="doacoes-item">
            <div>
              <strong>{formatarData(d.data_doacao)}</strong>
              <span>{d.hospital}{d.cidade ? ' — ' + d.cidade + (d.estado ? '/' + d.estado : '') : ''}</span>
            </div>
            <Link to={'/comprovante/' + d.hash} className="doacoes-link">Ver comprovante →</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MinhasDoacoes;
