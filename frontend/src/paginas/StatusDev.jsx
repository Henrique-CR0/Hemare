// Hemare - Status do desenvolvimento (so administrador): uso real do sistema ao vivo + o relatorio de docs/STATUS.md.
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';
import AbasConta from '../componentes/AbasConta';
import Markdown from '../componentes/Markdown';
import { haQuanto } from '../regras/tempo';

function Numero({ valor, rotulo }) {
  return (
    <div className="status-numero">
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </div>
  );
}

function StatusDev() {
  const token = localStorage.getItem('hemare_token');
  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/admin/status', { headers: { 'Authorization': 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (ativo) { setDados(d); setSituacao('ok'); } })
      .catch(() => { if (ativo) setSituacao('erro'); });
    return () => { ativo = false; };
  }, [token]);

  const uso = dados && dados.uso;
  const agendados = uso ? (uso.agendamentos.agendado || 0) : 0;
  const compareceram = uso ? (uso.agendamentos.compareceu || 0) : 0;

  return (
    <div className="painel status-dev">
      <AbasConta tipo="admin" />
      <h1>📊 Status do desenvolvimento</h1>
      <p className="painel-sub">
        Como o projeto está: o uso real do sistema agora (só números, nenhum dado de pessoa) e o relatório de
        <code> docs/STATUS.md</code>, que é atualizado a cada rodada de entregas.
      </p>

      {situacao === 'carregando' && <p className="painel-vazio">Carregando...</p>}
      {situacao === 'erro' && <p className="painel-vazio">Não foi possível carregar o status agora.</p>}

      {situacao === 'ok' && (
        <>
          <h2 className="status-secao">Uso real, ao vivo</h2>
          <div className="status-numeros">
            <Numero valor={uso.contas.doadores} rotulo="doadores cadastrados" />
            <Numero valor={uso.contas.hospitais} rotulo={'hospitais (' + uso.hospitaisAprovados + ' aprovados)'} />
            <Numero valor={uso.contas.novasNos7Dias} rotulo="contas novas nos últimos 7 dias" />
            <Numero valor={uso.doacoesConfirmadas} rotulo="doações confirmadas" />
            <Numero valor={agendados} rotulo="doações agendadas" />
            <Numero valor={compareceram} rotulo="compareceram ao agendamento" />
            <Numero valor={uso.noticias.total} rotulo={'notícias no feed' + (uso.noticias.ultimaColeta ? ' (coletado ' + haQuanto(uso.noticias.ultimaColeta) + ')' : ' (ainda sem coleta)')} />
          </div>

          {dados.relatorio ? (
            <Markdown texto={dados.relatorio.replace(/^# [^\n]*\n/, '')} />
          ) : (
            <p className="painel-vazio">O arquivo <code>docs/STATUS.md</code> não está neste servidor. Veja-o no repositório do projeto.</p>
          )}
        </>
      )}
    </div>
  );
}

export default StatusDev;
