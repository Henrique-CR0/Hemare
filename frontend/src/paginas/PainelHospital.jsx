// Hemare - Painel do hospital: estoque, necessidades, match, confirmacao de doacao, radar e status.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { URL_BACKEND } from '../config';
import CasosApadrinhamento from '../componentes/CasosApadrinhamento';
import CampanhasHospital from '../componentes/CampanhasHospital';
import RedeRaraHospital from '../componentes/RedeRaraHospital';
import FeriadosHospital from '../componentes/FeriadosHospital';
const TIPOS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const NIVEIS = [
  { valor: 'estavel', rotulo: '🟢 Estável' },
  { valor: 'alerta', rotulo: '🟡 Alerta' },
  { valor: 'critico', rotulo: '🔴 Crítico' },
  { valor: 'emergencia', rotulo: '⚫ Emergência' }
];

function PainelHospital() {
  const [necessidades, setNecessidades] = useState([]);
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [urgencia, setUrgencia] = useState('alerta');
  const [mensagem, setMensagem] = useState('');
  const [match, setMatch] = useState(null);
  const [dadosHospital, setDadosHospital] = useState(null);
  const [estoque, setEstoque] = useState({});
  const [confirmados, setConfirmados] = useState([]);

  const token = localStorage.getItem('hemare_token');

  function carregarNecessidades() {
    fetch(URL_BACKEND + '/hospital/necessidades', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((r) => r.json())
      .then((dados) => setNecessidades(Array.isArray(dados) ? dados : []))
      .catch(() => {});
  }

  function carregarEstoque() {
    fetch(URL_BACKEND + '/hospital/estoque', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((r) => r.json())
      .then((lista) => {
        const mapa = {};
        (Array.isArray(lista) ? lista : []).forEach((e) => { mapa[e.tipo_sanguineo] = e.nivel; });
        setEstoque(mapa);
      })
      .catch(() => {});
  }

  useEffect(() => {
    carregarNecessidades();
    carregarEstoque();
    fetch(URL_BACKEND + '/hospital/meus-dados', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((r) => r.json())
      .then((d) => setDadosHospital(d))
      .catch(() => {});
  }, []);

  async function definirEstoque(tipo, nivel) {
    setEstoque((atual) => ({ ...atual, [tipo]: nivel }));
    try {
      await fetch(URL_BACKEND + '/hospital/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ tipoSanguineo: tipo, nivel })
      });
    } catch (e) { /* silencioso */ }
  }

  async function publicar() {
    if (!tipoSanguineo) { setMensagem('❌ Escolha o tipo sanguíneo.'); return; }
    setMensagem('Publicando...');
    try {
      const r = await fetch(URL_BACKEND + '/hospital/necessidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ tipoSanguineo, urgencia })
      });
      const d = await r.json();
      if (r.ok) {
        setMensagem('✅ ' + d.mensagem);
        setTipoSanguineo('');
        carregarNecessidades();
      } else {
        setMensagem('❌ ' + d.erro);
      }
    } catch (e) {
      setMensagem('❌ Erro ao publicar.');
    }
  }

  async function verMatch(necessidade) {
    setMatch({ carregando: true, necessidade });
    try {
      const r = await fetch(URL_BACKEND + '/hospital/match/' + necessidade.id, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      setMatch({ carregando: false, necessidade, ...d });
    } catch (e) {
      setMatch(null);
    }
  }

  async function confirmarDoacao(doadorId) {
    try {
      const r = await fetch(URL_BACKEND + '/hospital/confirmar-doacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ doadorId })
      });
      const d = await r.json();
      if (r.ok) {
        setConfirmados((atual) => [...atual, doadorId]);
      }
      alert(r.ok ? d.mensagem : ('Erro: ' + d.erro));
    } catch (e) {
      alert('Erro ao confirmar doação.');
    }
  }

  // Enquanto nao for aprovado, as acoes sobre doadores ficam escondidas (o backend tambem bloqueia).
  const status = dadosHospital ? dadosHospital.statusVerificacao : null;
  const liberado = !dadosHospital || status === 'aprovado';

  function rotuloUrgencia(u) {
    const mapa = { estavel: '🟢 Estável', alerta: '🟡 Alerta', critico: '🔴 Crítico', emergencia: '⚫ Emergência' };
    return mapa[u] || u;
  }

  return (
    <div className="painel">
      <div className="painel-cabecalho">
        <h1>🏥 Painel do Hospital</h1>
        {dadosHospital && (
          <div className="painel-status">
            <strong>{dadosHospital.nome}</strong>
            {status === 'aprovado' && <span className="selo-verificado">✓ Verificado</span>}
            {status === 'pendente' && <span className="selo-pendente">⏳ Verificação pendente</span>}
            {status === 'recusado' && <span className="selo-recusado">✕ Cadastro recusado</span>}
          </div>
        )}
      </div>
      <p className="painel-sub">Gerencie seu estoque, publique necessidades e encontre doadores.</p>

      <Link to="/radar" className="link-radar">🔮 Ver radar preditivo de aptidão →</Link>

      {dadosHospital && !liberado && (
        <div className={'verif-aviso' + (status === 'recusado' ? ' verif-recusado' : '')} role="status">
          {status === 'recusado' ? (
            <>
              <h2>✕ O cadastro do hospital não foi aprovado</h2>
              <p><strong>Motivo:</strong> {dadosHospital.motivo_recusa}</p>
              <p>Quando os dados forem corrigidos, o cadastro volta para a fila de verificação.</p>
            </>
          ) : (
            <>
              <h2>⏳ Seu hospital está em verificação</h2>
              <p>
                Um administrador do Hemare vai conferir o CNPJ e o CNES informados. Você recebe um email assim que
                o cadastro for aprovado.
              </p>
            </>
          )}
          <p className="verif-bloqueios">
            Até lá, por segurança dos doadores, ficam bloqueados: publicar necessidades e alertas, atualizar o
            estoque público, ver doadores compatíveis e confirmar doações.
          </p>
        </div>
      )}

      {liberado && (<>

      {/* TERMOMETRO DE ESTOQUE */}
      <div className="painel-caixa">
        <h2>🌡️ Termômetro de estoque</h2>
        <p className="estoque-ajuda">Toque no nível de cada tipo sanguíneo para atualizar seu estoque.</p>
        <div className="estoque-grade">
          {TIPOS.map((tipo) => (
            <div key={tipo} className="estoque-linha">
              <span className={'estoque-tipo nivel-borda-' + (estoque[tipo] || 'estavel')}>{tipo}</span>
              <div className="estoque-botoes">
                {NIVEIS.map((n) => (
                  <button
                    key={n.valor}
                    className={'estoque-btn' + (estoque[tipo] === n.valor ? ' est-ativo est-' + n.valor : '')}
                    onClick={() => definirEstoque(tipo, n.valor)}>
                    {n.rotulo}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publicar necessidade */}
      <div className="painel-caixa">
        <h2>Publicar necessidade</h2>
        <div className="painel-form">
          <select className="hemare-input" value={tipoSanguineo} onChange={(e) => setTipoSanguineo(e.target.value)}>
            <option value="">Tipo sanguíneo necessário...</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="hemare-input" value={urgencia} onChange={(e) => setUrgencia(e.target.value)}>
            <option value="estavel">🟢 Estável — reposição de rotina</option>
            <option value="alerta">🟡 Alerta — estoque baixo</option>
            <option value="critico">🔴 Crítico — poucos dias de estoque</option>
            <option value="emergencia">⚫ Emergência — situação extrema</option>
          </select>
          <button className="hemare-botao" onClick={publicar}>Publicar</button>
        </div>
        {(urgencia === 'critico' || urgencia === 'emergencia') && (
          <p className="alerta-dica">
            🚨 Ao publicar, um alerta por email vai para os doadores <strong>compatíveis</strong>, que aceitaram ser
            contatados, estão <strong>aptos a doar hoje</strong> e moram em <strong>{dadosHospital?.cidade || 'sua cidade'}</strong>.
            Cada doador recebe no máximo um alerta a cada 3 dias.
          </p>
        )}
        {mensagem && <div className="painel-msg">{mensagem}</div>}
      </div>

      {/* Lista de necessidades */}
      <div className="painel-caixa">
        <h2>Minhas necessidades</h2>
        {necessidades.length === 0 ? (
          <p className="painel-vazio">Nenhuma necessidade publicada ainda.</p>
        ) : (
          <div className="nec-lista">
            {necessidades.map((n) => (
              <div key={n.id} className="nec-item">
                <div>
                  <span className="nec-tipo">{n.tipo_sanguineo}</span>
                  <span className={'selo-urg selo-' + n.urgencia}>{rotuloUrgencia(n.urgencia)}</span>
                </div>
                <button className="nec-botao" onClick={() => verMatch(n)}>Ver doadores compatíveis</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resultado do match */}
      {match && (
        <div className="painel-caixa">
          <h2>Doadores compatíveis com {match.necessidade.tipo_sanguineo}</h2>
          {match.carregando ? (
            <p className="painel-vazio">Buscando...</p>
          ) : (
            <>
              <p className="match-info">
                Tipos que podem doar para {match.tipoReceptor}: <strong>{match.tiposCompativeis.join(', ')}</strong>
              </p>
              {match.doadores.length === 0 ? (
                <p className="painel-vazio">Nenhum doador compatível cadastrado ainda.</p>
              ) : (
                <div className="match-lista">
                  {match.doadores.map((d, i) => (
                    <div key={i} className={'match-card' + (d.identificado ? '' : ' match-anonimo')}>
                      <span className="match-tipo">{d.tipo_sanguineo}</span>
                      <div className="match-info-doador">
                        <strong>{d.nome}</strong>
                        <p>{d.cidade}</p>
                        {d.identificado
                          ? <p className="match-contato">📞 {d.telefone}</p>
                          : <span className="match-selo-anon">🔒 Contato protegido</span>}
                      </div>
                      {d.identificado && d.doador_id && (
                        confirmados.includes(d.doador_id)
                          ? <button className="btn-confirmado" disabled>✓ Confirmado</button>
                          : <button className="btn-confirmar" onClick={() => confirmarDoacao(d.doador_id)}>
                              ✓ Confirmar doação
                            </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <CampanhasHospital />
      <FeriadosHospital />
      <RedeRaraHospital />
      <CasosApadrinhamento />
      </>)}
    </div>
  );
}

export default PainelHospital;