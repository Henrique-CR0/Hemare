// Hemare - Tela de cadastro (refinada).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function Cadastro() {
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function cadastrar() {
    if (!nome || !email || !senha) {
      setMensagem('❌ Preencha todos os campos.');
      return;
    }
    setMensagem('Cadastrando...');
    try {
      const resposta = await fetch(URL_BACKEND + '/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, email: email, senha: senha, tipo: 'doador' })
      });
      const dados = await resposta.json();

      if (resposta.ok) {
        setMensagem('✅ Conta criada! Redirecionando para o login...');
        setTimeout(() => navegar('/login'), 1500);
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
        <h1 className="auth-titulo">Criar sua conta</h1>
        <p className="auth-sub">Junte-se ao Hemare e ajude a salvar vidas.</p>

        <div className="auth-form">
          <input className="auth-input" type="text" placeholder="Nome completo"
            value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="auth-input" type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="auth-input" type="password" placeholder="Senha"
            value={senha} onChange={(e) => setSenha(e.target.value)} />
          <button className="auth-botao" onClick={cadastrar}>Cadastrar</button>
        </div>

        {mensagem && <div className="auth-msg">{mensagem}</div>}

        <p className="auth-troca">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default Cadastro;