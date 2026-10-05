// Hemare - Rede de sangue raro, lado do hospital (painel do hospital):
// conferir o laudo de um doador pelo codigo, chamar doadores numa emergencia e acompanhar os pedidos.
// O hospital NUNCA ve a lista de doadores: so quantos existem e, depois, quem respondeu "posso ajudar".
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

const FENOTIPOS = [
  ['rh-nulo', 'Rh nulo (sangue dourado)'], ['bombay', 'Bombay (Oh)'], ['vel-negativo', 'Vel negativo'],
  ['jk-nulo', 'Jk(a-b-) (Kidd nulo)'], ['kell-nulo', 'Kell nulo (K0)']
];

function RedeRaraHospital() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [codigo, setCodigo] = useState('');
  const [achado, setAchado] = useState(null);
  const [laudoConferido, setLaudoConferido] = useState(false);
  const [avisoCodigo, setAvisoCodigo] = useState('');
  const [fenotipo, setFenotipo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [apelido, setApelido] = useState('');
  const [previa, setPrevia] = useState('');
  const [avisoPedido, setAvisoPedido] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [avisos, setAvisos] = useState({});

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/raros/pedidos', { headers: cabecalho })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => ativo() && setPedidos(Array.isArray(lista) ? lista : []))
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function buscarCodigo(e) {
    e.preventDefault();
    setAchado(null); setLaudoConferido(false); setAvisoCodigo('Buscando...');
    try {
      const r = await fetch(URL_BACKEND + '/raros/codigo/' + encodeURIComponent(codigo.trim()), { headers: cabecalho });
      const d = await r.json();
      if (r.ok) { setAchado(d); setAvisoCodigo(''); } else { setAvisoCodigo('❌ ' + d.erro); }
    } catch {
      setAvisoCodigo('❌ Não consegui falar com o servidor.');
    }
  }

  async function confirmarCodigo() {
    try {
      const r = await fetch(URL_BACKEND + '/raros/codigo/' + encodeURIComponent(codigo.trim()) + '/confirmar', { method: 'POST', headers: cabecalho });
      const d = await r.json();
      setAvisoCodigo((r.ok ? '' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) { setAchado(null); setCodigo(''); }
    } catch {
      setAvisoCodigo('❌ Não consegui falar com o servidor.');
    }
  }

  async function verPrevia() {
    if (!fenotipo) { setPrevia('Escolha o fenótipo.'); return; }
    try {
      const r = await fetch(URL_BACKEND + '/raros/previa?fenotipo=' + fenotipo, { headers: cabecalho });
      const d = await r.json();
      setPrevia(r.ok
        ? 'Na rede: ' + d.resumo.naRede + ' · ao alcance da sua cidade: ' + d.resumo.noAlcance + ' · podem ser chamados agora: ' + d.resumo.convocados
        : '❌ ' + d.erro);
    } catch {
      setPrevia('❌ Não consegui falar com o servidor.');
    }
  }

  async function chamar(e) {
    e.preventDefault();
    if (!window.confirm('Enviar o chamado de emergência aos doadores compatíveis? Ele vale por 72 horas.')) return;
    setAvisoPedido('Enviando...');
    try {
      const r = await fetch(URL_BACKEND + '/raros/pedidos', {
        method: 'POST', headers: cabecalho, body: JSON.stringify({ fenotipo, motivo, apelidoPaciente: apelido })
      });
      const d = await r.json();
      setAvisoPedido((r.ok ? '' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok && d.criado) { setMotivo(''); setApelido(''); carregar(); }
    } catch {
      setAvisoPedido('❌ Não consegui falar com o servidor.');
    }
  }

  async function acao(pedido, caminho, corpo, confirmacao) {
    if (confirmacao && !window.confirm(confirmacao)) return;
    try {
      const r = await fetch(URL_BACKEND + '/raros/pedidos/' + pedido.id + caminho, {
        method: 'POST', headers: cabecalho, body: JSON.stringify(corpo || {})
      });
      const d = await r.json();
      setAvisos((a) => ({ ...a, [pedido.id]: d.mensagem || d.erro }));
      if (r.ok) carregar();
    } catch {
      setAvisos((a) => ({ ...a, [pedido.id]: 'Não consegui falar com o servidor.' }));
    }
  }

  return (
    <div className="painel-caixa rr-hosp">
      <h2>💎 Rede de sangue raro</h2>
      <p className="estoque-ajuda">
        Para emergências com fenótipos raros. Você <strong>não vê a lista de doadores</strong>: descreve a emergência, o Hemare chama
        os compatíveis e você só vê nome e telefone de quem responde “posso ajudar”.
      </p>

      <h3>1. Confirmar o laudo de um doador</h3>
      <form className="painel-form" onSubmit={buscarCodigo}>
        <input className="hemare-input" placeholder="Código que o doador mostra (8 caracteres)" maxLength={12} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
        <button className="hemare-botao" type="submit">Buscar</button>
      </form>
      {achado && (
        <div className="rr-achado">
          <p><strong>{achado.primeiroNome}</strong> declarou <strong>{achado.fenotipoRotulo}</strong>
            {achado.status === 'confirmado' ? ' (já confirmado).' : '.'}</p>
          {achado.status !== 'confirmado' && (
            <>
              <label className="apad-autoriza">
                <input type="checkbox" checked={laudoConferido} onChange={(e) => setLaudoConferido(e.target.checked)} />
                Conferi o laudo laboratorial desta pessoa, pessoalmente.
              </label>
              <button type="button" className="conq-btn" disabled={!laudoConferido} onClick={confirmarCodigo}>✓ Confirmar fenótipo</button>
            </>
          )}
        </div>
      )}
      {avisoCodigo && <div className="painel-msg">{avisoCodigo}</div>}

      <h3>2. Chamar doadores numa emergência</h3>
      <form className="painel-form apad-form" onSubmit={chamar}>
        <select className="hemare-input" value={fenotipo} onChange={(e) => { setFenotipo(e.target.value); setPrevia(''); }} required>
          <option value="">Fenótipo que o paciente precisa...</option>
          {FENOTIPOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select>
        <textarea className="hemare-input" rows={3} maxLength={300} placeholder="Descreva a emergência (20 a 300 caracteres, sem o nome do paciente). Fica registrado para auditoria e não é enviado aos doadores."
                  value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <input className="hemare-input" maxLength={30} placeholder='Apelido do paciente (opcional, ex.: "Paciente Aurora")' value={apelido} onChange={(e) => setApelido(e.target.value)} />
        <div className="rr-botoes">
          <button type="button" className="conq-btn conq-btn-vazado" onClick={verPrevia}>Ver quantos doadores</button>
          <button type="submit" className="conq-btn">🆘 Enviar chamado</button>
        </div>
      </form>
      {previa && <p className="rr-previa">{previa}</p>}
      {avisoPedido && <div className="painel-msg">{avisoPedido}</div>}

      <h3>3. Meus pedidos</h3>
      {pedidos.length === 0 ? <p className="painel-vazio">Nenhum pedido ainda.</p> : (
        <ul className="apad-lista">
          {pedidos.map((p) => (
            <li key={p.id} className="apad-caso">
              <strong>{p.fenotipo}{p.apelidoPaciente ? ' · ' + p.apelidoPaciente : ''}</strong>
              <p className="apad-meta">
                {p.estado === 'aberto' ? '🟢 Aberto (' + p.horasRestantes + ' h)' : p.estado === 'expirado' ? '⏳ Expirado' : '✔️ Encerrado'}
                {' · '}{p.convocados} chamados · {p.disponiveisTotal} podem ajudar · {p.semResposta} sem resposta
              </p>
              {p.disponiveis.length > 0 && (
                <ul className="camp-promessas">
                  {p.disponiveis.map((d) => (
                    <li key={d.doadorId}>
                      <span><strong>{d.nome}</strong> · {d.cidade} · 📞 {d.telefone}</span>
                      {d.doacaoConfirmada
                        ? <span className="btn-confirmado">✓ Doação confirmada</span>
                        : <button type="button" className="btn-confirmar" onClick={() => acao(p, '/confirmar-doacao', { doadorId: d.doadorId })}>✓ Confirmar doação</button>}
                    </li>
                  ))}
                </ul>
              )}
              {p.estado === 'aberto' && (
                <button type="button" className="conq-btn conq-btn-vazado" onClick={() => acao(p, '/encerrar', {}, 'Encerrar o pedido? Os contatos voltam a ficar protegidos.')}>Encerrar pedido</button>
              )}
              {avisos[p.id] && <p className="conq-copia" role="status">{avisos[p.id]}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="alerta-dica">🔒 Cada doador recebe no máximo um chamado por semana, só quem confirmou o laudo e aceitou entrar na rede. Todo pedido fica registrado.</p>
    </div>
  );
}

export default RedeRaraHospital;
