// Hemare - Cadastro de hospital: cria a conta e salva o perfil (cidade/endereco).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function CadastroHospital() {
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [endereco, setEndereco] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function cadastrar() {
    if (!nome || !email || !senha || !cidade || !estado) {
      setMensagem('❌ Preencha nome, email, senha, cidade e estado.');
      return;
    }
    setMensagem('Cadastrando...');
    try {
      // 1) Cria a conta do hospital.
      const rCadastro = await fetch(URL_BACKEND + '/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, tipo: 'hospital' })
      });
      const dCadastro = await rCadastro.json();
      if (!rCadastro.ok) {
        setMensagem('❌ ' + dCadastro.erro);
        return;
      }

      // 2) Faz login para pegar o token.
      const rLogin = await fetch(URL_BACKEND + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const dLogin = await rLogin.json();

      // 3) Salva o perfil do hospital (cidade/estado/endereco) usando o token.
      await fetch(URL_BACKEND + '/hospital/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dLogin.token },
        body: JSON.stringify({ cidade, estado, endereco })
      });

      // Guarda o login e leva ao painel do hospital.
      localStorage.setItem('hemare_token', dLogin.token);
      localStorage.setItem('hemare_usuario', JSON.stringify(dLogin.usuario));
      setMensagem('✅ Hospital cadastrado! Redirecionando...');
      setTimeout(() => navegar('/painel-hospital'), 1500);
    } catch (erro) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card">
        <div className="auth-gota">🏥</div>
        <h1 className="auth-titulo">Cadastrar hospital</h1>
        <p className="auth-sub">Cadastre sua instituição e encontre doadores.</p>

        <div className="auth-form">
          <input className="auth-input" type="text" placeholder="Nome do hospital"
            value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="auth-input" type="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="auth-input" type="password" placeholder="Senha"
            value={senha} onChange={(e) => setSenha(e.target.value)} />
          <input className="auth-input" type="text" placeholder="Cidade"
            value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <select className="auth-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Estado (UF)...</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <input className="auth-input" type="text" placeholder="Endereço (opcional)"
            value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          <button className="auth-botao" onClick={cadastrar}>Cadastrar hospital</button>
        </div>

        {mensagem && <div className="auth-msg">{mensagem}</div>}

        <p className="auth-troca">
          É doador? <Link to="/cadastro">Cadastre-se aqui</Link>
        </p>
      </div>
    </div>
  );
}

export default CadastroHospital;