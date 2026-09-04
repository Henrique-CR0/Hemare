// Hemare - Cadastro do doador: nome sem numeros, validacao de email e forca de senha.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function forcaSenha(senha) {
  let f = 0;
  if (senha.length >= 8) f++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) f++;
  if (/[0-9]/.test(senha) && /[^A-Za-z0-9]/.test(senha)) f++;
  return f;
}

function Cadastro() {
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailTocado, setEmailTocado] = useState(false);
  const [avisoNome, setAvisoNome] = useState('');
  const [mensagem, setMensagem] = useState('');

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const forca = forcaSenha(senha);
  const rotuloForca = ['', 'Fraca', 'Média', 'Forte'][forca];
  const mostrarEmailErro = emailTocado && email && !emailValido;
  const mostrarEmailOk = emailTocado && email && emailValido;

  // Bloqueia numeros no nome: so deixa letras, espacos, acentos, hifen e apostrofo.
  function digitarNome(valor) {
    if (/[0-9]/.test(valor)) {
      setAvisoNome('O nome não pode conter números.');
    } else {
      setAvisoNome('');
    }
    const limpo = valor.replace(/[0-9]/g, '');
    setNome(limpo);
  }

  async function cadastrar() {
    if (!nome || !email || !senha) {
      setMensagem('❌ Preencha todos os campos.');
      return;
    }
    if (!emailValido) {
      setEmailTocado(true);
      setMensagem('❌ Digite um email válido (ex: nome@email.com).');
      return;
    }
    if (senha.length < 8) {
      setMensagem('❌ A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setMensagem('Cadastrando...');
    try {
      const resposta = await fetch(URL_BACKEND + '/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, tipo: 'doador' })
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
          {/* Nome sem numeros */}
          <input className="auth-input" type="text" placeholder="Nome completo"
            value={nome} onChange={(e) => digitarNome(e.target.value)} />
          {avisoNome && <p className="campo-aviso">{avisoNome}</p>}

          {/* Email */}
          <input
            className={'auth-input' + (mostrarEmailOk ? ' campo-ok' : '') + (mostrarEmailErro ? ' campo-erro' : '')}
            type="email" placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTocado(true)} />
          {mostrarEmailErro && <p className="campo-aviso">Email inválido — verifique o "@" e o ponto.</p>}

          {/* Senha */}
          <div className="senha-linha">
            <input className="auth-input senha-input" type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha (mín. 8 caracteres)"
              value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" className="senha-olho" onClick={() => setMostrarSenha(!mostrarSenha)}>
              {mostrarSenha ? '🙈' : '👁️'}
            </button>
          </div>

          {senha && (
            <div className="forca-caixa">
              <div className={'forca-barra forca-' + forca}></div>
              <span className="forca-texto">{rotuloForca}</span>
            </div>
          )}

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