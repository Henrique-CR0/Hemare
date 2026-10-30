// Hemare - Porteiro do frontend: decide quem pode abrir cada tela.
//   <RotaProtegida>                                  so quem esta logado
//   <RotaProtegida papeis={['hospital']}>            so esse tipo de conta (outro tipo vai para a sua propria area)
//   <RotaProtegida papeis={['doador']} permitirVisitante>   visitante (sem login) E esse tipo; conta de outro tipo vai para a sua area
//   <RotaProtegida soVisitante>                      so quem NAO esta logado (cadastro, recuperar senha): logado vai para a sua area
// E so conforto de navegacao: quem realmente protege os dados e o backend.
import { Navigate } from 'react-router-dom';
import { lerSessao, encerrarSessao } from '../sessao';
import { rotaInicial } from '../regras/rotaInicial';

function RotaProtegida({ children, papeis, permitirVisitante, soVisitante }) {
  const sessao = lerSessao();

  if (soVisitante) {
    return sessao ? <Navigate to={rotaInicial(sessao.usuario)} replace /> : children;
  }

  // Sem sessao (ou com o token vencido).
  if (!sessao) {
    if (permitirVisitante) return children;
    if (localStorage.getItem('hemare_token')) encerrarSessao('expirou');
    return <Navigate to="/login" replace />;
  }

  // Logado, mas esta tela e de outro tipo de conta: leva para a area certa em vez de mostrar uma tela que nao e dele.
  if (papeis && !papeis.includes(sessao.usuario.tipo)) {
    return <Navigate to={rotaInicial(sessao.usuario)} replace />;
  }
  return children;
}

export default RotaProtegida;
