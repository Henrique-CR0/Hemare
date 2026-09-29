// Hemare - Recuperar senha: pede o codigo por email e redefine a senha + Enter funcionando.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { URL_BACKEND } from '../config';

function RecuperarSenha() {
  const navegar = useNavigate();
  const [etapa, setEtapa] = useState(1);
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
      setEtapa(2);
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
            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); pedirCodigo(); }}>
              <input className="auth-input" type="email" placeholder="Seu email"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="auth-botao">Enviar código</button>
            </form>
          </>
        ) : (
          <>
            <p className="auth-sub">
              Digite o código que enviamos para <strong>{email}</strong> e sua nova senha.
            </p>
            <p className="aviso-spam">📬 Não achou o email? Verifique sua caixa de <strong>spam</strong> ou lixo eletrônico.</p>
            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); redefinir(); }}>
              <input className="auth-input" type="text" inputMode="numeric" placeholder="Código de 6 dígitos"
                value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <input className="auth-input" type="password" placeholder="Nova senha (mín. 8 caracteres)"
                value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
              <button type="submit" className="auth-botao">Redefinir senha</button>
              <button type="button" className="btn-sugerir" onClick={() => { setEtapa(1); setMensagem(''); }}>
                ← Não recebi o código
              </button>
            </form>
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