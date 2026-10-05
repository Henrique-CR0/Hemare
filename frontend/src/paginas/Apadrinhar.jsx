// Hemare - Apadrinhamento: pacientes que precisam de sangue com regularidade e procuram padrinhos.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

function Apadrinhar() {
  const [casos, setCasos] = useState([]);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro
  const [meusIds, setMeusIds] = useState([]);
  const [aviso, setAviso] = useState({}); // { [casoId]: mensagem }

  const token = localStorage.getItem('hemare_token');
  let usuario = null;
  try { usuario = JSON.parse(localStorage.getItem('hemare_usuario') || 'null'); } catch { usuario = null; }
  const ehDoador = !!token && !!usuario && usuario.tipo === 'doador';

  function carregar() {
    fetch(URL_BACKEND + '/apadrinhamento')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setCasos(d.casos); setSituacao('ok'); })
      .catch(() => setSituacao('erro'));
    if (ehDoador) {
      fetch(URL_BACKEND + '/apadrinhamento/meus-afilhados', { headers: { 'Authorization': 'Bearer ' + token } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setMeusIds(d.afilhados.map((a) => a.id)))
        .catch(() => {});
    }
  }

  useEffect(carregar, []);

  async function apadrinhar(caso) {
    setAviso((a) => ({ ...a, [caso.id]: 'Enviando...' }));
    try {
      const r = await fetch(URL_BACKEND + '/apadrinhamento/' + caso.id + '/apadrinhar', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }
      });
      const d = await r.json();
      setAviso((a) => ({ ...a, [caso.id]: (r.ok ? '' : '❌ ') + (d.mensagem || d.erro) }));
      if (r.ok) carregar();
    } catch {
      setAviso((a) => ({ ...a, [caso.id]: '❌ Não consegui falar com o servidor.' }));
    }
  }

  return (
    <div className="apad">
      <h1>💝 Apadrinhe um paciente</h1>
      <p className="apad-sub">
        Algumas pessoas precisam de sangue a cada poucas semanas, a vida toda (como quem tem anemia falciforme ou talassemia).
        Ao apadrinhar, você se compromete a <strong>voltar a doar</strong> por esse paciente sempre que puder,
        e o hospital avisa você por email quando chegar a hora.
      </p>
      <p className="apad-privacidade">
        🔒 Para proteger os pacientes, aqui aparece só um apelido: nunca o nome verdadeiro. E você pode deixar de ser padrinho quando quiser.
      </p>

      {situacao === 'carregando' && <p className="apad-vazio">Carregando pacientes...</p>}
      {situacao === 'erro' && <p className="apad-vazio">Não foi possível carregar os pacientes agora.</p>}
      {situacao === 'ok' && casos.length === 0 && (
        <p className="apad-vazio">Nenhum paciente procurando padrinhos no momento. Volte em breve! 💛</p>
      )}

      <ul className="apad-lista">
        {casos.map((c) => {
          const ja = meusIds.includes(c.id);
          return (
            <li key={c.id} className="apad-caso">
              <div className="apad-topo">
                <span className="apad-tipo" aria-label={'Tipo sanguíneo ' + c.tipoSanguineo}>{c.tipoSanguineo}</span>
                <div>
                  <strong>{c.apelido}</strong>
                  <span className="apad-local">{c.hospital} — {c.cidade}{c.estado ? '/' + c.estado : ''}</span>
                </div>
              </div>
              <p className="apad-detalhe">
                {c.condicao !== 'Não informada' && <>{c.condicao} · </>}
                precisa de sangue a cada <strong>{c.frequenciaDias} dias</strong>
              </p>
              <div className="conq-barra-fundo" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.porcentagem}
                   aria-label={'Padrinhos de ' + c.apelido}>
                <div className="conq-barra" style={{ width: c.porcentagem + '%' }}></div>
              </div>
              <p className="apad-meta">
                {c.padrinhos} de {c.meta} padrinhos{c.completo ? ' — meta atingida, mas sempre cabe mais um 💛' : ''}
              </p>

              {ja ? (
                <p className="apad-ja">✅ Você é padrinho deste paciente. Veja em <Link to="/area-doador" className="hemare-link">Minha área</Link>.</p>
              ) : ehDoador ? (
                <button type="button" className="conq-btn" onClick={() => apadrinhar(c)}>💝 Quero apadrinhar</button>
              ) : (
                <p className="apad-login">
                  {token ? 'Só contas de doador podem apadrinhar.' : <><Link to="/login" className="hemare-link">Entre</Link> ou <Link to="/cadastro" className="hemare-link">crie sua conta</Link> de doador para apadrinhar.</>}
                </p>
              )}
              {aviso[c.id] && <p className="conq-copia" role="status">{aviso[c.id]}</p>}
            </li>
          );
        })}
      </ul>

      <p className="conteudo-aviso">
        Apadrinhar não substitui a triagem: antes de cada doação você passa pela avaliação do hemocentro, como sempre.
      </p>
    </div>
  );
}

export default Apadrinhar;
