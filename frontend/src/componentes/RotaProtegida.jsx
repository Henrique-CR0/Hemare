// Hemare - Porteiro do frontend: so deixa passar quem esta logado (e, se a rota pedir, quem tem o papel certo).
// E so conforto de navegacao: quem realmente protege os dados e o backend.
import { Navigate } from 'react-router-dom';
import { lerSessao, encerrarSessao } from '../sessao';
import { rotaInicial } from '../regras/rotaInicial';

// papeis: ex.: ['hospital']. Sem a lista, qualquer pessoa logada entra.
function RotaProtegida({ children, papeis }) {
  const sessao = lerSessao();

  // Sem sessao (ou com o token vencido): limpa e manda para o login.
  if (!sessao) {
    if (localStorage.getItem('hemare_token')) encerrarSessao('expirou');
    return <Navigate to="/login" replace />;
  }

  // Logado, mas esta tela e de outro tipo de conta: leva para a area certa em vez de mostrar uma tela quebrada.
  if (papeis && !papeis.includes(sessao.usuario.tipo)) {
    return <Navigate to={rotaInicial(sessao.usuario)} replace />;
  }
  return children;
}

export default RotaProtegida;
