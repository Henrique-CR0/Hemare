// Hemare - Cadastro simples (so cria a conta). O perfil e preenchido depois do login.
import { useState } from 'react';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function Cadastro() {
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
        setMensagem('✅ Conta criada! Agora faça login para completar seu perfil.');
        setNome(''); setEmail(''); setSenha('');
      } else {
        setMensagem('❌ ' + dados.erro);
      }
    } catch (erro) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="hemare-tela">
      <h1 className="hemare-logo">🩸 Hemare</h1>
      <p className="hemare-sub">Criar sua conta</p>

      <div className="hemare-form">
        <input className="hemare-input" type="text" placeholder="Nome completo"
          value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className="hemare-input" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="hemare-input" type="password" placeholder="Senha"
          value={senha} onChange={(e) => setSenha(e.target.value)} />
        <button className="hemare-botao" onClick={cadastrar}>Cadastrar</button>
      </div>

      {mensagem && <div className="hemare-status">{mensagem}</div>}
    </div>
  );
}

export default Cadastro;