// Hemare - Recuperar senha: pede o codigo por email e redefine a senha.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function RecuperarSenha() {
  const navegar = useNavigate();
  const [etapa, setEtapa] = useState(1); // 1 = pedir codigo, 2 = redefinir
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function pedirCodigo() {
    if (!email) { setMensagem('❌ Informe seu email.'); return; }
    setMensagem('Enviando...');
    try {
      const r = await fetch(URL_BACKEND + '/recuperacao/pedir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const d = await r.json();
      setMensagem('✅ ' + d.mensagem);
      setEtapa(2); // avanca pra digitar o codigo
    } catch (e) {
      setMensagem('❌ Erro ao enviar. Tente de novo.');
    }
  }

  async function redefinir() {
    if (!codigo || !novaSenha) { setMensagem('❌ Preencha o código e a nova senha.'); return; }
    if (novaSenha.length < 8) { setMensagem('❌ A nova senha deve ter pelo menos 8 caracteres.'); return; }
    setMensagem('Redefinindo...');
    try {
      const r = await fetch(URL_BACKEND + '/recuperacao/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, novaSenha })
      });
      const d = await r.json();
      if (r.ok) {
        setMensagem('✅ ' + d.mensagem);
        setTimeout(() => navegar('/login'), 1800);
      } else {
        setMensagem('❌ ' + d.erro);
      }
    } catch (e) {
      setMensagem('❌ Erro ao redefinir.');
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card">
        <div className="auth-gota">🔑</div>
        <h1 className="auth-titulo">Recuperar senha</h1>

        {etapa === 1 ? (
          <>
            <p className="auth-sub">Digite seu email para receber um código de recuperação.</p>
            <div className="auth-form">
              <input className="auth-input" type="email" placeholder="Seu email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="auth-botao" onClick={pedirCodigo}>Enviar código</button>
            </div>
          </>
        ) : (
          <>
            <p className="auth-sub">
              Digite o código que enviamos para <strong>{email}</strong> e sua nova senha.
            </p>
            <p className="aviso-spam">📬 Não achou o email? Verifique sua caixa de <strong>spam</strong> ou lixo eletrônico.</p>            <div className="auth-form">
              <input className="auth-input" type="text" inputMode="numeric" placeholder="Código de 6 dígitos"
                value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <input className="auth-input" type="password" placeholder="Nova senha (mín. 8 caracteres)"
                value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
              <button className="auth-botao" onClick={redefinir}>Redefinir senha</button>
              <button type="button" className="btn-sugerir" onClick={() => { setEtapa(1); setMensagem(''); }}>
                ← Não recebi o código
              </button>
            </div>
          </>
        )}

        {mensagem && <div className="auth-msg">{mensagem}</div>}

        <p className="auth-troca">
          Lembrou a senha? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default RecuperarSenha;