// Hemare - Rede de sangue raro, lado do doador (dentro do Meu perfil):
// entrar na rede, mostrar o codigo ao hospital para confirmar o laudo e responder a chamados de emergencia.
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

function RedeRara() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | indisponivel | sem-perfil
  const [fenotipo, setFenotipo] = useState('');
  const [alcance, setAlcance] = useState('estado');
  const [consentimento, setConsentimento] = useState(false);
  const [editando, setEditando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  function aplicar(d) {
    setDados(d);
    setFenotipo(d.fenotipo || '');
    setAlcance(d.alcance || 'estado');
    setConsentimento(d.participa);
    setSituacao('ok');
  }

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/raros/eu', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(async (r) => {
        if (!ativo) return;
        if (r.status === 404) return setSituacao('sem-perfil');
        if (!r.ok) return setSituacao('indisponivel');
        aplicar(await r.json());
      })
      .catch(() => ativo && setSituacao('indisponivel'));
    return () => { ativo = false; };
  }, []);

  async function enviar(corpo, sucesso) {
    setMensagem('Salvando...');
    try {
      const r = await fetch(URL_BACKEND + '/raros/eu', { method: 'PUT', headers: cabecalho, body: JSON.stringify(corpo) });
      const d = await r.json();
      if (r.ok) { aplicar(d); setEditando(false); setMensagem('✅ ' + sucesso); } else { setMensagem('❌ ' + d.erro); }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  function salvar(e) {
    e.preventDefault();
    if (!fenotipo) { setMensagem('❌ Escolha o seu fenótipo.'); return; }
    enviar({ participar: true, fenotipo, alcance, consentimento }, 'Pronto! Você está na rede.');
  }

  async function responder(chamado, resposta) {
    try {
      const r = await fetch(URL_BACKEND + '/raros/convocacoes/' + chamado.pedidoId + '/responder', {
        method: 'POST', headers: cabecalho, body: JSON.stringify({ resposta })
      });
      const d = await r.json();
      setMensagem((r.ok ? '' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) {
        const novo = await fetch(URL_BACKEND + '/raros/eu', { headers: { 'Authorization': 'Bearer ' + token } });
        if (novo.ok) aplicar(await novo.json());
      }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  if (situacao === 'carregando' || situacao === 'sem-perfil') return null;
  if (situacao === 'indisponivel') return null; // recurso ainda nao ativado no banco: some, sem atrapalhar o perfil

  const formulario = (
    <form className="rr-form" onSubmit={salvar}>
      <label>Meu fenótipo raro
        <select className="auth-input" value={fenotipo} onChange={(e) => setFenotipo(e.target.value)}>
          <option value="">Escolha...</option>
          {dados.fenotipos.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
        </select>
      </label>
      <label>Até onde posso ir
        <select className="auth-input" value={alcance} onChange={(e) => setAlcance(e.target.value)}>
          {dados.alcances.map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
        </select>
      </label>
      <label className="rr-consentimento">
        <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
        Autorizo hospitais aprovados do Hemare a me chamar em emergências reais. Meu nome e telefone só aparecem para o hospital
        se eu responder “posso ajudar”.
      </label>
      <div className="rr-botoes">
        <button type="submit" className="conq-btn">{dados.participa ? 'Salvar mudanças' : '💎 Entrar na rede'}</button>
        {editando && <button type="button" className="conq-btn conq-btn-vazado" onClick={() => setEditando(false)}>Cancelar</button>}
      </div>
    </form>
  );

  return (
    <section className="mp-bloco rr" aria-labelledby="rr-titulo">
      <h2 id="rr-titulo">💎 Rede de sangue raro</h2>
      <p className="mp-dica">
        Alguns fenótipos (como Rh nulo e Bombay) são tão raros que, numa emergência, encontrar uma bolsa compatível pode levar dias.
        Se você é um deles, a rede avisa você quando um hospital precisar. A decisão clínica é sempre da equipe médica.
      </p>

      {dados.chamados.length > 0 && (
        <div className="rr-chamados" role="alert">
          <h3>🆘 Chamados para você</h3>
          {dados.chamados.map((c) => (
            <div key={c.pedidoId} className="rr-chamado">
              <p>
                <strong>{c.hospital}</strong> ({c.cidade}/{c.estado}) procura <strong>{c.fenotipo}</strong>
                {c.apelidoPaciente ? ' para ' + c.apelidoPaciente : ''}. Restam cerca de {c.horasRestantes} h.
              </p>
              {c.resposta === 'disponivel' ? (
                <p className="rr-ok">✅ Você disse que pode ajudar. O hospital vai falar com você pelo telefone do seu perfil.</p>
              ) : c.resposta === 'indisponivel' ? (
                <p>Você avisou que não pode desta vez. Obrigado!</p>
              ) : (
                <div className="rr-botoes">
                  <button type="button" className="conq-btn" onClick={() => responder(c, 'disponivel')}>💛 Posso ajudar</button>
                  <button type="button" className="conq-btn conq-btn-vazado" onClick={() => responder(c, 'indisponivel')}>Não posso agora</button>
                </div>
              )}
            </div>
          ))}
          <p className="mp-dica">Só ao escolher “posso ajudar” o hospital passa a ver seu nome e telefone.</p>
        </div>
      )}

      {!dados.participa || editando ? (
        <>
          {!dados.perfilPronto && (
            <p className="campo-aviso">Para entrar, informe um telefone e o sexo do intervalo entre doações no seu perfil acima e salve.</p>
          )}
          {formulario}
        </>
      ) : (
        <div className="rr-status">
          <p>
            <span className="mp-chip mp-chip-tipo">{dados.fenotipoRotulo}</span>{' '}
            {dados.status === 'confirmado'
              ? <span className="mp-chip rr-confirmado">✓ Confirmado por um hospital</span>
              : <span className="mp-chip">⏳ Aguardando confirmação do laudo</span>}
          </p>
          {dados.status !== 'confirmado' && (
            <div className="rr-codigo">
              <span>Seu código para o hospital</span>
              <strong>{dados.codigo}</strong>
              <small>
                Leve o <b>laudo laboratorial</b> a um hospital que use o Hemare e mostre este código. Quem confere o laudo pessoalmente
                confirma o seu fenótipo. Enquanto não for confirmado, você não é chamado.
              </small>
            </div>
          )}
          <p className="mp-dica">Alcance: {(dados.alcances.find((a) => a.valor === dados.alcance) || {}).rotulo}. Você é chamado no máximo uma vez por semana.</p>
          <div className="rr-botoes">
            <button type="button" className="conq-btn conq-btn-vazado" onClick={() => setEditando(true)}>Mudar fenótipo ou alcance</button>
            <button type="button" className="conq-btn conq-btn-vazado mp-perigo"
                    onClick={() => window.confirm('Sair da rede de sangue raro?') && enviar({ participar: false }, 'Você saiu da rede. Pode voltar quando quiser.')}>
              Sair da rede
            </button>
          </div>
        </div>
      )}
      {mensagem && <p className="conq-copia" role="status">{mensagem}</p>}
    </section>
  );
}

export default RedeRara;
