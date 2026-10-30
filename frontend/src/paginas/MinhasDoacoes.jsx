// Hemare - Minhas doacoes: quantas doacoes, vidas, quando fica apto de novo, limite do ano e a linha do tempo
// (doacoes confirmadas na cadeia de confianca + agendamentos).
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';
import { formatarData, NOMES_STATUS, ICONES_STATUS } from '../regras/datas';

function MinhasDoacoes() {
  const token = localStorage.getItem('hemare_token');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/historico', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(async (r) => {
        const d = await r.json();
        if (!ativo) return;
        if (r.ok) setDados(d); else setErro(d.erro);
      })
      .catch(() => ativo && setErro('Não consegui falar com o servidor.'));
    return () => { ativo = false; };
  }, []);

  if (erro) {
    return (
      <div className="conteudo-pagina"><h1>🩸 Minhas doações</h1>
        <p className="painel-vazio">{erro} {erro.includes('perfil') && <Link to="/meu-perfil">Completar meu perfil</Link>}</p></div>
    );
  }
  if (!dados) return <div className="conteudo-pagina"><h1>🩸 Minhas doações</h1><p className="painel-vazio">Carregando...</p></div>;

  const r = dados.resumo;
  const anos = Object.keys(r.porAno).sort();
  const maiorAno = Math.max(1, ...Object.values(r.porAno));

  return (
    <div className="conteudo-pagina agd">
      <h1>🩸 Minhas doações</h1>
      <p className="agd-passo">{dados.proximoPasso} <Link to="/agendar">Agendar uma doação</Link></p>

      <div className="agd-numeros">
        <div><strong>{r.totalDoacoes}</strong><span>{r.totalDoacoes === 1 ? 'doação' : 'doações'}</span></div>
        <div><strong>até {r.vidasAte}</strong><span>vidas ajudadas</span></div>
        <div><strong>{r.ultimaDoacao ? formatarData(r.ultimaDoacao) : '—'}</strong><span>última doação</span></div>
        <div><strong>{r.aptoAgora ? 'Agora' : (r.aptoEm ? formatarData(r.aptoEm) : '—')}</strong><span>{r.aptoAgora ? 'você já pode doar' : 'você fica apto'}</span></div>
      </div>

      {r.limiteAnual !== null && (
        <div className="agd-limite">
          <p>Doações nos últimos 12 meses: <strong>{r.nosUltimos12Meses} de {r.limiteAnual}</strong> permitidas por ano.</p>
          <div className="agd-barra"><div style={{ width: Math.min(100, (r.nosUltimos12Meses / r.limiteAnual) * 100) + '%' }}></div></div>
        </div>
      )}

      {anos.length > 0 && (
        <div className="agd-anos">
          <h2>Doações por ano</h2>
          {anos.map((a) => (
            <div key={a} className="agd-ano"><span>{a}</span><div className="agd-barra"><div style={{ width: (r.porAno[a] / maiorAno) * 100 + '%' }}></div></div><strong>{r.porAno[a]}</strong></div>
          ))}
        </div>
      )}

      {r.agendamentos.taxaDeComparecimento !== null && (
        <p className="mp-dica">Você compareceu a {r.agendamentos.compareceu} de {r.agendamentos.compareceu + r.agendamentos.faltou} horários marcados ({r.agendamentos.taxaDeComparecimento}%).</p>
      )}

      <h2>Linha do tempo</h2>
      {dados.linhaDoTempo.length === 0 ? (
        <p className="painel-vazio">Nada por aqui ainda. Sua primeira doação aparece aqui assim que o hospital confirmar.</p>
      ) : (
        <ul className="agd-tempo">
          {dados.linhaDoTempo.map((i, n) => (
            <li key={n} className={'agd-item agd-' + (i.tipo === 'doacao' ? 'doacao' : i.status)}>
              <span className="agd-ic" aria-hidden="true">{i.tipo === 'doacao' ? '🩸' : ICONES_STATUS[i.status]}</span>
              <div>
                <strong>{formatarData(i.data)}{i.hora ? ' às ' + i.hora : ''} · {i.tipo === 'doacao' ? 'Doação confirmada' : NOMES_STATUS[i.status]}</strong>
                <p>{i.hospital} · {i.cidade}{i.selo && <> · selo <code>{i.selo}</code></>}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="agd-nota">O selo é o começo do código da cadeia de confiança: ele prova que o hospital confirmou a doação e que o registro não foi alterado.</p>
    </div>
  );
}

export default MinhasDoacoes;
