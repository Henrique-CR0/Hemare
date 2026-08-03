// Hemare - Area do doador (painel apos o login).
import { Link, useNavigate } from 'react-router-dom';

function AreaDoador() {
  const navegar = useNavigate();

  // Pega o usuario que foi guardado no login.
  const usuarioSalvo = localStorage.getItem('hemare_usuario');
  const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;

  function sair() {
    // Logout: apaga o token e o usuario, e volta para a home.
    localStorage.removeItem('hemare_token');
    localStorage.removeItem('hemare_usuario');
    navegar('/');
  }

  return (
    <div className="area-doador">
      <h1>Olá, {usuario ? usuario.nome : 'doador'}! 🩸</h1>
      <p className="area-sub">Bem-vindo(a) à sua área. O que você quer fazer?</p>

      <div className="area-cards">
        <Link to="/completar-perfil" className="area-card">
          <h3>📝 Completar meu perfil</h3>
          <p>Informe seu tipo sanguíneo, cidade e outros dados.</p>
        </Link>
        <Link to="/triagem" className="area-card">
          <h3>🩺 Posso doar hoje?</h3>
          <p>Faça a triagem rápida e veja se está apto.</p>
        </Link>
      </div>

      <button className="area-sair" onClick={sair}>Sair da conta</button>
    </div>
  );
}

export default AreaDoador;