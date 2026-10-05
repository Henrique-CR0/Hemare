// Hemare - Faixa na area do doador: o proximo feriado prolongado e o que a pessoa pode fazer ANTES dele.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';
import { formatarData, quando } from '../regras/feriados';

function FaixaFeriado() {
  const token = localStorage.getItem('hemare_token');
  const [item, setItem] = useState(null);

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/feriados/meu-plano', { headers: { 'Authorization': 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ativo || !d || !Array.isArray(d.planos)) return;
        // O primeiro periodo que ainda nao comecou (ou o que esta acontecendo, se nao houver outro).
        setItem(d.planos.find((x) => !x.periodo.emAndamento) || d.planos[0] || null);
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  if (!item) return null;
  const { periodo, plano } = item;
  return (
    <Link to="/feriados" className={'fer-faixa fer-' + periodo.risco}>
      <strong>📅 {periodo.nome}: {quando(periodo).toLowerCase()}</strong>
      <span>{periodo.emAndamento ? plano.mensagem : 'Último dia para doar antes: ' + formatarData(periodo.ultimoDiaParaDoar) + '. ' + plano.mensagem}</span>
    </Link>
  );
}

export default FaixaFeriado;
