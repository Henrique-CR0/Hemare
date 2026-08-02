// Hemare - Layout base do site: cabecalho (menu) + conteudo + rodape.
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="site">
      {/* CABECALHO com logo e menu */}
      <header className="site-topo">
        <Link to="/" className="site-logo">🩸 Hemare</Link>
        <nav className="site-menu">
          <Link to="/">Início</Link>
          <Link to="/triagem">Posso doar?</Link>
          <Link to="/login">Entrar</Link>
        </nav>
      </header>

      {/* CONTEUDO: aqui entra a pagina de cada URL */}
      <main className="site-conteudo">
        <Outlet />
      </main>

      {/* RODAPE */}
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