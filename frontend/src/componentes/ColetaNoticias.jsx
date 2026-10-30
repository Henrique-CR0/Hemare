// Hemare - Painel do administrador: de onde vem o feed de noticias, como foi a ultima coleta e botao "Coletar agora".
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';
import { haQuanto } from '../regras/tempo';

function ColetaNoticias() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Authorization': 'Bearer ' + token };
  const [dados, setDados] = useState(null);
  const [coletando, setColetando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/noticias/feed/coleta', { headers: cabecalho })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && ativo()) setDados(d); })
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function coletarAgora() {
    setColetando(true);
    setMensagem('');
    try {
      const r = await fetch(URL_BACKEND + '/noticias/feed/coletar', { method: 'POST', headers: cabecalho });
      const d = await r.json();
      setMensagem(r.ok ? '✅ ' + d.novos + (d.novos === 1 ? ' notícia nova.' : ' notícias novas.') : '❌ ' + d.erro);
      if (r.ok) carregar();
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    } finally {
      setColetando(false);
    }
  }

  const resultado = {};
  if (dados && dados.ultima) dados.ultima.fontes.forEach((f) => { resultado[f.id] = f; });

  return (
    <div className="coleta">
      <h3>🛰️ Feed de notícias (automático)</h3>
      <p className="adm-sub">
        O servidor lê os feeds RSS abaixo ao ligar e de hora em hora, e guarda só título, trecho curto, imagem e link.
        {dados && dados.ultima ? ' Última coleta: ' + haQuanto(dados.ultima.terminouEm) + '.' : ' Ainda não houve coleta desde que o servidor ligou.'}
      </p>
      <button type="button" className="conq-btn conq-btn-vazado" disabled={coletando} onClick={coletarAgora}>
        {coletando ? 'Coletando...' : '↻ Coletar agora'}
      </button>
      {mensagem && <div className="painel-msg">{mensagem}</div>}
      {dados && (
        <ul className="coleta-fontes">
          {dados.fontes.map((f) => {
            const r = resultado[f.id];
            return (
              <li key={f.id}>
                <strong>{f.nome}</strong> <span className="coleta-tipo">({f.tipo})</span>
                {r && (r.ok ? <span className="coleta-ok"> ✅ {r.novos} novas · {r.lidos} aproveitadas</span> : <span className="coleta-erro"> ⚠️ fora do ar: {r.erro}</span>)}
                <div className="coleta-licenca">{f.licenca}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ColetaNoticias;
