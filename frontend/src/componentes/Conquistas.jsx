// Hemare - Conquistas do doador: nivel, vidas salvas, emblemas e proxima doacao.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

// Compara os emblemas de agora com os da ultima visita (guardados no navegador)
// e devolve os que sao novos. Na primeira visita so guarda, sem comemorar.
function descobrirEmblemasNovos(emblemas) {
  try {
    const usuario = JSON.parse(localStorage.getItem('hemare_usuario') || 'null');
    const chave = 'hemare_emblemas_vistos_' + (usuario ? usuario.id : 'anon');
    const ganhos = emblemas.filter((e) => e.conquistado).map((e) => e.id);
    const salvo = localStorage.getItem(chave);
    localStorage.setItem(chave, JSON.stringify(ganhos));
    if (salvo === null) return [];
    const vistos = JSON.parse(salvo);
    return emblemas.filter((e) => e.conquistado && !vistos.includes(e.id));
  } catch {
    return [];
  }
}

// Texto para divulgar nas redes e trazer mais doadores.
function textoCompartilhar(dados) {
  const site = window.location.origin;
  if (dados.totalDoacoes === 0) {
    return 'Estou me preparando para doar sangue pela primeira vez! 🩸 Uma doação pode salvar até 4 vidas. '
      + 'Veja se você pode doar também: ' + site;
  }
  const vezes = dados.totalDoacoes === 1 ? 'vez' : 'vezes';
  return 'Já doei sangue ' + dados.totalDoacoes + ' ' + vezes + ' e posso ter ajudado a salvar até '
    + dados.vidasSalvas + ' vidas! 🩸 Sou ' + dados.nivel.icone + ' "' + dados.nivel.nome + '" no Hemare. '
    + 'Doe sangue você também: ' + site;
}

function Conquistas() {
  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | sem-perfil | erro
  const [novos, setNovos] = useState([]);
  const [avisoCopia, setAvisoCopia] = useState('');
  const [querLembrete, setQuerLembrete] = useState(false);
  const [salvandoLembrete, setSalvandoLembrete] = useState(false);
  const [avisoLembrete, setAvisoLembrete] = useState('');

  // Liga/desliga o email "voce ja pode doar de novo" (opt-in).
  async function alternarLembrete() {
    setSalvandoLembrete(true);
    setAvisoLembrete('');
    try {
      const r = await fetch(URL_BACKEND + '/doador/lembrete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('hemare_token') },
        body: JSON.stringify({ ativo: !querLembrete })
      });
      const d = await r.json();
      if (r.ok) setQuerLembrete(d.querLembrete);
      setAvisoLembrete(r.ok ? d.mensagem : '❌ ' + d.erro);
    } catch {
      setAvisoLembrete('❌ Não consegui falar com o servidor.');
    }
    setSalvandoLembrete(false);
  }

  useEffect(() => {
    // Se o componente sair da tela antes da resposta, ela e ignorada
    // (senao os emblemas seriam marcados como vistos sem o aviso aparecer).
    let ativo = true;
    const token = localStorage.getItem('hemare_token');
    fetch(URL_BACKEND + '/doador/conquistas', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(async (r) => {
        if (!ativo) return;
        if (r.status === 404) return setSituacao('sem-perfil');
        if (!r.ok) return setSituacao('erro');
        const resposta = await r.json();
        if (!ativo) return;
        setNovos(descobrirEmblemasNovos(resposta.emblemas));
        setQuerLembrete(resposta.querLembrete === true);
        setDados(resposta);
        setSituacao('ok');
      })
      .catch(() => ativo && setSituacao('erro'));
    return () => { ativo = false; };
  }, []);

  async function compartilhar() {
    const texto = textoCompartilhar(dados);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Hemare', text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setAvisoCopia('Texto copiado! Cole onde quiser compartilhar.');
    } catch (erro) {
      // Cancelar o compartilhamento nao e erro.
      if (erro && erro.name === 'AbortError') return;
      setAvisoCopia('Não foi possível copiar. Use o botão do WhatsApp.');
    }
  }

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

      {novos.length > 0 && (
        <div className="conq-novo" role="status">
          <span className="conq-novo-ic" aria-hidden="true">🎉</span>
          <div>
            <strong>{novos.length === 1 ? 'Novo emblema conquistado!' : novos.length + ' novos emblemas conquistados!'}</strong>
            <span>{novos.map((e) => e.icone + ' ' + e.nome).join(' · ')}</span>
          </div>
        </div>
      )}

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
        <div className={'conq-proxima' + (elegibilidade.apto ? ' conq-proxima-apto' : '')}>
          <p>
            {elegibilidade.apto
              ? '✅ Pelo intervalo entre doações, você já pode doar de novo.'
              : '⏳ Você poderá doar de novo em ' + elegibilidade.diasRestantes + ' dias.'}
          </p>
          <div className="lembrete">
            <button type="button" className={'lembrete-btn' + (querLembrete ? ' lembrete-ativo' : '')}
                    aria-pressed={querLembrete} disabled={salvandoLembrete} onClick={alternarLembrete}>
              {querLembrete ? '🔔 Lembrete ligado' : '🔕 Me avise por email quando eu puder doar'}
            </button>
            <span className="lembrete-ajuda">
              {querLembrete
                ? 'Você recebe um email quando o intervalo acabar. Clique para desligar.'
                : 'Um único email por doação, só se você pedir.'}
            </span>
          </div>
          {avisoLembrete && <p className="lembrete-aviso" role="status">{avisoLembrete}</p>}
        </div>
      )}

      <h3 className="conq-subtitulo">Emblemas ({conquistados} de {emblemas.length})</h3>
      <ul className="conq-emblemas">
        {emblemas.map((e) => (
          <li key={e.id} className={'conq-emblema' + (e.conquistado ? ' conq-ganho' : '')
            + (novos.some((n) => n.id === e.id) ? ' conq-recem' : '')}>
            <span className="conq-emblema-ic" aria-hidden="true">{e.icone}</span>
            <strong>{e.nome}</strong>
            <span className="conq-emblema-desc">{e.descricao}</span>
            <span className="conq-emblema-status">{e.conquistado ? 'Conquistado' : 'Bloqueado'}</span>
          </li>
        ))}
      </ul>

      <div className="conq-compartilhar">
        <p>Inspire mais gente a doar: compartilhe sua conquista.</p>
        <div className="conq-botoes">
          <button type="button" className="conq-btn" onClick={compartilhar}>📤 Compartilhar</button>
          <a className="conq-btn conq-btn-whats" target="_blank" rel="noopener noreferrer"
             href={'https://wa.me/?text=' + encodeURIComponent(textoCompartilhar(dados))}>
            💬 WhatsApp
          </a>
          <Link to="/placar" className="conq-btn conq-btn-vazado">🏙️ Placar das cidades</Link>
        </div>
        {avisoCopia && <p className="conq-copia" role="status">{avisoCopia}</p>}
      </div>
    </section>
  );
}

export default Conquistas;
