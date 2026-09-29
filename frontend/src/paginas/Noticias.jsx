// Hemare - Canal de noticias: como esta a doacao de sangue em cada estado do Brasil.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { URL_BACKEND } from '../config';

const NIVEIS = {
  'critico': { rotulo: 'Estoque crítico', icone: '🔴' },
  'alerta': { rotulo: 'Em alerta', icone: '🟠' },
  'atencao': { rotulo: 'Atenção', icone: '🟡' },
  'estavel': { rotulo: 'Estável', icone: '🟢' },
  'sem-dados': { rotulo: 'Sem dados recentes', icone: '⚪' }
};

function buscaNoticias(nome) {
  return 'https://news.google.com/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q='
    + encodeURIComponent('doação de sangue ' + nome);
}

function Selo({ nivel }) {
  const n = NIVEIS[nivel] || NIVEIS['sem-dados'];
  return <span className={'noti-selo noti-' + nivel}>{n.icone} {n.rotulo}</span>;
}

function Detalhe({ estado }) {
  const s = estado.sinais;
  const temSinais = s && s.hospitais > 0;
  return (
    <div className="noti-detalhe">
      <h3>📰 Avisos e notícias</h3>
      {estado.noticias.length === 0 ? (
        <p className="noti-vazio">Ainda não há avisos cadastrados para {estado.nome}.</p>
      ) : (
        <ul className="noti-lista">
          {estado.noticias.map((n) => (
            <li key={n.id}>
              <div className="noti-topo">
                <Selo nivel={n.nivel} />
                {n.referencia && <span className="noti-ref">{n.referencia}</span>}
              </div>
              <strong>{n.titulo}</strong>
              <p>{n.resumo}</p>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="hemare-link">
                Ler na fonte: {n.fonte} ↗
              </a>
            </li>
          ))}
        </ul>
      )}

      <h3>🩸 Agora no Hemare</h3>
      {temSinais ? (
        <ul className="noti-sinais">
          <li><strong>{s.hospitais}</strong> {s.hospitais === 1 ? 'hospital cadastrado' : 'hospitais cadastrados'}</li>
          <li><strong>{s.estoque.critico}</strong> {s.estoque.critico === 1 ? 'tipo' : 'tipos'} com estoque crítico · <strong>{s.estoque.alerta}</strong> em alerta</li>
          <li><strong>{s.necessidadesUrgentes}</strong> {s.necessidadesUrgentes === 1 ? 'pedido urgente aberto' : 'pedidos urgentes abertos'}</li>
          {s.campanhasAtivas > 0 && <li><strong>{s.campanhasAtivas}</strong> {s.campanhasAtivas === 1 ? 'campanha de reposição ativa' : 'campanhas de reposição ativas'}</li>}
          {s.casosApadrinhamento > 0 && <li><strong>{s.casosApadrinhamento}</strong> {s.casosApadrinhamento === 1 ? 'paciente procura' : 'pacientes procuram'} padrinhos — <Link to="/apadrinhar" className="hemare-link">apadrinhar</Link></li>}
        </ul>
      ) : (
        <p className="noti-vazio">Nenhum hospital de {estado.nome} usa o Hemare ainda. Trabalha em um hemocentro? <Link to="/cadastro-hospital" className="hemare-link">Cadastre o hospital</Link>.</p>
      )}

      <div className="noti-acoes">
        <Link to="/locais" className="conq-btn">🗺️ Onde doar</Link>
        <Link to="/estoque" className="conq-btn conq-btn-vazado">🌡️ Estoque dos hospitais</Link>
        <a href={buscaNoticias(estado.nome)} target="_blank" rel="noopener noreferrer" className="conq-btn conq-btn-vazado">
          🔎 Mais notícias sobre {estado.sigla} ↗
        </a>
      </div>
    </div>
  );
}

function Noticias() {
  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro
  const [filtro, setFiltro] = useState('todos');
  const [aberto, setAberto] = useState(null); // sigla do estado expandido

  useEffect(() => {
    fetch(URL_BACKEND + '/noticias')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setDados(d); setSituacao('ok'); })
      .catch(() => setSituacao('erro'));
  }, []);

  const estados = dados ? dados.estados.filter((e) => filtro === 'todos' || e.nivel === filtro) : [];
  const emAlerta = dados ? dados.contagem.critico + dados.contagem.alerta : 0;

  return (
    <div className="noti">
      <h1>📰 Sangue no Brasil, estado por estado</h1>
      <p className="noti-sub">
        Reunimos avisos dos hemocentros e da imprensa e os sinais dos hospitais do Hemare para mostrar onde a doação é mais urgente.
        Cada aviso leva à matéria original. A situação muda de um dia para o outro: antes de ir, confirme com o hemocentro.
      </p>

      {situacao === 'carregando' && <p className="noti-vazio">Carregando o panorama...</p>}
      {situacao === 'erro' && <p className="noti-vazio">Não foi possível carregar as notícias agora.</p>}

      {situacao === 'ok' && (
        <>
          <p className="noti-destaque">
            <strong>{emAlerta} de 27</strong> unidades da federação aparecem com estoque crítico ou em alerta nos avisos mais recentes.
          </p>

          <div className="noti-filtros" role="group" aria-label="Filtrar por situação">
            <button type="button" className={'noti-filtro' + (filtro === 'todos' ? ' noti-filtro-ativo' : '')} onClick={() => setFiltro('todos')}>
              Todos ({dados.estados.length})
            </button>
            {Object.keys(NIVEIS).map((n) => (
              <button key={n} type="button" className={'noti-filtro' + (filtro === n ? ' noti-filtro-ativo' : '')}
                      aria-pressed={filtro === n} onClick={() => setFiltro(n)}>
                {NIVEIS[n].icone} {NIVEIS[n].rotulo} ({dados.contagem[n]})
              </button>
            ))}
          </div>

          <ul className="noti-estados">
            {estados.map((e) => (
              <li key={e.sigla} className={'noti-estado noti-borda-' + e.nivel}>
                <button type="button" className="noti-estado-btn" aria-expanded={aberto === e.sigla}
                        onClick={() => setAberto(aberto === e.sigla ? null : e.sigla)}>
                  <span className="noti-sigla">{e.sigla}</span>
                  <span className="noti-nome">{e.nome}</span>
                  <Selo nivel={e.nivel} />
                  {e.noticias[0] && <span className="noti-manchete">{e.noticias[0].titulo}</span>}
                </button>
                {aberto === e.sigla && <Detalhe estado={e} />}
              </li>
            ))}
          </ul>
          {estados.length === 0 && <p className="noti-vazio">Nenhum estado nessa situação.</p>}
        </>
      )}

      <p className="conteudo-aviso">
        Os resumos foram escritos pelo Hemare e servem só de guia; os direitos das matérias pertencem aos veículos citados.
        Este canal não substitui o comunicado oficial do hemocentro.
      </p>
    </div>
  );
}

export default Noticias;
