// Hemare - Pagina inicial (landing): apresenta o projeto.
import { Link } from 'react-router-dom';

function Inicio() {
  return (
    <div className="inicio">
      <section className="inicio-hero">
        <h1>Uma gota sua pode salvar até 4 vidas 🩸</h1>
        <p>
          O Hemare conecta doadores de sangue a hospitais e hemocentros,
          ajudando quem precisa a encontrar quem pode doar — de forma rápida e segura.
        </p>
        <div className="inicio-botoes">
          <Link to="/cadastro" className="botao-principal">Quero ser doador</Link>
          <Link to="/triagem" className="botao-secundario">Será que posso doar?</Link>
        </div>
      </section>

      <section className="inicio-cards">
        <div className="inicio-card">
          <h3>🧬 Compatibilidade</h3>
          <p>Encontramos os doadores certos para cada necessidade, respeitando o tipo sanguíneo.</p>
        </div>
        <div className="inicio-card">
          <h3>🏥 Hospitais parceiros</h3>
          <p>Hemocentros publicam suas necessidades e alcançam quem pode ajudar.</p>
        </div>
        <div className="inicio-card">
          <h3>💚 Doe com segurança</h3>
          <p>Orientações claras sobre quem pode doar e como se preparar para o dia.</p>
        </div>
      </section>
    </div>
  );
}

export default Inicio;