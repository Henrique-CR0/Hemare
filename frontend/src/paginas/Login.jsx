// Hemare - Tela de login (refinada).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { URL_BACKEND } from '../config';
import { rotaInicial } from '../regras/rotaInicial';

function Login() {
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');

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
        localStorage.setItem('hemare_token', dados.token);
        localStorage.setItem('hemare_usuario', JSON.stringify(dados.usuario));
        navegar(rotaInicial(dados.usuario));
      } else {
        setMensagem('❌ ' + dados.erro);
      }
    } catch (erro) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card">
        <div className="auth-gota">🩸</div>
        <h1 className="auth-titulo">Entrar no Hemare</h1>
        <p className="auth-sub">Bem-vindo(a) de volta! Acesse sua conta.</p>

          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); fazerLogin(); }}>
          <input className="auth-input" type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="auth-input" type="password" placeholder="Senha"
            value={senha} onChange={(e) => setSenha(e.target.value)} />
          <button type="submit" className="auth-botao">Entrar</button>
        </form>
        {mensagem && <div className="auth-msg">{mensagem}</div>}

        <p className="auth-troca">
          <Link to="/recuperar-senha">Esqueceu a senha?</Link>
        </p>
                <p className="auth-troca">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
        <p className="auth-troca-hospital">
          É um hospital ou hemocentro? <Link to="/cadastro-hospital">Cadastre sua instituição</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;