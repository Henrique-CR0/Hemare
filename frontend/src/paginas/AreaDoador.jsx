// Hemare - Area do doador (refinada).
import { Link, useNavigate } from 'react-router-dom';
import Conquistas from '../componentes/Conquistas';
import Indicacao from '../componentes/Indicacao';

function AreaDoador() {
  const navegar = useNavigate();
  const usuarioSalvo = localStorage.getItem('hemare_usuario');
  const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
  const primeiroNome = usuario ? usuario.nome.split(' ')[0] : 'doador';

  function sair() {
    localStorage.removeItem('hemare_token');
    localStorage.removeItem('hemare_usuario');
    navegar('/');
  }

  return (
    <div className="area-doador">
      <div className="area-saudacao">
        <div className="area-avatar">🩸</div>
        <div>
          <h1>Olá, {primeiroNome}!</h1>
          <p className="area-sub">Bem-vindo(a) à sua área. O que você quer fazer hoje?</p>
        </div>
      </div>

      <Conquistas />
      <Indicacao />

      <div className="area-cards">
        <Link to="/completar-perfil" className="area-card">
          <div className="area-card-ic">📝</div>
          <h3>Completar meu perfil</h3>
          <p>Informe seu tipo sanguíneo, cidade e outros dados.</p>
        </Link>
        <Link to="/triagem" className="area-card">
          <div className="area-card-ic">🩺</div>
          <h3>Posso doar hoje?</h3>
          <p>Faça a triagem rápida e veja se está apto.</p>
        </Link>
        <Link to="/locais" className="area-card">
          <div className="area-card-ic">🗺️</div>
          <h3>Onde doar</h3>
          <p>Encontre um hemocentro perto de você.</p>
        </Link>
      </div>

      <button className="area-sair" onClick={sair}>Sair da conta</button>
    </div>
  );
}

export default AreaDoador;