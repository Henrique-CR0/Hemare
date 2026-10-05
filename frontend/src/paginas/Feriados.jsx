// Hemare - Calendario do sangue: feriados prolongados em que as doacoes costumam cair, e (para quem esta logado)
// o plano pessoal: quando eu fico apto e ate quando doar para ajudar ANTES do feriado.
// A previsao e de calendario (feriados nacionais), nao uma estatistica do Hemare: a tela diz isso.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';
import { formatarData, quando } from '../regras/feriados';

const SELO_PLANO = {
  'apto-agora': { classe: 'fer-plano-ok', icone: '✅' },
  'apto-antes': { classe: 'fer-plano-ok', icone: '🗓️' },
  'apto-depois': { classe: 'fer-plano-depois', icone: '⏳' },
  'sem-dados': { classe: 'fer-plano-depois', icone: 'ℹ️' }
};

function Feriados() {
  const token = localStorage.getItem('hemare_token');
  const usuarioSalvo = localStorage.getItem('hemare_usuario');
  let usuario = null;
  try { usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null; } catch { usuario = null; }
  const ehDoador = !!token && !!usuario && usuario.tipo === 'doador';

  const [publico, setPublico] = useState(null);
  const [meuPlano, setMeuPlano] = useState(null);
  const [erro, setErro] = useState('');
  const [querAviso, setQuerAviso] = useState(false);
  const [avisoMsg, setAvisoMsg] = useState('');

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/feriados')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => ativo && setPublico(d))
      .catch(() => ativo && setErro('Não consegui carregar o calendário agora.'));
    if (ehDoador) {
      fetch(URL_BACKEND + '/feriados/meu-plano', { headers: { 'Authorization': 'Bearer ' + token } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!ativo || !d) return;
          setMeuPlano(d);
          setQuerAviso(d.querAviso);
        })
        .catch(() => {});
    }
    return () => { ativo = false; };
  }, []);

  async function mudarAviso(valor) {
    setQuerAviso(valor);
    setAvisoMsg('Salvando...');
    try {
      const r = await fetch(URL_BACKEND + '/feriados/aviso', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ querAviso: valor })
      });
      const d = await r.json();
      if (r.ok) { setQuerAviso(d.querAviso); setAvisoMsg(d.mensagem); } else { setQuerAviso(!valor); setAvisoMsg('❌ ' + d.erro); }
    } catch {
      setQuerAviso(!valor);
      setAvisoMsg('❌ Não consegui falar com o servidor.');
    }
  }

  const planoPorInicio = {};
  if (meuPlano) meuPlano.planos.forEach((x) => { planoPorInicio[x.periodo.inicio] = x.plano; });

  return (
    <div className="conteudo-pagina fer">
      <h1>📅 Calendário do sangue</h1>
      <p className="conteudo-intro">
        Perto de feriados prolongados as doações costumam cair e o estoque aperta. Veja os próximos e até quando dá para doar antes deles.
      </p>
      {publico && <p className="fer-porque">{publico.porque}</p>}

      {ehDoador && meuPlano && (
        <div className="fer-aviso">
          <label className="apad-autoriza">
            <input type="checkbox" checked={querAviso} onChange={(e) => mudarAviso(e.target.checked)} />
            Quero um aviso por e-mail alguns dias antes de feriados prolongados em que eu puder doar (no máximo um por feriado).
          </label>
          {avisoMsg && <p className="conq-copia" role="status">{avisoMsg}</p>}
        </div>
      )}
      {!ehDoador && (
        <p className="fer-entre">
          <Link to="/login">Entre</Link> ou <Link to="/cadastro">cadastre-se</Link> para ver quando você fica apto e receber um aviso antes do feriado.
        </p>
      )}

      {erro && <p className="painel-vazio">{erro}</p>}
      {publico && publico.periodos.length === 0 && <p className="painel-vazio">Nenhum feriado prolongado nos próximos dois meses e meio.</p>}

      <div className="fer-lista">
        {publico && publico.periodos.map((p) => {
          const plano = planoPorInicio[p.inicio];
          const selo = plano && SELO_PLANO[plano.situacao];
          return (
            <article key={p.inicio} className={'fer-card fer-' + p.risco}>
              <div className="fer-topo">
                <h2>{p.nome}</h2>
                <span className={'fer-risco fer-risco-' + p.risco}>Risco {p.riscoRotulo.toLowerCase()}</span>
              </div>
              <p className="fer-datas">
                {formatarData(p.inicio)} a {formatarData(p.fim)} · {p.dias} {p.dias === 1 ? 'dia' : 'dias'} · <strong>{quando(p)}</strong>
              </p>
              {!p.emAndamento && (
                <p className="fer-ultimo">Último dia para doar antes: <strong>{formatarData(p.ultimoDiaParaDoar)}</strong></p>
              )}
              {plano && (
                <p className={'fer-plano ' + selo.classe}><span aria-hidden="true">{selo.icone}</span> {plano.mensagem}</p>
              )}
            </article>
          );
        })}
      </div>

      <p className="fer-nota">
        Só entram feriados nacionais; feriados estaduais e municipais não. Antes de doar, confira se você atende aos requisitos na{' '}
        <Link to="/triagem">triagem</Link> e procure o hemocentro mais perto em <Link to="/locais">Onde doar</Link>.
      </p>
    </div>
  );
}

export default Feriados;
