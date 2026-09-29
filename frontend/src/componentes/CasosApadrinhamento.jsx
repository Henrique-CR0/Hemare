// Hemare - Painel do hospital: pacientes que procuram padrinhos (cadastrar, chamar padrinhos, encerrar).
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

const TIPOS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const CONDICOES = ['Não informada', 'Anemia falciforme', 'Talassemia', 'Hemofilia', 'Tratamento oncológico', 'Aplasia de medula', 'Outra condição'];

function CasosApadrinhamento() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [casos, setCasos] = useState([]);
  const [apelido, setApelido] = useState('');
  const [tipo, setTipo] = useState('');
  const [condicao, setCondicao] = useState(CONDICOES[0]);
  const [frequencia, setFrequencia] = useState('30');
  const [autorizacao, setAutorizacao] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [avisos, setAvisos] = useState({}); // { [casoId]: mensagem do chamado }

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/apadrinhamento/meus-casos', { headers: cabecalho })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => ativo() && setCasos(Array.isArray(lista) ? lista : []))
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function publicar(e) {
    e.preventDefault();
    if (!tipo) { setMensagem('❌ Escolha o tipo sanguíneo do paciente.'); return; }
    setMensagem('Publicando...');
    try {
      const r = await fetch(URL_BACKEND + '/apadrinhamento', {
        method: 'POST', headers: cabecalho,
        body: JSON.stringify({ apelido, tipoSanguineo: tipo, condicao, frequenciaDias: Number(frequencia), autorizacao })
      });
      const d = await r.json();
      setMensagem((r.ok ? '✅ ' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) { setApelido(''); setTipo(''); setAutorizacao(false); carregar(); }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  async function chamar(caso) {
    try {
      const r = await fetch(URL_BACKEND + '/apadrinhamento/' + caso.id + '/chamar', { method: 'POST', headers: cabecalho });
      const d = await r.json();
      setAvisos((a) => ({ ...a, [caso.id]: d.mensagem || d.erro }));
      if (r.ok) carregar();
    } catch {
      setAvisos((a) => ({ ...a, [caso.id]: 'Não consegui falar com o servidor.' }));
    }
  }

  async function encerrar(caso) {
    if (!window.confirm('Encerrar o pedido de ' + caso.apelido + '? Ele some da lista pública.')) return;
    try {
      const r = await fetch(URL_BACKEND + '/apadrinhamento/' + caso.id + '/encerrar', { method: 'POST', headers: cabecalho });
      if (r.ok) carregar();
    } catch { /* silencioso */ }
  }

  return (
    <div className="painel-caixa">
      <h2>💝 Apadrinhamento de pacientes</h2>
      <p className="estoque-ajuda">
        Para quem precisa de transfusões regulares: doadores compatíveis viram padrinhos e você os chama quando chegar a hora.
      </p>

      <form className="painel-form apad-form" onSubmit={publicar}>
        <input className="hemare-input" placeholder='Apelido (ex.: "Paciente Aurora") — nunca o nome verdadeiro'
          maxLength={30} value={apelido} onChange={(e) => setApelido(e.target.value)} />
        <select className="hemare-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Tipo sanguíneo do paciente...</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="hemare-input" value={condicao} onChange={(e) => setCondicao(e.target.value)}>
          {CONDICOES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="apad-freq">
          Precisa de sangue a cada
          <input className="hemare-input" type="number" min="14" max="120" value={frequencia}
            onChange={(e) => setFrequencia(e.target.value)} /> dias
        </label>
        <label className="apad-autoriza">
          <input type="checkbox" checked={autorizacao} onChange={(e) => setAutorizacao(e.target.checked)} />
          Tenho autorização do paciente ou do responsável para divulgar este pedido.
        </label>
        <button className="hemare-botao" type="submit">Publicar paciente</button>
      </form>
      {mensagem && <div className="painel-msg">{mensagem}</div>}

      {casos.length === 0 ? (
        <p className="painel-vazio">Nenhum paciente cadastrado ainda.</p>
      ) : (
        <ul className="apad-lista">
          {casos.map((c) => (
            <li key={c.id} className="apad-caso">
              <div className="apad-topo">
                <span className="apad-tipo">{c.tipoSanguineo}</span>
                <div>
                  <strong>{c.apelido}</strong>
                  <span className="apad-local">{c.condicao} · a cada {c.frequenciaDias} dias</span>
                </div>
              </div>
              <p className="apad-meta">{c.padrinhos} de {c.meta} padrinhos ({c.porcentagem}%)</p>
              <div className="apad-acoes">
                <button type="button" className="conq-btn" disabled={!c.chamada.pode || c.padrinhos === 0} onClick={() => chamar(c)}>
                  💌 Chamar padrinhos aptos
                </button>
                <button type="button" className="conq-btn conq-btn-vazado" onClick={() => encerrar(c)}>Encerrar pedido</button>
              </div>
              {!c.chamada.pode && <p className="apad-meta">Novo chamado em {c.chamada.diasRestantes} {c.chamada.diasRestantes === 1 ? 'dia' : 'dias'}.</p>}
              {avisos[c.id] && <p className="conq-copia" role="status">{avisos[c.id]}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="alerta-dica">
        🔒 Você não vê quem são os padrinhos: o Hemare envia o email só para quem já pode doar, no máximo uma vez por semana por paciente.
      </p>
    </div>
  );
}

export default CasosApadrinhamento;
