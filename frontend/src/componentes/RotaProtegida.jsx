// Hemare - Porteiro do frontend: so deixa passar quem esta logado.
import { Navigate } from 'react-router-dom';

function RotaProtegida({ children }) {
  const token = localStorage.getItem('hemare_token');

  // Sem token? Manda para o login. Com token? Mostra a pagina.
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default RotaProtegida;