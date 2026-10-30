// Hemare - Agenda de doacao, lado do hospital (painel do hospital):
// abrir horarios em lote, ajustar a capacidade, ver quem agendou o dia e marcar quem compareceu (a doacao entra na
// cadeia de confianca) ou faltou. O hospital ve so nome, tipo sanguineo e horario de quem agendou.
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';
import { formatarData, hojeNoBrasil, gerarHorarios, NOMES_STATUS } from '../regras/datas';

const DIAS_SEMANA = [['dom', 0], ['seg', 1], ['ter', 2], ['qua', 3], ['qui', 4], ['sex', 5], ['sáb', 6]];

function AgendaHospital() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  const hoje = hojeNoBrasil();

  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState(hoje);
  const [diasSemana, setDiasSemana] = useState([1, 2, 3, 4, 5]);
  const [primeiro, setPrimeiro] = useState('08:00');
  const [ultimo, setUltimo] = useState('16:00');
  const [intervalo, setIntervalo] = useState(30);
  const [capacidade, setCapacidade] = useState(2);
  const [avisoLote, setAvisoLote] = useState('');

  const [dia, setDia] = useState(hoje);
  const [vagas, setVagas] = useState([]);
  const [agendados, setAgendados] = useState([]);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | indisponivel
  const [avisos, setAvisos] = useState({});

  async function carregarDia(d) {
    try {
      const [rV, rA] = await Promise.all([
        fetch(URL_BACKEND + '/agenda/vagas?de=' + d + '&ate=' + d, { headers: cabecalho }),
        fetch(URL_BACKEND + '/agenda/agendamentos?data=' + d, { headers: cabecalho })
      ]);
      if (!rV.ok || !rA.ok) return setSituacao('indisponivel');
      setVagas(await rV.json());
      setAgendados((await rA.json()).agendamentos);
      setSituacao('ok');
    } catch {
      setSituacao('indisponivel');
    }
  }

  useEffect(() => { if (dia) carregarDia(dia); }, [dia]);

  function alternarDia(valor) {
    setDiasSemana((atual) => (atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]));
  }

  async function abrirHorarios(e) {
    e.preventDefault();
    const horarios = gerarHorarios(primeiro, ultimo, intervalo);
    if (horarios.length === 0) { setAvisoLote('❌ Confira o primeiro e o último horário e o intervalo.'); return; }
    setAvisoLote('Abrindo...');
    try {
      const r = await fetch(URL_BACKEND + '/agenda/vagas', {
        method: 'POST', headers: cabecalho, body: JSON.stringify({ de, ate, diasSemana, horarios, capacidade: Number(capacidade) })
      });
      const d = await r.json();
      setAvisoLote((r.ok ? '' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) carregarDia(dia);
    } catch {
      setAvisoLote('❌ Não consegui falar com o servidor.');
    }
  }

  async function chamar(chave, url, opcoes, depois) {
    try {
      const r = await fetch(URL_BACKEND + url, { headers: cabecalho, ...opcoes });
      const d = r.status === 204 ? {} : await r.json();
      setAvisos((a) => ({ ...a, [chave]: (r.ok ? '' : '❌ ') + (d.mensagem || d.erro || '') }));
      if (r.ok) { carregarDia(dia); if (depois) depois(d); }
    } catch {
      setAvisos((a) => ({ ...a, [chave]: '❌ Não consegui falar com o servidor.' }));
    }
  }

  const mudarCapacidade = (v, nova) => chamar('v' + v.id, '/agenda/vagas/' + v.id, { method: 'PATCH', body: JSON.stringify({ capacidade: nova }) });
  const apagarVaga = (v) => {
    if (!window.confirm('Apagar o horário das ' + v.hora + '?')) return;
    chamar('v' + v.id, '/agenda/vagas/' + v.id, { method: 'DELETE' });
  };
  const mudarStatus = (a, status) => {
    const textos = { compareceu: 'Confirmar que a pessoa compareceu? A doação entra na cadeia de confiança e não pode ser desfeita.', faltou: 'Registrar a falta?', cancelado: 'Cancelar este agendamento e liberar a vaga?' };
    if (!window.confirm(textos[status])) return;
    chamar('a' + a.id, '/agenda/agendamentos/' + a.id, { method: 'PATCH', body: JSON.stringify({ status }) });
  };

  if (situacao === 'indisponivel') return null;

  return (
    <div className="painel-caixa agd-hosp-painel">
      <h2>📅 Agenda de doações</h2>
      <p className="estoque-ajuda">
        Abra horários para os doadores agendarem. Você vê só nome, tipo sanguíneo e horário de quem marcou, e confirma a presença no dia
        (a doação entra na cadeia de confiança).
      </p>

      <h3>Abrir horários</h3>
      <form className="agd-form" onSubmit={abrirHorarios}>
        <div className="mp-linha">
          <label>De <input className="hemare-input" type="date" min={hoje} value={de} onChange={(e) => setDe(e.target.value)} required /></label>
          <label>Até <input className="hemare-input" type="date" min={de} value={ate} onChange={(e) => setAte(e.target.value)} required /></label>
        </div>
        <div className="agd-semana" role="group" aria-label="Dias da semana">
          {DIAS_SEMANA.map(([nome, valor]) => (
            <label key={valor} className={'agd-chip' + (diasSemana.includes(valor) ? ' agd-sel' : '')}>
              <input type="checkbox" checked={diasSemana.includes(valor)} onChange={() => alternarDia(valor)} /> {nome}
            </label>
          ))}
        </div>
        <div className="mp-linha">
          <label>Primeiro horário <input className="hemare-input" type="time" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} required /></label>
          <label>Último horário <input className="hemare-input" type="time" value={ultimo} onChange={(e) => setUltimo(e.target.value)} required /></label>
          <label>A cada (min) <input className="hemare-input" type="number" min="5" max="240" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} required /></label>
          <label>Pessoas por horário <input className="hemare-input" type="number" min="1" max="20" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} required /></label>
        </div>
        <p className="mp-dica">Serão {gerarHorarios(primeiro, ultimo, intervalo).length} horários por dia: {gerarHorarios(primeiro, ultimo, intervalo).slice(0, 6).join(', ')}{gerarHorarios(primeiro, ultimo, intervalo).length > 6 ? '...' : ''}</p>
        <button type="submit" className="conq-btn">📅 Abrir horários</button>
      </form>
      {avisoLote && <div className="painel-msg">{avisoLote}</div>}

      <h3>Agenda do dia</h3>
      <label className="agd-dia-input">Dia <input className="hemare-input" type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />
        <span> {dia && formatarData(dia)}{dia === hoje ? ' (hoje)' : ''}</span></label>

      {vagas.length === 0 ? <p className="painel-vazio">Nenhum horário aberto neste dia.</p> : (
        <ul className="agd-vagas">
          {vagas.map((v) => (
            <li key={v.id}>
              <strong>{v.hora}</strong>
              <span>{v.reservadas} de {v.capacidade} {v.capacidade === 1 ? 'vaga' : 'vagas'}</span>
              <span className="agd-acoes">
                <button type="button" className="btn-confirmar" aria-label="Diminuir capacidade" disabled={v.capacidade <= Math.max(1, v.reservadas)} onClick={() => mudarCapacidade(v, v.capacidade - 1)}>−</button>
                <button type="button" className="btn-confirmar" aria-label="Aumentar capacidade" disabled={v.capacidade >= 20} onClick={() => mudarCapacidade(v, v.capacidade + 1)}>+</button>
                <button type="button" className="btn-confirmar" aria-label="Apagar horário" disabled={v.reservadas > 0} onClick={() => apagarVaga(v)}>🗑</button>
              </span>
              {avisos['v' + v.id] && <small className="conq-copia" role="status">{avisos['v' + v.id]}</small>}
            </li>
          ))}
        </ul>
      )}

      <h3>Quem agendou</h3>
      {agendados.length === 0 ? <p className="painel-vazio">Ninguém agendou para este dia.</p> : (
        <ul className="agd-vagas">
          {agendados.map((a) => (
            <li key={a.id}>
              <strong>{a.hora}</strong>
              <span>{a.nome} · {a.tipoSanguineo}{a.telefone ? ' · 📞 ' + a.telefone : ''}</span>
              <span className={'agd-status agd-status-' + a.status}>{NOMES_STATUS[a.status]}</span>
              {a.status === 'agendado' && (
                <span className="agd-acoes">
                  {dia === hoje && <button type="button" className="btn-confirmar" onClick={() => mudarStatus(a, 'compareceu')}>✓ Compareceu</button>}
                  {dia <= hoje && <button type="button" className="btn-confirmar" onClick={() => mudarStatus(a, 'faltou')}>Faltou</button>}
                  <button type="button" className="btn-confirmar" onClick={() => mudarStatus(a, 'cancelado')}>Cancelar</button>
                </span>
              )}
              {avisos['a' + a.id] && <small className="conq-copia" role="status">{avisos['a' + a.id]}</small>}
            </li>
          ))}
        </ul>
      )}
      <p className="alerta-dica">🔒 Telefone só aparece de quem escolheu ser identificado. A confirmação de presença só vale no dia da doação.</p>
    </div>
  );
}

export default AgendaHospital;
