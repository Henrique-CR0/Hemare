// Hemare - Calendario do sangue, lado do hospital (painel do hospital):
// quantos doadores da cidade estarao aptos antes de cada feriado prolongado e uma chamada "doe antes do feriado".
// O hospital ve SO NUMEROS e nao sabe quem recebeu o e-mail.
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';
import { formatarData, quando } from '../regras/feriados';

function FeriadosHospital() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | indisponivel
  const [avisos, setAvisos] = useState({});

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/feriados/hospital', { headers: cabecalho })
      .then(async (r) => {
        if (!ativo()) return;
        if (!r.ok) return setSituacao('indisponivel');
        setDados(await r.json());
        setSituacao('ok');
      })
      .catch(() => ativo() && setSituacao('indisponivel'));
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function chamar(p) {
    if (!window.confirm('Enviar a chamada “doe antes de ' + p.nome + '” aos doadores da sua cidade que estarão aptos? Cada doador recebe no máximo um aviso por feriado.')) return;
    setAvisos((a) => ({ ...a, [p.inicio]: 'Enviando...' }));
    try {
      const r = await fetch(URL_BACKEND + '/feriados/hospital/chamar', { method: 'POST', headers: cabecalho, body: JSON.stringify({ inicio: p.inicio }) });
      const d = await r.json();
      setAvisos((a) => ({ ...a, [p.inicio]: (r.ok ? '' : '❌ ') + (d.mensagem || d.erro) }));
      if (r.ok && d.criado) carregar();
    } catch {
      setAvisos((a) => ({ ...a, [p.inicio]: '❌ Não consegui falar com o servidor.' }));
    }
  }

  if (situacao === 'carregando') return null;
  if (situacao === 'indisponivel') return null;

  return (
    <div className="painel-caixa fer-hosp">
      <h2>📅 Antes dos feriados</h2>
      <p className="estoque-ajuda">
        Feriados prolongados costumam derrubar as doações. Veja quantos doadores de <strong>{dados.cidade}</strong> estarão aptos antes de cada um
        e chame quem pode ajudar. Você vê <strong>só números</strong>: não recebe a lista nem sabe quem recebeu o e-mail.
      </p>
      {dados.periodos.length === 0 ? <p className="painel-vazio">Nenhum feriado prolongado nos próximos dois meses e meio.</p> : (
        <ul className="apad-lista">
          {dados.periodos.map((p) => (
            <li key={p.inicio} className="apad-caso">
              <strong>{p.nome}</strong> <span className={'fer-risco fer-risco-' + p.risco}>Risco {p.riscoRotulo.toLowerCase()}</span>
              <p className="apad-meta">
                {formatarData(p.inicio)} a {formatarData(p.fim)} · {quando(p)}
              </p>
              <p className="apad-meta">
                Doadores na cidade: {p.contagem.naCidade} · aptos agora: {p.contagem.aptosAgora}
                {!p.emAndamento && <> · aptos até {formatarData(p.ultimoDiaParaDoar)}: <strong>{p.contagem.aptosAteOFeriado}</strong></>}
              </p>
              {p.jaChamou && <p className="rr-ok">✔️ Você já chamou {p.convocadosNaChamada} doador(es) para este feriado.</p>}
              {p.podeChamar && dados.chamadasAtivas && (
                <button type="button" className="conq-btn" onClick={() => chamar(p)}>📅 Chamar doadores antes do feriado</button>
              )}
              {!p.podeChamar && !p.jaChamou && p.motivoSemChamada && <p className="painel-vazio">{p.motivoSemChamada}</p>}
              {avisos[p.inicio] && <p className="conq-copia" role="status">{avisos[p.inicio]}</p>}
            </li>
          ))}
        </ul>
      )}
      {!dados.chamadasAtivas && <p className="alerta-dica">As chamadas ainda não foram ativadas neste servidor (rode db/criar-feriados.js).</p>}
      <p className="alerta-dica">🔒 Só recebem o aviso doadores que aceitaram ser identificados, moram na sua cidade e ficam aptos antes do feriado.</p>
    </div>
  );
}

export default FeriadosHospital;
