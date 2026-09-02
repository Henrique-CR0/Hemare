// Hemare - Layout base do site: cabecalho (menu com dropdown) + conteudo + rodape.
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  const [abertoAprenda, setAbertoAprenda] = useState(false);

  return (
    <div className="site">
      <header className="site-topo">
        <Link to="/" className="site-logo">🩸 Hemare</Link>

        <nav className="site-menu">
          <Link to="/">Início</Link>
          <Link to="/locais">Onde doar</Link>
          <Link to="/triagem">Posso doar?</Link>

          <div
            className="menu-drop"
            onMouseEnter={() => setAbertoAprenda(true)}
            onMouseLeave={() => setAbertoAprenda(false)}
          >
            <span className="menu-drop-titulo">Aprenda ▾</span>
            {abertoAprenda && (
              <div className="menu-drop-lista">
                <Link to="/orientacoes">Guia da doação</Link>
                <Link to="/mitos">Mitos e verdades</Link>
                <Link to="/direitos">Seus direitos</Link>
              </div>
            )}
          </div>

          <Link to="/login" className="menu-entrar">Entrar</Link>
        </nav>
      </header>

      <main className="site-conteudo">
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