// Hemare - Conquistas do doador: nivel, vidas salvas, emblemas e proxima doacao.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

function Conquistas() {
  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | sem-perfil | erro

  useEffect(() => {
    const token = localStorage.getItem('hemare_token');
    fetch(URL_BACKEND + '/doador/conquistas', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(async (r) => {
        if (r.status === 404) return setSituacao('sem-perfil');
        if (!r.ok) return setSituacao('erro');
        setDados(await r.json());
        setSituacao('ok');
      })
      .catch(() => setSituacao('erro'));
  }, []);

  if (situacao === 'carregando') {
    return <p className="conq-aviso">Carregando suas conquistas...</p>;
  }

  if (situacao === 'sem-perfil') {
    return (
      <p className="conq-aviso">
        <Link to="/completar-perfil" className="hemare-link">Complete seu perfil</Link> para começar a ganhar emblemas.
      </p>
    );
  }

  if (situacao === 'erro') {
    return <p className="conq-aviso">Não foi possível carregar suas conquistas agora.</p>;
  }

  const { nivel, proximoNivel, progresso, totalDoacoes, vidasSalvas, emblemas, elegibilidade } = dados;
  const conquistados = emblemas.filter((e) => e.conquistado).length;

  return (
    <section className="conq" aria-labelledby="conq-titulo">
      <h2 id="conq-titulo" className="conq-titulo">Minhas conquistas</h2>

      <div className="conq-topo">
        <div className="conq-nivel">
          <span className="conq-nivel-ic" aria-hidden="true">{nivel.icone}</span>
          <div>
            <div className="conq-nivel-num">Nível {nivel.numero}</div>
            <div className="conq-nivel-nome">{nivel.nome}</div>
          </div>
        </div>
        <div className="conq-numeros">
          <div><strong>{totalDoacoes}</strong><span>{totalDoacoes === 1 ? 'doação' : 'doações'}</span></div>
          <div><strong>{vidasSalvas}</strong><span>vidas que podem ter sido salvas</span></div>
        </div>
      </div>

      {proximoNivel ? (
        <div className="conq-progresso">
          <div className="conq-barra-fundo" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso}
               aria-label={'Progresso até o nível ' + proximoNivel.nome}>
            <div className="conq-barra" style={{ width: progresso + '%' }}></div>
          </div>
          <p>
            Falta{proximoNivel.faltam === 1 ? '' : 'm'} <strong>{proximoNivel.faltam}</strong> {proximoNivel.faltam === 1 ? 'doação' : 'doações'} para
            {' '}{proximoNivel.icone} <strong>{proximoNivel.nome}</strong>
          </p>
        </div>
      ) : (
        <p className="conq-progresso">Você chegou ao nível máximo. Obrigado por tanto! 💛</p>
      )}

      {elegibilidade && (
        <p className={'conq-proxima' + (elegibilidade.apto ? ' conq-proxima-apto' : '')}>
          {elegibilidade.apto
            ? '✅ Pelo intervalo entre doações, você já pode doar de novo.'
            : '⏳ Você poderá doar de novo em ' + elegibilidade.diasRestantes + ' dias.'}
        </p>
      )}

      <h3 className="conq-subtitulo">Emblemas ({conquistados} de {emblemas.length})</h3>
      <ul className="conq-emblemas">
        {emblemas.map((e) => (
          <li key={e.id} className={'conq-emblema' + (e.conquistado ? ' conq-ganho' : '')}>
            <span className="conq-emblema-ic" aria-hidden="true">{e.icone}</span>
            <strong>{e.nome}</strong>
            <span className="conq-emblema-desc">{e.descricao}</span>
            <span className="conq-emblema-status">{e.conquistado ? 'Conquistado' : 'Bloqueado'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Conquistas;
