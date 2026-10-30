// Hemare - "Portao de acesso": o que o visitante (sem conta) ve ao abrir uma tela que exige conta.
// Em vez de jogar a pessoa numa tela de login sem explicar, mostra o que ela ganha, por que a conta e necessaria
// e o que continua aberto. Depois de entrar ou se cadastrar, ela volta para esta mesma tela.
import { Link, useLocation } from 'react-router-dom';
import { comDestino } from '../regras/destino';

function PortaoDeAcesso({ icone, titulo, porque, beneficios, abertas }) {
  const { pathname, search } = useLocation();
  const aqui = pathname + search;
  return (
    <div className="portao">
      <div className="portao-icone" aria-hidden="true">{icone}</div>
      <h1>{titulo}</h1>
      <p className="portao-porque">{porque}</p>

      <h2>Com a sua conta gratuita você pode:</h2>
      <ul className="portao-lista">
        {beneficios.map((b) => <li key={b}>✅ {b}</li>)}
      </ul>

      <div className="portao-botoes">
        <Link to={comDestino('/cadastro', aqui)} className="auth-botao">Criar minha conta</Link>
        <Link to={comDestino('/login', aqui)} className="conq-btn conq-btn-vazado">Já tenho conta</Link>
      </div>
      <p className="portao-hospital">É um hospital ou hemocentro? <Link to="/cadastro-hospital">Cadastre sua instituição</Link></p>

      {abertas && abertas.length > 0 && (
        <div className="portao-abertas">
          <h2>Sem conta você já pode ver:</h2>
          <p>
            {abertas.map((a, i) => (
              <span key={a.para}>{i > 0 && ' · '}<Link to={a.para} className="hemare-link">{a.rotulo}</Link></span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

export default PortaoDeAcesso;
