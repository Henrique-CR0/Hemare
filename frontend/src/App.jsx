// Hemare - Alterna entre as telas de login e cadastro.
import { useState } from 'react';
import Login from './paginas/Login';
import Cadastro from './paginas/Cadastro';
import './App.css';

function App() {
  // Guarda qual tela mostrar: 'login' ou 'cadastro'. Comeca no login.
  const [tela, setTela] = useState('login');

  return (
    <div>
      {/* Mostra a tela escolhida */}
      {tela === 'login' ? <Login /> : <Cadastro />}

      {/* Link para alternar entre as telas */}
      <div className="hemare-troca">
        {tela === 'login' ? (
          <span>
            Não tem conta?{' '}
            <button className="hemare-link" onClick={() => setTela('cadastro')}>Cadastre-se</button>
          </span>
        ) : (
          <span>
            Já tem conta?{' '}
            <button className="hemare-link" onClick={() => setTela('login')}>Entrar</button>
          </span>
        )}
      </div>
    </div>
  );
}

export default App;