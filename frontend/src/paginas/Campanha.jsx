// Hemare - Pagina publica de uma campanha de reposicao ("Quem doa por mim").
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

const JANELA_DIAS = 30; // igual ao backend: ninguem promete data alem de 30 dias

// 'AAAA-MM-DD' de hoje (+n dias) no fuso do navegador.
function diaLocal(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatar(dia) {
  return dia.split('-').reverse().join('/');
}

function textoCompartilhar(c, link) {
  const quanto = c.faltam > 0
    ? 'Faltam ' + c.faltam + (c.faltam === 1 ? ' doação' : ' doações') + '. '
    : 'A meta já foi atingida, mas toda doação ajuda! ';
  return '🩸 Doe por ' + c.apelido + '. O ' + c.hospital + ' (' + c.cidade + ') pediu reposição de sangue. '
    + quanto + 'Prometa sua doação e acompanhe o progresso: ' + link;
}

const ROTULOS = {
  'aberta': '🟢 Aberta',
  'meta-atingida': '🎉 Meta atingida',
  'expirada': '⏳ Prazo encerrado',
  'encerrada': '✔️ Encerrada'
};

function Campanha() {
  const { codigo } = useParams();
  const [campanha, setCampanha] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | nao-achou | erro
  const [data, setData] = useState('');
  const [aviso, setAviso] = useState('');
  const [avisoCopia, setAvisoCopia] = useState('');

  const token = localStorage.getItem('hemare_token');
  let usuario = null;
  try { usuario = JSON.parse(localStorage.getItem('hemare_usuario') || 'null'); } catch { usuario = null; }
  const ehDoador = !!token && !!usuario && usuario.tipo === 'doador';

  function carregar() {
    fetch(URL_BACKEND + '/campanha/' + encodeURIComponent(codigo))
      .then(async (r) => {
        if (r.status === 404) return setSituacao('nao-achou');
        if (!r.ok) return setSituacao('erro');
        setCampanha(await r.json());
        setSituacao('ok');
      })
      .catch(() => setSituacao('erro'));
  }

  useEffect(carregar, [codigo]);

  async function prometer(e) {
    e.preventDefault();
    if (!data) { setAviso('❌ Escolha o dia em que você vai doar.'); return; }
    setAviso('Enviando...');
    try {
      const r = await fetch(URL_BACKEND + '/campanha/' + encodeURIComponent(codigo) + '/prometer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ data })
      });
      const d = await r.json();
      setAviso((r.ok ? '' : '❌ ') + (d.mensagem || d.erro));
      if (r.ok) carregar();
    } catch {
      setAviso('❌ Não consegui falar com o servidor.');
    }
  }

  async function compartilhar() {
    const link = window.location.href;
    const texto = textoCompartilhar(campanha, link);
    try {
      if (navigator.share) { await navigator.share({ title: 'Hemare', text: texto }); return; }
      await navigator.clipboard.writeText(texto);
      setAvisoCopia('Texto copiado! Cole onde quiser compartilhar.');
    } catch (erro) {
      if (erro && erro.name === 'AbortError') return;
      setAvisoCopia('Não foi possível copiar. Use o botão do WhatsApp.');
    }
  }

  if (situacao === 'carregando') return <p className="camp-vazio">Carregando a campanha...</p>;
  if (situacao === 'nao-achou') {
    return (
      <div className="camp">
        <h1>Campanha não encontrada</h1>
        <p className="camp-vazio">Confira se o link está completo. Você também pode <Link to="/locais" className="hemare-link">encontrar um hemocentro</Link> e doar.</p>
      </div>
    );
  }
  if (situacao === 'erro') return <p className="camp-vazio">Não foi possível abrir a campanha agora.</p>;

  const c = campanha;
  const limite = c.expiraEm < diaLocal(JANELA_DIAS) ? c.expiraEm : diaLocal(JANELA_DIAS);
  const link = window.location.href;

  return (
    <div className="camp">
      <p className="camp-selo">{ROTULOS[c.status]}</p>
      <h1>🩸 Doe por {c.apelido}</h1>
      <p className="camp-sub">
        O <strong>{c.hospital}</strong> ({c.cidade}{c.estado ? '/' + c.estado : ''}) pediu reposição de sangue para este paciente.
        Cada doação confirmada pelo hospital conta na meta abaixo.
      </p>

      <div className="camp-progresso">
        <div className="conq-barra-fundo" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.porcentagem}
             aria-label={'Doações confirmadas para ' + c.apelido}>
          <div className="conq-barra" style={{ width: c.porcentagem + '%' }}></div>
        </div>
        <div className="camp-numeros">
          <div><strong>{c.confirmadas}</strong><span>de {c.metaBolsas} doações confirmadas</span></div>
          <div><strong>{c.prometidas}</strong><span>{c.prometidas === 1 ? 'pessoa já prometeu' : 'pessoas já prometeram'}</span></div>
          <div><strong>{c.diasRestantes}</strong><span>{c.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}</span></div>
        </div>
      </div>

      {c.aceitaPromessas ? (
        <div className="camp-acao">
          <h2>Quero doar por {c.apelido}</h2>
          {ehDoador ? (
            <form onSubmit={prometer} className="camp-form">
              <label>
                Em que dia você vai doar?
                <input className="hemare-input" type="date" min={diaLocal(0)} max={limite} value={data}
                  onChange={(e) => setData(e.target.value)} />
              </label>
              <button type="submit" className="conq-btn">🤝 Prometer doar</button>
            </form>
          ) : token ? (
            <p className="camp-vazio">Só contas de doador podem prometer doação. Você pode compartilhar esta campanha abaixo.</p>
          ) : (
            <p>
              <Link to="/login" className="hemare-link">Entre</Link> ou <Link to="/cadastro" className="hemare-link">crie sua conta</Link> de
              doador (é rápido) para prometer sua doação. Depois, volte a este link.
            </p>
          )}
          {aviso && <p className="conq-copia" role="status">{aviso}</p>}
          <p className="camp-privacidade">
            🔒 O hospital vê seu nome e telefone só para confirmar a sua doação. Ninguém mais vê. Antes de doar, faça a
            <Link to="/triagem" className="hemare-link"> triagem</Link>.
          </p>
        </div>
      ) : (
        <p className="camp-vazio">Esta campanha não está mais recebendo promessas. Você ainda pode <Link to="/locais" className="hemare-link">doar em um hemocentro</Link>: todo sangue salva vidas.</p>
      )}

      <div className="conq-compartilhar">
        <p>Compartilhe com quem pode ajudar:</p>
        <div className="conq-botoes">
          <button type="button" className="conq-btn" onClick={compartilhar}>📤 Compartilhar</button>
          <a className="conq-btn conq-btn-whats" target="_blank" rel="noopener noreferrer"
             href={'https://wa.me/?text=' + encodeURIComponent(textoCompartilhar(c, link))}>💬 WhatsApp</a>
        </div>
        {avisoCopia && <p className="conq-copia" role="status">{avisoCopia}</p>}
      </div>

      <p className="conteudo-aviso">
        Para proteger o paciente, aqui aparece só um apelido. Prazo até {formatar(c.expiraEm)}.
      </p>
    </div>
  );
}

export default Campanha;
