// Hemare - Tela de login (refinada).
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

import { URL_BACKEND } from '../config';
import { rotaInicial } from '../regras/rotaInicial';
import { destinoSeguro, comDestino } from '../regras/destino';
import AcessoResumo from '../componentes/AcessoResumo';
import { lerSessao, salvarSessao, lerMotivo } from '../sessao';

function Login() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const destino = destinoSeguro(params.get('destino'), null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Quem ja esta logado (sessao valida guardada no navegador) vai direto para a sua area.
  // Se chegou aqui porque a sessao acabou, mostra um aviso em vez de uma tela de login "do nada".
  useEffect(() => {
    const motivo = lerMotivo();
    if (motivo === 'expirou') { setMensagem('⏳ Sua sessão terminou. Entre de novo para continuar.'); return; }
    const sessao = lerSessao();
    if (sessao) navegar(destino || rotaInicial(sessao.usuario), { replace: true });
  }, []);

  async function fazerLogin() {
    setMensagem('Entrando...');
    try {
      const resposta = await fetch(URL_BACKEND + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, senha: senha, lembrar: lembrar })
      });
      const dados = await resposta.json();

      if (resposta.ok) {
        salvarSessao(dados.token, dados.usuario);
        navegar(destino || rotaInicial(dados.usuario));
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
          <label className="auth-lembrar">
            <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            Manter conectado por 7 dias neste aparelho
          </label>
          <button type="submit" className="auth-botao">Entrar</button>
        </form>
        {mensagem && <div className="auth-msg">{mensagem}</div>}

        <p className="auth-troca">
          <Link to="/recuperar-senha">Esqueceu a senha?</Link>
        </p>
                <p className="auth-troca">
          Não tem conta? <Link to={comDestino('/cadastro', destino)}>Cadastre-se</Link>
        </p>
        <p className="auth-troca-hospital">
          É um hospital ou hemocentro? <Link to="/cadastro-hospital">Cadastre sua instituição</Link>
        </p>
      </div>
      <AcessoResumo />
    </div>
  );
}

export default Login;