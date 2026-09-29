// Hemare - Painel do administrador: verificacao de hospitais (aprovar / recusar com motivo).
import { useState, useEffect, useCallback } from 'react';
import { URL_BACKEND } from '../config';

const FILTROS = [
  { valor: 'pendente', rotulo: '⏳ Pendentes' },
  { valor: 'aprovado', rotulo: '✓ Aprovados' },
  { valor: 'recusado', rotulo: '✕ Recusados' },
  { valor: 'todos', rotulo: 'Todos' }
];
const SELO = {
  pendente: { classe: 'selo-pendente', texto: '⏳ Pendente' },
  aprovado: { classe: 'selo-verificado', texto: '✓ Aprovado' },
  recusado: { classe: 'selo-recusado', texto: '✕ Recusado' }
};

function formatarData(texto) {
  return texto ? new Date(texto).toLocaleDateString('pt-BR') : '—';
}

function CartaoHospital({ h, aoDecidir }) {
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function decidir(acao) {
    setEnviando(true);
    setErro('');
    const ok = await aoDecidir(h, acao, motivo);
    setEnviando(false);
    if (ok === true) { setRecusando(false); setMotivo(''); } else { setErro(ok); }
  }

  const selo = SELO[h.statusVerificacao];
  const endereco = [h.endereco, h.numero, h.complemento, h.bairro].filter(Boolean).join(', ');

  return (
    <li className="adm-card">
      <div className="adm-card-topo">
        <div>
          <h3>{h.nome}</h3>
          <p className="adm-email">{h.email} · cadastrado em {formatarData(h.criado_em)}</p>
        </div>
        <span className={selo.classe}>{selo.texto}</span>
      </div>

      <dl className="adm-dados">
        <div><dt>CNPJ</dt><dd>{h.cnpj || '—'}</dd></div>
        <div>
          <dt>CNES</dt>
          <dd>
            {h.cnes || '—'}
            {h.cnes && (
              <a className="adm-consulta" target="_blank" rel="noopener noreferrer"
                 href={'https://cnes.datasus.gov.br/pages/estabelecimentos/consulta.jsp?search=' + encodeURIComponent(h.cnes)}>
                Consultar no CNES ↗
              </a>
            )}
          </dd>
        </div>
        <div><dt>Endereço</dt><dd>{endereco || '—'}</dd></div>
        <div><dt>Cidade</dt><dd>{h.cidade}{h.estado ? ' / ' + h.estado : ''}{h.cep ? ' · CEP ' + h.cep : ''}</dd></div>
      </dl>

      {h.motivo_recusa && <p className="adm-motivo"><strong>Motivo da recusa:</strong> {h.motivo_recusa}</p>}

      {recusando ? (
        <div className="adm-recusa">
          <label htmlFor={'motivo-' + h.id}>Motivo (o hospital vai receber este texto por email):</label>
          <textarea id={'motivo-' + h.id} className="hemare-input" rows={3} maxLength={500} value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: o CNES informado não foi encontrado no DATASUS." />
          <div className="adm-acoes">
            <button className="adm-btn adm-btn-recusar" disabled={enviando} onClick={() => decidir('recusar')}>
              Confirmar recusa
            </button>
            <button className="adm-btn adm-btn-neutro" disabled={enviando} onClick={() => setRecusando(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="adm-acoes">
          {h.statusVerificacao !== 'aprovado' && (
            <button className="adm-btn adm-btn-aprovar" disabled={enviando} onClick={() => decidir('aprovar')}>✓ Aprovar</button>
          )}
          {h.statusVerificacao !== 'recusado' && (
            <button className="adm-btn adm-btn-neutro" disabled={enviando} onClick={() => setRecusando(true)}>
              {h.statusVerificacao === 'aprovado' ? 'Revogar aprovação' : '✕ Recusar'}
            </button>
          )}
        </div>
      )}
      {erro && <p className="adm-erro" role="alert">{erro}</p>}
    </li>
  );
}

function PainelAdmin() {
  const [filtro, setFiltro] = useState('pendente');
  const [hospitais, setHospitais] = useState([]);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro | proibido
  const [aviso, setAviso] = useState('');

  const token = localStorage.getItem('hemare_token');

  const carregar = useCallback((qual) => {
    setSituacao('carregando');
    fetch(URL_BACKEND + '/admin/hospitais?status=' + qual, { headers: { 'Authorization': 'Bearer ' + token } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) return setSituacao('proibido');
        if (!r.ok) return setSituacao('erro');
        setHospitais(await r.json());
        setSituacao('ok');
      })
      .catch(() => setSituacao('erro'));
  }, [token]);

  useEffect(() => { carregar(filtro); }, [filtro, carregar]);

  // Devolve true se deu certo, ou o texto do erro.
  async function decidir(h, acao, motivo) {
    try {
      const r = await fetch(URL_BACKEND + '/admin/hospitais/' + h.id + '/' + acao, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(acao === 'recusar' ? { motivo } : {})
      });
      const d = await r.json();
      if (!r.ok) return d.erro || 'Não foi possível salvar.';
      setAviso('✅ ' + d.mensagem + ' O hospital foi avisado por email.');
      carregar(filtro);
      return true;
    } catch {
      return 'Não consegui falar com o servidor.';
    }
  }

  if (situacao === 'proibido') {
    return (
      <div className="painel">
        <h1>🛡️ Área do administrador</h1>
        <p className="painel-vazio">Acesso restrito a administradores. Se você acabou de virar admin, saia e entre de novo.</p>
      </div>
    );
  }

  return (
    <div className="painel">
      <h1>🛡️ Verificação de hospitais</h1>
      <p className="painel-sub">
        Confira o CNPJ e o CNES de cada hospital antes de aprovar. Só hospitais aprovados veem contatos de doadores,
        confirmam doações e aparecem no termômetro público.
      </p>

      <div className="adm-filtros" role="tablist" aria-label="Filtrar hospitais">
        {FILTROS.map((f) => (
          <button key={f.valor} role="tab" aria-selected={filtro === f.valor}
                  className={'adm-filtro' + (filtro === f.valor ? ' adm-filtro-ativo' : '')}
                  onClick={() => { setAviso(''); setFiltro(f.valor); }}>
            {f.rotulo}
          </button>
        ))}
      </div>

      {aviso && <p className="adm-aviso" role="status">{aviso}</p>}

      {situacao === 'carregando' && <p className="painel-vazio">Carregando...</p>}
      {situacao === 'erro' && <p className="painel-vazio">Não foi possível carregar a lista agora.</p>}
      {situacao === 'ok' && hospitais.length === 0 && (
        <p className="painel-vazio">{filtro === 'pendente' ? 'Nenhum hospital aguardando verificação. 🎉' : 'Nenhum hospital aqui.'}</p>
      )}
      {situacao === 'ok' && hospitais.length > 0 && (
        <ul className="adm-lista">
          {hospitais.map((h) => <CartaoHospital key={h.id} h={h} aoDecidir={decidir} />)}
        </ul>
      )}
    </div>
  );
}

export default PainelAdmin;
