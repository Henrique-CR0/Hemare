// Hemare - Layout base: cabecalho que muda se o usuario esta logado + conteudo + rodape.
import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

function Layout() {
  const [abertoAprenda, setAbertoAprenda] = useState(false);
  const navegar = useNavigate();
  const local = useLocation();

  // Verifica se ha alguem logado (le o token/usuario guardado).
  const token = localStorage.getItem('hemare_token');
  const usuarioSalvo = localStorage.getItem('hemare_usuario');
  const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;

  // Para onde vai a "Minha área": hospital vai pro painel, doador pra area dele.
  const rotaArea = usuario && usuario.tipo === 'hospital' ? '/painel-hospital' : '/area-doador';

  function sair() {
    localStorage.removeItem('hemare_token');
    localStorage.removeItem('hemare_usuario');
    navegar('/');
  }

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

          {/* Menu muda conforme o login */}
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

      <main className="site-conteudo">
        <Outlet />
      </main>

      <footer className="site-rodape">
        <p>Hemare conectando quem doa a quem precisa 🩸</p>
        <p className="site-rodape-aviso">
          Projeto acadêmico. As informações são orientativas e não substituem a avaliação médica.
        </p>
      </footer>
    </div>
  );
}

export default Layout;