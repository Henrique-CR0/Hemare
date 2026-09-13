// Hemare - Layout base: cabecalho com acessibilidade (contraste, fonte) + menu + conteudo + rodape.
import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

function Layout() {
  const [abertoAprenda, setAbertoAprenda] = useState(false);
  const navegar = useNavigate();

  // Login: verifica se ha alguem logado.
  const token = localStorage.getItem('hemare_token');
  const usuarioSalvo = localStorage.getItem('hemare_usuario');
  const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
  const rotaArea = usuario && usuario.tipo === 'hospital' ? '/painel-hospital' : '/area-doador';

  // Acessibilidade: alto contraste.
  const [altoContraste, setAltoContraste] = useState(
    localStorage.getItem('hemare_contraste') === 'sim'
  );

  // Acessibilidade: escala da fonte (90% a 130%).
  const [escalaFonte, setEscalaFonte] = useState(
    Number(localStorage.getItem('hemare_fonte')) || 100
  );

  // Aplica a fonte salva assim que a pagina carrega.
  useEffect(() => {
    document.body.style.zoom = escalaFonte + '%';
  }, []);

  function alternarContraste() {
    const novo = !altoContraste;
    setAltoContraste(novo);
    localStorage.setItem('hemare_contraste', novo ? 'sim' : 'nao');
  }

  function ajustarFonte(delta) {
    let nova = escalaFonte + delta;
    if (nova < 90) nova = 90;
    if (nova > 130) nova = 130;
    setEscalaFonte(nova);
    localStorage.setItem('hemare_fonte', nova);
    document.body.style.zoom = nova + '%';
  }

  function sair() {
    localStorage.removeItem('hemare_token');
    localStorage.removeItem('hemare_usuario');
    navegar('/');
  }

  return (
    <div className={'site' + (altoContraste ? ' alto-contraste' : '')}>
      <header className="site-topo">
        <Link to="/" className="site-logo">🩸 Hemare</Link>

        <nav className="site-menu">
          <button className="btn-acessibilidade" onClick={() => ajustarFonte(-10)} title="Diminuir fonte">A−</button>
          <button className="btn-acessibilidade" onClick={() => ajustarFonte(10)} title="Aumentar fonte">A+</button>
          <button className="btn-acessibilidade" onClick={alternarContraste} title="Alto contraste (ALT+5)">🌗 Contraste</button>

          <Link to="/">Início</Link>
          <Link to="/locais">Onde doar</Link>
          <Link to="/triagem">Posso doar?</Link>
          <Link to="/estoque">Termômetro de estoque</Link>

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
        <p>Hemare — conectando quem doa a quem precisa 🩸</p>
        <p className="site-rodape-aviso">
          Projeto acadêmico. As informações são orientativas e não substituem a avaliação médica.
        </p>
      </footer>
    </div>
  );
}

export default Layout;