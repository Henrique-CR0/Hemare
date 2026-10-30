// Hemare - Feed de noticias no estilo "Google Noticias": destaques em grade, lista logo abaixo, filtros por assunto e estado.
// As noticias vem dos RSS de cada veiculo (o servidor coleta de hora em hora). Mostramos so titulo, trecho curto, imagem de
// divulgacao e o nome da fonte; o clique abre a materia no site de origem.
import { useState, useEffect, useRef, useCallback } from 'react';
import { URL_BACKEND } from '../config';
import { lerSessao } from '../sessao';
import { haQuanto, iniciais, corDaFonte } from '../regras/tempo';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const A_CADA_MS = 5 * 60 * 1000;
const ICONES = { doacao: '🩸', estoque: '🚨', campanhas: '📣', orgaos: '💚', saude: '⚕️' };

function Fonte({ nome }) {
  return (
    <span className="gn-fonte">
      <span className="gn-logo" style={{ background: corDaFonte(nome) }} aria-hidden="true">{iniciais(nome)}</span>
      <span className="gn-fonte-nome">{nome}</span>
    </span>
  );
}

function Miniatura({ url }) {
  const [quebrou, setQuebrou] = useState(false);
  if (!url || quebrou) return null;
  return <img className="gn-foto" src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setQuebrou(true)} />;
}

function Rodape({ n, agora, rotulos, ehAdmin, aoEsconder }) {
  return (
    <div className="gn-rodape">
      <span className="gn-tempo">{haQuanto(n.publicadaEm, agora)}</span>
      <span className="gn-tag">{ICONES[n.categoria]} {rotulos[n.categoria] || n.categoria}</span>
      {n.uf && <span className="gn-tag">{n.uf}</span>}
      {ehAdmin && <button type="button" className="gn-esconder" onClick={() => aoEsconder(n)}>Esconder</button>}
    </div>
  );
}

// O titulo e o unico link; o ::after dele cobre o cartao inteiro (o clique vale para o cartao todo, sem link dentro de link).
function Cartao({ n, agora, rotulos, ehAdmin, aoEsconder, lista }) {
  return (
    <article className={'gn-cartao' + (lista ? ' gn-cartao-lista' : '')}>
      <div className="gn-texto">
        <Fonte nome={n.fonte} />
        <h3 className="gn-titulo">
          <a href={n.url} target="_blank" rel="noopener noreferrer">{n.titulo}<span className="gn-sr"> (abre no site de {n.fonte})</span></a>
        </h3>
        {lista && n.resumo && <p className="gn-resumo">{n.resumo}</p>}
        <Rodape n={n} agora={agora} rotulos={rotulos} ehAdmin={ehAdmin} aoEsconder={aoEsconder} />
      </div>
      <Miniatura url={n.imagem} />
    </article>
  );
}

