// Hemare - Layout base: cabecalho com acessibilidade completa (Libras, contraste, fonte, atalhos) + menu + conteudo + rodape.
import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { rotaInicial } from '../regras/rotaInicial';

// No celular um toque tambem dispara "mouse em cima"; o hover so vale com mouse de verdade
// (e so no menu largo: no menu "☰" o "Aprenda" abre so no clique).
function temMouse() {
  return window.matchMedia('(hover: hover) and (min-width: 1101px)').matches;
}

function Layout() {
  const [abertoAprenda, setAbertoAprenda] = useState(false);
  // Menu "hamburguer" (so aparece em telas menores).
  const [menuAberto, setMenuAberto] = useState(false);
  const navegar = useNavigate();
  const local = useLocation();
  const refConteudo = useRef(null);
  const refMenu = useRef(null);

  const token = localStorage.getItem('hemare_token');
  const usuarioSalvo = localStorage.getItem('hemare_usuario');
  const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
  const rotaArea = rotaInicial(usuario);

  const [altoContraste, setAltoContraste] = useState(
    localStorage.getItem('hemare_contraste') === 'sim'
  );
  const [escalaFonte, setEscalaFonte] = useState(
    Number(localStorage.getItem('hemare_fonte')) || 100
  );

  function alternarContraste() {
    setAltoContraste((atual) => {
      const novo = !atual;
      localStorage.setItem('hemare_contraste', novo ? 'sim' : 'nao');
      return novo;
    });
  }

  function ajustarFonte(delta) {
    setEscalaFonte((atual) => {
      let nova = atual + delta;
      if (nova < 90) nova = 90;
      if (nova > 130) nova = 130;
      localStorage.setItem('hemare_fonte', nova);
      document.body.style.zoom = nova + '%';
      return nova;
    });
  }

  // Aplica a fonte salva ao carregar a pagina.
  useEffect(() => {
    document.body.style.zoom = escalaFonte + '%';
  }, []);

  // Ao trocar de pagina, fecha o menu e o "Aprenda".
  useEffect(() => {
    setMenuAberto(false);
    setAbertoAprenda(false);
  }, [local.pathname]);

  // Atalhos de teclado no padrao do governo (ALT + numero). ESC fecha os menus.
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === 'Escape') { setMenuAberto(false); setAbertoAprenda(false); return; }
      if (!e.altKey) return;
      if (e.key === '1') { e.preventDefault(); refConteudo.current?.focus(); }
      if (e.key === '2') { e.preventDefault(); setMenuAberto(true); refMenu.current?.focus(); }
      if (e.key === '5') { e.preventDefault(); alternarContraste(); }
      if (e.key === '6') { e.preventDefault(); ajustarFonte(-10); }
      if (e.key === '7') { e.preventDefault(); ajustarFonte(10); }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  function sair() {
    localStorage.removeItem('hemare_token');
    localStorage.removeItem('hemare_usuario');
    navegar('/');
  }

  return (
    <div className={'site' + (altoContraste ? ' alto-contraste' : '')}>
      {/* Links de pular, visiveis so ao navegar por teclado (padrao eMAG) */}
      <a href="#conteudo-principal" className="link-pular">Ir para o conteúdo [ALT+1]</a>

      <header className="site-topo">
        <Link to="/" className="site-logo">🩸 Hemare</Link>

        {/* Acessibilidade fica sempre visivel, inclusive no celular. */}
        <div className="acess-barra">
          <button className="btn-acessibilidade" onClick={() => ajustarFonte(-10)} title="Diminuir fonte (ALT+6)">A−</button>
          <button className="btn-acessibilidade" onClick={() => ajustarFonte(10)} title="Aumentar fonte (ALT+7)">A+</button>
          <button className="btn-acessibilidade" onClick={alternarContraste} title="Alto contraste (ALT+5)">🌗 Contraste</button>
        </div>

        <button
          className="menu-botao"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          {menuAberto ? '✕ Fechar' : '☰ Menu'}
        </button>

        <nav id="menu-principal" className={'site-menu' + (menuAberto ? ' site-menu-aberto' : '')}
             ref={refMenu} tabIndex={-1} aria-label="Menu principal">
          <Link to="/">Início</Link>
          <Link to="/locais">Onde doar</Link>
          <Link to="/triagem">Posso doar?</Link>
          <Link to="/estoque">Termômetro de estoque</Link>
          <Link to="/noticias">Notícias</Link>
          <Link to="/clima">Previsão do sangue</Link>
          <Link to="/feriados">Feriados</Link>
          <Link to="/apadrinhar">Apadrinhe</Link>

          <div
            className="menu-drop"
            onMouseEnter={() => temMouse() && setAbertoAprenda(true)}
            onMouseLeave={() => temMouse() && setAbertoAprenda(false)}
          >
            {/* Botao (e nao so "passar o mouse"): funciona no toque e no teclado. */}
            <button
              type="button"
              className="menu-drop-titulo"
              aria-expanded={abertoAprenda}
              aria-controls="menu-aprenda"
              onClick={() => setAbertoAprenda((aberto) => !aberto)}
            >
              Aprenda ▾
            </button>
            {abertoAprenda && (
              <div className="menu-drop-lista" id="menu-aprenda">
                <Link to="/orientacoes">Guia da doação</Link>
                <Link to="/mitos">Mitos e verdades</Link>
                <Link to="/direitos">Seus direitos</Link>
                <Link to="/placar">Placar das cidades</Link>
              </div>
            )}
          </div>

          {token ? (
            <>
              <Link to={rotaArea}>Minha área</Link>
              <button className="menu-sair" onClick={sair}>Sair</button>
            </>
          ) : (
            <Link to="/login" className="menu-entrar">Entrar</Link>
          )}
        </nav>
      </header>

      <main className="site-conteudo" id="conteudo-principal" ref={refConteudo} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-rodape">
        <p>Hemare — conectando quem doa a quem precisa 🩸</p>
        <p className="site-rodape-aviso">
          Projeto acadêmico. As informações são orientativas e não substituem a avaliação médica.
        </p>
      </footer>
    </div>
  );
}

export default Layout;