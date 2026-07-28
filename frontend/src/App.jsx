// Hemare - Primeira tela: mostra o nome e busca o "ola" do backend.
import { useState, useEffect } from 'react';
import './App.css';

// Endereco do backend (a porta 3000 do Codespace).
const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function App() {
  // "estado": guarda a mensagem que vem do backend. Comeca vazia.
  const [mensagem, setMensagem] = useState('Conectando ao servidor...');

  // "useEffect": roda uma vez quando a tela abre. Aqui buscamos o "ola" do backend.
  useEffect(() => {
    fetch(URL_BACKEND + '/')
      .then((resposta) => resposta.json())
      .then((dados) => setMensagem(dados.mensagem))
      .catch(() => setMensagem('Nao consegui falar com o backend.'));
  }, []);

  return (
    <div className="hemare-tela">
      <h1 className="hemare-logo">🩸 Hemare</h1>
      <p className="hemare-sub">Conectando quem doa a quem precisa</p>
      <div className="hemare-status">{mensagem}</div>
    </div>
  );
}

export default App;