function FeedNoticias() {
  const sessao = lerSessao();
  const ehAdmin = !!sessao && sessao.usuario.tipo === 'admin';

  const [categoria, setCategoria] = useState('');
  const [uf, setUf] = useState('');
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useState(''); // o texto, com 0,4 s de atraso (nao pede a cada letra)
  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  const pedido = useRef(0);
  const paginaAtual = useRef(1);

  useEffect(() => {
    const t = setTimeout(() => setBusca(texto.trim()), 400);
    return () => clearTimeout(t);
  }, [texto]);

  // Busca uma pagina. So a resposta do pedido mais recente vale (trocar o filtro rapido nao mistura listas).
  const carregar = useCallback(async (pag, silencioso) => {
    const id = ++pedido.current;
    if (!silencioso && pag === 1) setSituacao('carregando');
    const params = new URLSearchParams({ pagina: String(pag) });
    if (categoria) params.set('categoria', categoria);
    if (uf) params.set('uf', uf);
    if (busca) params.set('q', busca);
    try {
      const r = await fetch(URL_BACKEND + '/noticias/feed?' + params.toString());
      if (!r.ok) throw new Error('falhou');
      const d = await r.json();
      if (id !== pedido.current) return;
      setItens((atuais) => (pag === 1 ? d.itens : [...atuais, ...d.itens]));
      setPagina(d.pagina);
      paginaAtual.current = d.pagina;
      setTotal(d.total);
      setTemMais(d.temMais);
      setCategorias(d.categorias);
      setAtualizadoEm(d.atualizadoEm);
      setSituacao('ok');
    } catch {
      if (id === pedido.current && !silencioso) setSituacao('erro');
    } finally {
      if (id === pedido.current) setCarregandoMais(false);
    }
  }, [categoria, uf, busca]);

  useEffect(() => { carregar(1, false); }, [carregar]);

  // Mantem a pagina viva: a cada 5 min (so com a aba aberta e sem ter pedido "ver mais") busca as mais novas; e atualiza os "há X min".
  useEffect(() => {
    const novas = setInterval(() => {
      if (document.visibilityState === 'visible' && paginaAtual.current === 1) carregar(1, true);
    }, A_CADA_MS);
    const relogio = setInterval(() => setAgora(Date.now()), 60 * 1000);
    return () => { clearInterval(novas); clearInterval(relogio); };
  }, [carregar]);

  function verMais() {
    setCarregandoMais(true);
    carregar(pagina + 1, false);
  }

  function limpar() { setCategoria(''); setUf(''); setTexto(''); setBusca(''); }

  async function esconder(n) {
    if (!window.confirm('Esconder esta notícia do feed?\n\n' + n.titulo)) return;
    try {
      const r = await fetch(URL_BACKEND + '/noticias/feed/' + n.id + '/ocultar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessao.token },
        body: JSON.stringify({ oculta: true })
      });
      if (r.ok) { setItens((atuais) => atuais.filter((x) => x.id !== n.id)); setTotal((t) => Math.max(0, t - 1)); }
    } catch { /* sem rede: a noticia fica onde esta */ }
  }

  const rotulos = Object.fromEntries(categorias.map((c) => [c.id, c.rotulo]));
  const somaCategorias = categorias.reduce((s, c) => s + c.total, 0);
  const filtrando = !!(categoria || uf || busca);
  const destaques = itens.slice(0, 4);
  const resto = itens.slice(4);

  return (
    <div className="gn">
      <div className="gn-barra">
        <input type="search" className="hemare-input gn-busca" placeholder="🔎 Buscar nas notícias" aria-label="Buscar nas notícias"
               value={texto} maxLength={60} onChange={(e) => setTexto(e.target.value)} />
        <select className="hemare-input gn-uf" aria-label="Filtrar por estado" value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Brasil todo</option>
          {UFS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="noti-filtros" role="group" aria-label="Filtrar por assunto">
        <button type="button" className={'noti-filtro' + (!categoria ? ' noti-filtro-ativo' : '')} aria-pressed={!categoria} onClick={() => setCategoria('')}>
          Todas{categorias.length > 0 ? ' (' + somaCategorias + ')' : ''}
        </button>
        {categorias.map((c) => (
          <button key={c.id} type="button" className={'noti-filtro' + (categoria === c.id ? ' noti-filtro-ativo' : '')}
                  aria-pressed={categoria === c.id} onClick={() => setCategoria(categoria === c.id ? '' : c.id)}>
            {ICONES[c.id]} {c.rotulo} ({c.total})
          </button>
        ))}
      </div>

      <p className="gn-status" aria-live="polite">
        {situacao === 'ok' && (atualizadoEm ? 'Atualizado ' + haQuanto(atualizadoEm, agora) + ' · ' : '') + total + (total === 1 ? ' notícia' : ' notícias')}
        {situacao === 'ok' && <> · <button type="button" className="gn-atualizar" onClick={() => carregar(1, false)}>↻ Atualizar</button></>}
      </p>

      {situacao === 'carregando' && <p className="noti-vazio">Carregando as notícias...</p>}
      {situacao === 'erro' && (
        <p className="noti-vazio">Não foi possível carregar as notícias agora. <button type="button" className="gn-atualizar" onClick={() => carregar(1, false)}>Tentar de novo</button></p>
      )}

      {situacao === 'ok' && itens.length === 0 && (
        <div className="gn-vazio">
          {filtrando ? (
            <>
              <p>Nenhuma notícia com esses filtros.</p>
              <button type="button" className="conq-btn conq-btn-vazado" onClick={limpar}>Limpar filtros</button>
            </>
          ) : (
            <p>Ainda não há notícias coletadas. O Hemare busca novidades dos hemocentros e da imprensa de hora em hora; volte em instantes.</p>
          )}
        </div>
      )}

      {situacao === 'ok' && itens.length > 0 && (
        <>
          <h2 className="gn-secao">{filtrando ? 'Resultados' : 'Principais notícias'}</h2>
          <div className="gn-grade">
            {destaques.map((n) => <Cartao key={n.id} n={n} agora={agora} rotulos={rotulos} ehAdmin={ehAdmin} aoEsconder={esconder} />)}
          </div>

          {resto.length > 0 && (
            <>
              <h2 className="gn-secao">Mais notícias</h2>
              <div className="gn-lista">
                {resto.map((n) => <Cartao key={n.id} n={n} agora={agora} rotulos={rotulos} ehAdmin={ehAdmin} aoEsconder={esconder} lista />)}
              </div>
            </>
          )}

          {temMais && (
            <div className="gn-mais">
              <button type="button" className="conq-btn conq-btn-vazado" disabled={carregandoMais} onClick={verMais}>
                {carregandoMais ? 'Carregando...' : 'Ver mais notícias'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FeedNoticias;
