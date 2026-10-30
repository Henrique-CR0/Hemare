// Hemare - Agendar doacao (doador): escolhe o hospital, o dia e o horario; reagenda ou cancela o proprio agendamento.
// So aparecem hospitais aprovados com horario livre. Os dias antes de a pessoa ficar apta aparecem desativados.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';
import { formatarData, hojeNoBrasil } from '../regras/datas';

function Agendar() {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [carregando, setCarregando] = useState(true);
  const [ativo, setAtivo] = useState(null);          // agendamento marcado (ou null)
  const [hospitais, setHospitais] = useState([]);
  const [aptoEm, setAptoEm] = useState(null);
  const [reagendando, setReagendando] = useState(false);
  const [hospitalId, setHospitalId] = useState(null);
  const [agenda, setAgenda] = useState(null);        // { hospital, dias }
  const [dia, setDia] = useState(null);
  const [vagaId, setVagaId] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    try {
      const [rAg, rHosp, rHist] = await Promise.all([
        fetch(URL_BACKEND + '/agendamentos?status=agendado', { headers: cabecalho }),
        fetch(URL_BACKEND + '/agenda/hospitais', { headers: cabecalho }),
        fetch(URL_BACKEND + '/historico', { headers: cabecalho })
      ]);
      const ags = rAg.ok ? await rAg.json() : [];
      const futuros = Array.isArray(ags) ? ags.filter((a) => new Date(a.data + 'T' + a.hora + ':00-03:00').getTime() > Date.now()) : [];
      setAtivo(futuros[0] || null);
      setHospitais(rHosp.ok ? await rHosp.json() : []);
      if (rHist.ok) setAptoEm((await rHist.json()).resumo.aptoEm);
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  async function escolherHospital(id) {
    setHospitalId(id); setAgenda(null); setDia(null); setVagaId(null); setMensagem('');
    try {
      const r = await fetch(URL_BACKEND + '/agenda/hospitais/' + id + '/vagas', { headers: cabecalho });
      if (r.ok) setAgenda(await r.json()); else setMensagem('❌ ' + (await r.json()).erro);
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  async function confirmar() {
    setEnviando(true); setMensagem('Enviando...');
    try {
      const r = await fetch(URL_BACKEND + (reagendando ? '/agendamentos/' + ativo.id : '/agendamentos'), {
        method: reagendando ? 'PATCH' : 'POST', headers: cabecalho, body: JSON.stringify({ vagaId })
      });
      const d = await r.json();
      if (r.ok) {
        setMensagem(d.mensagem);
        setReagendando(false); setHospitalId(null); setAgenda(null); setDia(null); setVagaId(null);
        await carregar();
      } else {
        setMensagem('❌ ' + d.erro);
        if (hospitalId) escolherHospital(hospitalId); // a vaga pode ter lotado: atualiza a lista
      }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
    setEnviando(false);
  }

  async function cancelar() {
    if (!window.confirm('Cancelar o seu agendamento? A vaga fica livre para outra pessoa.')) return;
    try {
      const r = await fetch(URL_BACKEND + '/agendamentos/' + ativo.id, { method: 'DELETE', headers: cabecalho });
      if (r.status === 204) { setMensagem('Agendamento cancelado.'); await carregar(); } else { setMensagem('❌ ' + (await r.json()).erro); }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  const mostrarEscolha = !ativo || reagendando;
  const horarios = agenda && dia ? (agenda.dias.find((d) => d.data === dia) || { horarios: [] }).horarios : [];
  const escolhida = horarios.find((h) => h.vagaId === vagaId);

  return (
    <div className="conteudo-pagina agd">
      <h1>📅 Agendar doação</h1>
      <p className="conteudo-intro">
        Escolha um hemocentro ou hospital, o dia e o horário. Você recebe a confirmação por e-mail e um lembrete antes do horário.
        Só dá para marcar um horário em que você já estará apto a doar.
      </p>

      {carregando && <p className="painel-vazio">Carregando...</p>}

      {!carregando && ativo && (
        <div className="agd-ativo">
          <h2>Seu agendamento</h2>
          <p className="agd-quando"><strong>{formatarData(ativo.data)} às {ativo.hora}</strong></p>
          <p>{ativo.hospital.nome} · {ativo.hospital.cidade}/{ativo.hospital.estado}{ativo.hospital.endereco ? ' · ' + ativo.hospital.endereco : ''}</p>
          <p className="mp-dica">Leve um documento oficial com foto, esteja bem alimentado e hidratado e tenha dormido bem.</p>
          {!reagendando && (
            <div className="rr-botoes">
              <button type="button" className="conq-btn" onClick={() => { setReagendando(true); setMensagem(''); }}>Reagendar</button>
              <button type="button" className="conq-btn conq-btn-vazado" onClick={cancelar}>Cancelar agendamento</button>
            </div>
          )}
          {reagendando && <p className="mp-dica">Escolha o novo horário abaixo. Seu horário atual só é liberado quando você confirmar o novo.</p>}
        </div>
      )}

      {!carregando && mostrarEscolha && (
        <>
          {aptoEm && aptoEm > hojeNoBrasil() && (
            <p className="agd-aviso">Você fica apto em <strong>{formatarData(aptoEm)}</strong>. Os dias antes disso aparecem desativados.</p>
          )}
          <h2>1. Escolha o local</h2>
          {hospitais.length === 0 ? (
            <p className="painel-vazio">Nenhum hospital abriu horários ainda. Veja <Link to="/locais">onde doar</Link> e ligue para combinar.</p>
          ) : (
            <div className="agd-lista">
              {hospitais.map((h) => (
                <button key={h.id} type="button" className={'agd-hosp' + (hospitalId === h.id ? ' agd-sel' : '')} onClick={() => escolherHospital(h.id)}>
                  <strong>{h.nome}</strong>
                  <span>{h.cidade}/{h.estado} · {h.vagasLivres} {h.vagasLivres === 1 ? 'vaga' : 'vagas'}</span>
                </button>
              ))}
            </div>
          )}

          {agenda && (
            <>
              <h2>2. Escolha o dia</h2>
              <div className="agd-dias">
                {agenda.dias.map((d) => {
                  const bloqueado = !!aptoEm && d.data < aptoEm;
                  return (
                    <button key={d.data} type="button" disabled={bloqueado} title={bloqueado ? 'Você ainda não estará apto neste dia' : ''}
                            className={'agd-dia' + (dia === d.data ? ' agd-sel' : '')} onClick={() => { setDia(d.data); setVagaId(null); }}>
                      {formatarData(d.data)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {dia && (
            <>
              <h2>3. Escolha o horário</h2>
              <div className="agd-dias">
                {horarios.map((h) => (
                  <button key={h.vagaId} type="button" className={'agd-dia' + (vagaId === h.vagaId ? ' agd-sel' : '')} onClick={() => setVagaId(h.vagaId)}>
                    {h.hora} <small>({h.livres} {h.livres === 1 ? 'vaga' : 'vagas'})</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {escolhida && (
            <div className="agd-confirmar">
              <p>Confirmar <strong>{formatarData(dia)} às {escolhida.hora}</strong> em <strong>{agenda.hospital.nome}</strong>?</p>
              <div className="rr-botoes">
                <button type="button" className="conq-btn" disabled={enviando} onClick={confirmar}>{reagendando ? 'Confirmar novo horário' : 'Confirmar agendamento'}</button>
                {reagendando && <button type="button" className="conq-btn conq-btn-vazado" onClick={() => setReagendando(false)}>Manter o horário atual</button>}
              </div>
            </div>
          )}
        </>
      )}

      {mensagem && <div className="auth-msg" role="status">{mensagem}</div>}
      <p className="agd-nota">Veja também o seu <Link to="/minhas-doacoes">histórico de doações</Link>. A decisão final de aptidão é sempre da equipe de triagem.</p>
    </div>
  );
}

export default Agendar;
