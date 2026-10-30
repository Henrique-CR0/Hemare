// Hemare - Seguranca da conta (doador e hospital): trocar a senha e sair de todos os aparelhos.
// Trocar a senha encerra as sessoes de outros aparelhos; esta continua, com um token novo.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { URL_BACKEND } from '../config';
import { salvarSessao, lerSessao, encerrarSessao } from '../sessao';

function AlterarSenha() {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  function cabecalho() {
    const sessao = lerSessao();
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (sessao ? sessao.token : '') };
  }

  async function trocar(e) {
    e.preventDefault();
    if (nova !== confirmacao) { setMensagem('❌ A confirmação não é igual à nova senha.'); return; }
    setEnviando(true); setMensagem('Salvando...');
    try {
      const r = await fetch(URL_BACKEND + '/auth/senha', { method: 'PUT', headers: cabecalho(), body: JSON.stringify({ senhaAtual: atual, novaSenha: nova }) });
      const d = await r.json();
      if (r.ok) {
        const sessao = lerSessao();
        salvarSessao(d.token, sessao ? sessao.usuario : null);
        setMensagem('✅ ' + d.mensagem);
        setAtual(''); setNova(''); setConfirmacao('');
      } else {
        setMensagem('❌ ' + d.erro);
      }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
    setEnviando(false);
  }

  async function sairDeTodos() {
    if (!window.confirm('Sair de todos os aparelhos? Você também sai deste e precisa entrar de novo.')) return;
    try {
      const r = await fetch(URL_BACKEND + '/auth/sair-de-todos', { method: 'POST', headers: cabecalho() });
      if (r.ok) { encerrarSessao(); navegar('/login'); return; }
      setMensagem('❌ ' + (await r.json()).erro);
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  return (
    <section className="mp-bloco seg">
      <h2>🔑 Segurança da conta</h2>
      <p className="mp-dica">Troque a senha quando quiser. Isso encerra as sessões abertas em outros aparelhos.</p>
      {!aberto ? (
        <div className="rr-botoes">
          <button type="button" className="conq-btn conq-btn-vazado" onClick={() => setAberto(true)}>Trocar minha senha</button>
          <button type="button" className="conq-btn conq-btn-vazado" onClick={sairDeTodos}>Sair de todos os aparelhos</button>
        </div>
      ) : (
        <form className="seg-form" onSubmit={trocar}>
          <label>Senha atual
            <input className="auth-input" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
          </label>
          <label>Nova senha (mínimo de 8 caracteres)
            <input className="auth-input" type="password" autoComplete="new-password" minLength={8} value={nova} onChange={(e) => setNova(e.target.value)} required />
          </label>
          <label>Repita a nova senha
            <input className="auth-input" type="password" autoComplete="new-password" minLength={8} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
          </label>
          <div className="rr-botoes">
            <button type="submit" className="auth-botao" disabled={enviando}>Salvar nova senha</button>
            <button type="button" className="conq-btn conq-btn-vazado" onClick={() => { setAberto(false); setMensagem(''); }}>Cancelar</button>
          </div>
        </form>
      )}
      {mensagem && <div className="auth-msg" role="status">{mensagem}</div>}
    </section>
  );
}

export default AlterarSenha;
