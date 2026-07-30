// Hemare - Tela de login.
import { useState } from 'react';

// Endereco do backend (a porta 3000 do Codespace).
const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function Login() {
  // Um estado para cada campo do formulario.
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Estado para mostrar mensagens (erro ou sucesso) para o usuario.
  const [mensagem, setMensagem] = useState('');

  // Funcao chamada quando o usuario clica em "Entrar".
  async function fazerLogin() {
    setMensagem('Entrando...');
    try {
      const resposta = await fetch(URL_BACKEND + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, senha: senha })
      });
      const dados = await resposta.json();

      if (resposta.ok) {
        // Deu certo: guarda o token no navegador e avisa.
        localStorage.setItem('hemare_token', dados.token);
        localStorage.setItem('hemare_usuario', JSON.stringify(dados.usuario));
        setMensagem('✅ Bem-vindo(a), ' + dados.usuario.nome + '!');
      } else {
        // Deu erro: mostra a mensagem que o backend devolveu.
        setMensagem('❌ ' + dados.erro);
      }
    } catch (erro) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="hemare-tela">
      <h1 className="hemare-logo">🩸 Hemare</h1>
      <p className="hemare-sub">Entre na sua conta</p>

      <div className="hemare-form">
        <input
          className="hemare-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="hemare-input"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <button className="hemare-botao" onClick={fazerLogin}>Entrar</button>
      </div>

      {mensagem && <div className="hemare-status">{mensagem}</div>}
    </div>
  );
}

export default Login;