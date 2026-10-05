// Hemare - Painel do hospital: campanhas de reposicao (abrir, ver quem prometeu, confirmar doacoes, encerrar).
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

function formatar(dia) {
  return dia.split('-').reverse().join('/');
}

function CampanhasHospital() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [campanhas, setCampanhas] = useState([]);
  const [apelido, setApelido] = useState('');
  const [meta, setMeta] = useState('3');
  const [prazo, setPrazo] = useState('15');
  const [autorizacao, setAutorizacao] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [avisos, setAvisos] = useState({});

  function carregar(ativo = () => true) {
    fetch(URL_BACKEND + '/campanha/minhas', { headers: cabecalho })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => ativo() && setCampanhas(Array.isArray(lista) ? lista : []))
      .catch(() => {});
  }

  useEffect(() => {
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, []);

  async function abrir(e) {
    e.preventDefault();
    setMensagem('Criando...');
    try {
      const r = await fetch(URL_BACKEND + '/campanha', {
        method: 'POST', headers: cabecalho,
        body: JSON.stringify({ apelido, metaBolsas: Number(meta), prazoDias: Number(prazo), autorizacao })
      });
      const d = await r.json();
      setMensagem((r.ok ? '✅ ' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) { setApelido(''); setAutorizacao(false); carregar(); }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  async function copiarLink(c) {
    const link = window.location.origin + '/campanha/' + c.codigo;
    try {
      await navigator.clipboard.writeText(link);
      setAvisos((a) => ({ ...a, [c.codigo]: 'Link copiado! ' + link }));
    } catch {
      setAvisos((a) => ({ ...a, [c.codigo]: 'Link da campanha: ' + link }));
    }
  }

  async function confirmar(c, promessa) {
    try {
      const r = await fetch(URL_BACKEND + '/campanha/' + c.codigo + '/confirmar', {
        method: 'POST', headers: cabecalho, body: JSON.stringify({ doadorId: promessa.doadorId })
      });
      const d = await r.json();
      setAvisos((a) => ({ ...a, [c.codigo]: d.mensagem || d.erro }));
      if (r.ok) carregar();
    } catch {
      setAvisos((a) => ({ ...a, [c.codigo]: 'Não consegui falar com o servidor.' }));
    }
  }

  async function encerrar(c) {
    if (!window.confirm('Encerrar a campanha de ' + c.apelido + '?')) return;
    try {
      const r = await fetch(URL_BACKEND + '/campanha/' + c.codigo + '/encerrar', { method: 'POST', headers: cabecalho });
      if (r.ok) carregar();
    } catch { /* silencioso */ }
  }

  return (
    <div className="painel-caixa">
      <h2>🩸 Campanhas de reposição</h2>
      <p className="estoque-ajuda">
        Para pacientes internados: você abre a campanha, a família compartilha o link e cada amigo promete uma data.
        Só vira "doada" quando você confirma aqui.
      </p>

      <form className="painel-form apad-form" onSubmit={abrir}>
        <input className="hemare-input" placeholder='Apelido do paciente (ex.: "Seu Antônio") — nunca o nome verdadeiro'
          maxLength={30} value={apelido} onChange={(e) => setApelido(e.target.value)} />
        <label className="apad-freq">
          Bolsas pedidas
          <input className="hemare-input" type="number" min="1" max="30" value={meta} onChange={(e) => setMeta(e.target.value)} />
          Prazo (dias)
          <input className="hemare-input" type="number" min="1" max="60" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
        <label className="apad-autoriza">
          <input type="checkbox" checked={autorizacao} onChange={(e) => setAutorizacao(e.target.checked)} />
          Tenho autorização do paciente ou da família para divulgar este pedido.
        </label>
        <button className="hemare-botao" type="submit">Abrir campanha</button>
      </form>
      {mensagem && <div className="painel-msg">{mensagem}</div>}

      {campanhas.length === 0 ? (
        <p className="painel-vazio">Nenhuma campanha ativa.</p>
      ) : (
        <ul className="apad-lista">
          {campanhas.map((c) => (
            <li key={c.codigo} className="apad-caso">
              <strong>{c.apelido}</strong>
              <div className="conq-barra-fundo" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.porcentagem}
                   aria-label={'Progresso da campanha de ' + c.apelido}>
                <div className="conq-barra" style={{ width: c.porcentagem + '%' }}></div>
              </div>
              <p className="apad-meta">
                {c.confirmadas} de {c.metaBolsas} confirmadas · {c.prometidas} prometidas · {c.diasRestantes} dias restantes
                {c.status === 'expirada' ? ' (prazo encerrado)' : ''}
              </p>

              {c.promessas.length > 0 && (
                <ul className="camp-promessas">
                  {c.promessas.map((p) => (
                    <li key={p.doadorId}>
                      <span><strong>{p.nome}</strong> · {formatar(p.dataPrevista)}{p.telefone ? ' · 📞 ' + p.telefone : ''}</span>
                      {p.confirmada
                        ? <span className="btn-confirmado">✓ Confirmada</span>
                        : <button type="button" className="btn-confirmar" onClick={() => confirmar(c, p)}>✓ Confirmar doação</button>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="apad-acoes">
                <button type="button" className="conq-btn" onClick={() => copiarLink(c)}>🔗 Copiar link</button>
                <button type="button" className="conq-btn conq-btn-vazado" onClick={() => encerrar(c)}>Encerrar</button>
              </div>
              {avisos[c.codigo] && <p className="conq-copia" role="status">{avisos[c.codigo]}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="alerta-dica">
        🔒 O nome e o telefone de quem promete só aparecem para o hospital da campanha, e só para quem prometeu ali.
      </p>
    </div>
  );
}

export default CampanhasHospital;
