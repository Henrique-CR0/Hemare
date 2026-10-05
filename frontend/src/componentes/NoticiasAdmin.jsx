// Hemare - Painel do administrador: cadastrar e remover avisos do canal de noticias.
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const NIVEIS = [
  ['critico', '🔴 Estoque crítico'], ['alerta', '🟠 Em alerta'], ['atencao', '🟡 Atenção'],
  ['estavel', '🟢 Estável'], ['sem-dados', '⚪ Sem dados recentes']
];

function NoticiasAdmin() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [avisos, setAvisos] = useState([]);
  const [uf, setUf] = useState('');
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [fonte, setFonte] = useState('');
  const [url, setUrl] = useState('');
  const [nivel, setNivel] = useState('alerta');
  const [referencia, setReferencia] = useState('');
  const [mensagem, setMensagem] = useState('');

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/noticias')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !ativo()) return;
        const lista = [];
        d.estados.forEach((e) => e.noticias.forEach((n) => lista.push({ ...n, uf: e.sigla })));
        setAvisos(lista.sort((a, b) => b.id - a.id).slice(0, 8));
      })
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function publicar(e) {
    e.preventDefault();
    setMensagem('Publicando...');
    try {
      const r = await fetch(URL_BACKEND + '/noticias', {
        method: 'POST', headers: cabecalho,
        body: JSON.stringify({ uf, titulo, resumo, fonte, url, nivel, referencia })
      });
      const d = await r.json();
      setMensagem((r.ok ? '✅ ' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) { setTitulo(''); setResumo(''); setFonte(''); setUrl(''); setReferencia(''); carregar(); }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  async function remover(aviso) {
    if (!window.confirm('Remover o aviso "' + aviso.titulo + '"?')) return;
    try {
      const r = await fetch(URL_BACKEND + '/noticias/' + aviso.id, { method: 'DELETE', headers: cabecalho });
      if (r.ok) carregar();
    } catch { /* silencioso */ }
  }

  return (
    <section className="adm-noticias">
      <h2>📰 Canal de notícias</h2>
      <p className="adm-sub">
        Cadastre um aviso por matéria: escreva o resumo <strong>com as suas palavras</strong> e cole o link da matéria original.
        O nível de cada estado é o do aviso mais recente.
      </p>
      <form className="painel-form apad-form" onSubmit={publicar}>
        <select className="hemare-input" value={uf} onChange={(e) => setUf(e.target.value)} required>
          <option value="">Estado...</option>
          {UFS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="hemare-input" placeholder="Título (até 160 caracteres)" maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea className="hemare-input" placeholder="Resumo com suas palavras (20 a 400 caracteres)" maxLength={400} rows={3}
                  value={resumo} onChange={(e) => setResumo(e.target.value)} />
        <input className="hemare-input" placeholder="Fonte (ex.: Agência Brasil)" maxLength={60} value={fonte} onChange={(e) => setFonte(e.target.value)} />
        <input className="hemare-input" type="url" placeholder="Link da matéria (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select className="hemare-input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
          {NIVEIS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select>
        <input className="hemare-input" placeholder='Referência de data (ex.: "set/2026")' maxLength={30} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        <button className="hemare-botao" type="submit">Publicar aviso</button>
      </form>
      {mensagem && <div className="painel-msg">{mensagem}</div>}

      {avisos.length > 0 && (
        <ul className="noti-lista">
          {avisos.map((a) => (
            <li key={a.id}>
              <strong>{a.uf}</strong> · {a.titulo}
              <button type="button" className="conq-btn conq-btn-vazado" onClick={() => remover(a)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default NoticiasAdmin;
