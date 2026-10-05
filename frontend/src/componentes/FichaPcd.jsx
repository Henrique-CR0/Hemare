// Hemare - Ficha PcD (pessoa com deficiencia), dentro do Meu perfil:
// 1) declarar a condicao no perfil (so a pessoa ve, nunca um hospital) e 2) preencher a ficha de orientacao
// para a triagem, que mostra o que a norma federal diz para o caso e o que levar ao hemocentro.
// As respostas da ficha nao sao guardadas: o resultado existe so na tela (e na folha impressa).
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

function idadeDe(dataNascimento) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento || '')) return '';
  const hoje = new Date();
  const [a, m, d] = dataNascimento.split('-').map(Number);
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade >= 0 && idade <= 120 ? String(idade) : '';
}

function alternar(lista, valor) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

const SELO = { ok: '✅', amarelo: '🟡', vermelho: '🔴' };
const NOME_NIVEL = { ok: 'Sem impedimento', amarelo: 'Atenção', vermelho: 'Impede pela norma' };

function FichaPcd({ dataNascimento, pesoKg }) {
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | indisponivel | sem-perfil
  const [dados, setDados] = useState(null);
  const [guia, setGuia] = useState(null);
  const [declarado, setDeclarado] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [apoios, setApoios] = useState([]);
  const [consentimento, setConsentimento] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const [fichaAberta, setFichaAberta] = useState(false);
  const [causas, setCausas] = useState([]);
  const [epilepsiaSituacao, setEpilepsiaSituacao] = useState('');
  const [meses, setMeses] = useState('');
  const [medicamentos, setMedicamentos] = useState([]);
  const [decisao, setDecisao] = useState('sozinho');
  const [idade, setIdade] = useState(idadeDe(dataNascimento));
  const [peso, setPeso] = useState(pesoKg || '');
  const [resultado, setResultado] = useState(null);
  const [avisoFicha, setAvisoFicha] = useState('');

  function aplicar(d) {
    setDados(d);
    setDeclarado(d.declarado);
    setTipos(d.tipos);
    setApoios(d.apoios);
    setConsentimento(d.declarado);
    setSituacao('ok');
  }

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/pcd/eu', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(async (r) => {
        if (!ativo) return;
        if (r.status === 404) return setSituacao('sem-perfil');
        if (!r.ok) return setSituacao('indisponivel');
        aplicar(await r.json());
      })
      .catch(() => ativo && setSituacao('indisponivel'));
    fetch(URL_BACKEND + '/pcd/guia')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => ativo && g && setGuia(g))
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  async function salvar(e) {
    e.preventDefault();
    if (declarado && tipos.length === 0) { setMensagem('❌ Escolha ao menos um tipo de deficiência.'); return; }
    setMensagem('Salvando...');
    try {
      const r = await fetch(URL_BACKEND + '/pcd/eu', {
        method: 'PUT', headers: cabecalho, body: JSON.stringify({ declarado, tipos, apoios, consentimento })
      });
      const d = await r.json();
      if (r.ok) {
        aplicar(d);
        setMensagem(d.declarado ? '✅ Salvo. Só você vê esta informação.' : '✅ Pronto: a informação foi apagada do seu perfil.');
        if (!d.declarado) { setFichaAberta(false); setResultado(null); }
      } else {
        setMensagem('❌ ' + d.erro);
      }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
  }

  async function gerarFicha(e) {
    e.preventDefault();
    setAvisoFicha('Calculando...'); setResultado(null);
    const corpo = {
      idade: idade === '' ? undefined : Number(idade),
      pesoKg: peso === '' ? undefined : Number(peso),
      causas, medicamentos, decisao, apoios,
      epilepsiaSituacao: causas.includes('epilepsia') ? epilepsiaSituacao : undefined,
      mesesDesdeProcedimento: meses === '' || !(causas.includes('lesao-trauma') || causas.includes('amputacao')) ? undefined : Number(meses)
    };
    try {
      const r = await fetch(URL_BACKEND + '/pcd/ficha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const d = await r.json();
      if (r.ok) { setResultado(d); setAvisoFicha(''); } else { setAvisoFicha('❌ ' + d.erro); }
    } catch {
      setAvisoFicha('❌ Não consegui falar com o servidor.');
    }
  }

  if (situacao === 'carregando') return null;
  if (situacao === 'sem-perfil') return null;
  if (situacao === 'indisponivel') {
    return (
      <section className="mp-bloco pcd">
        <h2>♿ Pessoa com deficiência (PcD)</h2>
        <p className="mp-dica">Este recurso ainda não está ativo neste servidor.</p>
      </section>
    );
  }

  const hoje = new Date().toLocaleDateString('pt-BR');

  return (
    <section className="mp-bloco pcd">
      <h2>♿ Pessoa com deficiência (PcD)</h2>
      <p className="pcd-intro">
        Pessoas com deficiência <strong>podem doar sangue</strong>, desde que estejam bem de saúde e atendam aos requisitos gerais da triagem.
        Na norma federal, a deficiência <strong>por si só não é impedimento</strong>: o que conta é a causa, os remédios e a capacidade de
        entender e consentir. Quem decide é sempre a equipe do hemocentro.
      </p>

      <form className="pcd-form" onSubmit={salvar}>
        <label className="apad-autoriza">
          <input type="checkbox" checked={declarado} onChange={(e) => setDeclarado(e.target.checked)} />
          Sou pessoa com deficiência (PcD) e quero a Ficha PcD no meu perfil.
        </label>

        {declarado && (
          <>
            <fieldset>
              <legend>Tipo de deficiência (pode marcar mais de um)</legend>
              {dados.opcoes.tipos.map((t) => (
                <label key={t.valor} className="pcd-opcao">
                  <input type="checkbox" checked={tipos.includes(t.valor)} onChange={() => setTipos(alternar(tipos, t.valor))} />
                  {t.rotulo}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>O que ajuda no atendimento (opcional)</legend>
              {dados.opcoes.apoios.map((a) => (
                <label key={a.valor} className="pcd-opcao">
                  <input type="checkbox" checked={apoios.includes(a.valor)} onChange={() => setApoios(alternar(apoios, a.valor))} />
                  {a.rotulo}
                </label>
              ))}
            </fieldset>
            <label className="apad-autoriza pcd-consentimento">
              <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
              Entendo que a deficiência é uma informação sensível. Ela fica só no meu perfil, <strong>nenhum hospital vê</strong>,
              entra no “Baixar meus dados” e some se eu desmarcar aqui ou excluir a conta.
            </label>
          </>
        )}

        <div className="mp-salvar">
          <button type="submit" className="auth-botao">Salvar</button>
          {mensagem && <div className="auth-msg" role="status">{mensagem}</div>}
        </div>
      </form>

      {dados.declarado && guia && (
        <div className="pcd-ficha-bloco">
          <button type="button" className="conq-btn" aria-expanded={fichaAberta} onClick={() => setFichaAberta(!fichaAberta)}>
            {fichaAberta ? 'Fechar a Ficha PcD' : '📋 Abrir a Ficha PcD (o que a norma diz para o meu caso)'}
          </button>

          {fichaAberta && (
            <form className="pcd-form" onSubmit={gerarFicha}>
              <p className="mp-dica">Suas respostas não são guardadas: o resultado aparece só aqui, e você pode imprimir para levar ao hemocentro.</p>

              <div className="mp-linha">
                <label>Idade
                  <input className="auth-input" type="number" min="0" max="120" value={idade} onChange={(e) => setIdade(e.target.value)} />
                </label>
                <label>Peso (kg)
                  <input className="auth-input" type="number" min="20" max="300" value={peso} onChange={(e) => setPeso(e.target.value)} />
                </label>
              </div>

              <fieldset>
                <legend>1. Qual é a causa da deficiência? (pode marcar mais de uma)</legend>
                {guia.causas.map((c) => (
                  <label key={c.valor} className="pcd-opcao">
                    <input type="checkbox" checked={causas.includes(c.valor)} onChange={() => setCausas(alternar(causas, c.valor))} />
                    {c.rotulo}
                  </label>
                ))}
              </fieldset>

              {causas.includes('epilepsia') && (
                <fieldset>
                  <legend>Sobre a epilepsia</legend>
                  {guia.situacoesEpilepsia.map((s) => (
                    <label key={s.valor} className="pcd-opcao">
                      <input type="radio" name="epilepsia" checked={epilepsiaSituacao === s.valor} onChange={() => setEpilepsiaSituacao(s.valor)} />
                      {s.rotulo}
                    </label>
                  ))}
                </fieldset>
              )}

              {(causas.includes('lesao-trauma') || causas.includes('amputacao')) && (
                <label>Há quantos meses foi a última cirurgia ou o acidente? (opcional)
                  <input className="auth-input" type="number" min="0" max="1200" value={meses} onChange={(e) => setMeses(e.target.value)} />
                </label>
              )}

              <fieldset>
                <legend>2. Quais remédios de uso contínuo você toma? (pode marcar mais de um)</legend>
                {guia.medicamentos.map((m) => (
                  <label key={m.valor} className="pcd-opcao">
                    <input type="checkbox" checked={medicamentos.includes(m.valor)} onChange={() => setMedicamentos(alternar(medicamentos, m.valor))} />
                    {m.rotulo}
                  </label>
                ))}
                <p className="mp-dica">Nunca pare um remédio por conta própria para poder doar.</p>
              </fieldset>

              <fieldset>
                <legend>3. Como você decide sobre a sua saúde?</legend>
                {guia.decisoes.map((d) => (
                  <label key={d.valor} className="pcd-opcao">
                    <input type="radio" name="decisao" checked={decisao === d.valor} onChange={() => setDecisao(d.valor)} />
                    {d.rotulo}
                  </label>
                ))}
              </fieldset>

              <div className="mp-salvar">
                <button type="submit" className="auth-botao">Gerar minha ficha</button>
                {avisoFicha && <div className="auth-msg" role="status">{avisoFicha}</div>}
              </div>
            </form>
          )}

          {resultado && (
            <div className={'pcd-resultado pcd-' + resultado.nivel + ' pcd-impressao'} aria-live="polite">
              <h3>{resultado.titulo}</h3>
              <p className="pcd-so-impressao">Ficha PcD do Hemare, gerada em {hoje}. Não é diagnóstico nem autorização.</p>
              <p>{resultado.resumo}</p>

              <h4>O que a norma diz para o seu caso</h4>
              <ul className="pcd-itens">
                {resultado.avaliacao.map((i, n) => (
                  <li key={n} className={'pcd-item pcd-item-' + i.nivel}>
                    <span aria-label={NOME_NIVEL[i.nivel]}>{SELO[i.nivel]}</span>
                    <span>{i.texto}{i.base && <small> ({i.base})</small>}</span>
                  </li>
                ))}
              </ul>

              <h4>O que levar</h4>
              <ul>{resultado.levar.map((t, n) => <li key={n}>{t}</li>)}</ul>

              {resultado.apoios.length > 0 && (
                <>
                  <h4>Combine antes com o hemocentro</h4>
                  <ul>{resultado.apoios.map((t, n) => <li key={n}>{t}</li>)}</ul>
                </>
              )}

              <h4>Se a resposta for “não”</h4>
              <ul>{resultado.depois.map((t, n) => <li key={n}>{t}</li>)}</ul>

              <p className="pcd-nota">{resultado.notaPratica}</p>
              <p className="pcd-nota"><strong>{resultado.aviso}</strong></p>
              <p className="pcd-nota">Base: {resultado.fonte.norma}. Consultada em 05/10/2026. Os prazos e critérios podem mudar: confira com o hemocentro.</p>

              <button type="button" className="conq-btn conq-btn-vazado pcd-nao-imprimir" onClick={() => window.print()}>🖨️ Imprimir ou salvar em PDF</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default FichaPcd;
