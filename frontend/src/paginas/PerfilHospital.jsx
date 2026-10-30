// Hemare - Perfil do hospital: os dados da instituicao, o estado da verificacao e a seguranca da conta,
// separados do painel de trabalho (estoque, necessidades, agenda...).
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';
import { lerSessao, salvarSessao } from '../sessao';
import { cnpjValido, mascaraCnpj, mascaraCep } from '../regras/documentos';
import AbasConta from '../componentes/AbasConta';
import SubAbas, { useAba } from '../componentes/SubAbas';
import AlterarSenha from '../componentes/AlterarSenha';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const ABAS = [
  { id: 'dados', rotulo: '🏥 Dados da instituição' },
  { id: 'verificacao', rotulo: '🛡️ Verificação' },
  { id: 'conta', rotulo: '🔑 Conta e segurança' }
];

const STATUS = {
  aprovado: { classe: 'selo-verificado', rotulo: '✓ Verificado', texto: 'Seu cadastro foi aprovado por um administrador. Você pode publicar necessidades, atualizar o estoque, ver doadores compatíveis, abrir horários e confirmar doações.' },
  pendente: { classe: 'selo-pendente', rotulo: '⏳ Verificação pendente', texto: 'Um administrador está conferindo o seu CNPJ e o seu CNES. Enquanto isso, por segurança dos doadores, ficam bloqueadas as ações que mexem com dados de doadores.' },
  recusado: { classe: 'selo-recusado', rotulo: '✕ Cadastro recusado', texto: 'O cadastro não foi aprovado. Veja o motivo abaixo, corrija os dados e reenvie para análise.' }
};

function PerfilHospital() {
  const [aba, trocarAba] = useAba(ABAS.map((a) => a.id));
  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | sem-perfil | erro
  const [form, setForm] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  function aplicar(d) {
    setDados(d);
    setForm({
      nome: d.nome || '', cnpj: d.cnpj || '', cnes: d.cnes || '', cep: d.cep || '', endereco: d.endereco || '', numero: d.numero || '',
      bairro: d.bairro || '', complemento: d.complemento || '', cidade: d.cidade || '', estado: d.estado || ''
    });
  }

  function carregar() {
    const sessao = lerSessao();
    return fetch(URL_BACKEND + '/hospital/meus-dados', { headers: { 'Authorization': 'Bearer ' + (sessao ? sessao.token : '') } })
      .then(async (r) => {
        if (!r.ok) return setSituacao('erro');
        const d = await r.json();
        if (!d) return setSituacao('sem-perfil');
        aplicar(d);
        setSituacao('ok');
      })
      .catch(() => setSituacao('erro'));
  }

  useEffect(() => { carregar(); }, []);

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function buscarCep() {
    const so = form.cep.replace(/\D/g, '');
    if (so.length !== 8) return;
    try {
      const r = await fetch('https://viacep.com.br/ws/' + so + '/json/');
      const d = await r.json();
      if (!d.erro) setForm((f) => ({ ...f, endereco: d.logradouro || f.endereco, bairro: d.bairro || f.bairro, cidade: d.localidade || f.cidade, estado: d.uf || f.estado }));
    } catch { /* sem internet para o CEP: a pessoa digita */ }
  }

  async function salvar(e) {
    if (e) e.preventDefault();
    const obrigatorios = ['nome', 'cnpj', 'cnes', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado'];
    if (obrigatorios.some((c) => !String(form[c]).trim())) { setMensagem('❌ Preencha todos os campos obrigatórios.'); return; }
    // So confere o que a pessoa mudou: o que ja estava salvo foi conferido no cadastro e nao trava outras edicoes.
    if (form.cnpj !== dados.cnpj && !cnpjValido(form.cnpj)) { setMensagem('❌ CNPJ inválido.'); return; }
    if (form.cnes !== dados.cnes && form.cnes.replace(/\D/g, '').length !== 7) { setMensagem('❌ O CNES tem 7 números.'); return; }
    const mudouIdentidade = form.cnpj !== dados.cnpj || form.cnes !== dados.cnes;
    if (mudouIdentidade && dados.statusVerificacao === 'aprovado' &&
        !window.confirm('Mudar o CNPJ ou o CNES manda o cadastro de volta para verificação, e o hospital sai do estoque público até um administrador aprovar de novo. Continuar?')) return;

    setSalvando(true); setMensagem('Salvando...');
    const sessao = lerSessao();
    const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (sessao ? sessao.token : '') };
    try {
      const rPerfil = await fetch(URL_BACKEND + '/hospital/perfil', {
        method: 'POST', headers: cabecalho,
        body: JSON.stringify({ cnpj: form.cnpj, cnes: form.cnes, cep: form.cep, endereco: form.endereco, numero: form.numero, bairro: form.bairro, complemento: form.complemento, cidade: form.cidade, estado: form.estado })
      });
      const dPerfil = await rPerfil.json();
      if (!rPerfil.ok) { setMensagem('❌ ' + dPerfil.erro); setSalvando(false); return; }

      if (form.nome.trim() !== dados.nome) {
        const rNome = await fetch(URL_BACKEND + '/auth/eu', { method: 'PATCH', headers: cabecalho, body: JSON.stringify({ nome: form.nome }) });
        const dNome = await rNome.json();
        if (!rNome.ok) { setMensagem('❌ ' + dNome.erro); setSalvando(false); return; }
        salvarSessao(dNome.token, dNome.usuario);
      }
      await carregar();
      setMensagem('✅ Dados salvos.');
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
    setSalvando(false);
  }

  const selo = dados ? STATUS[dados.statusVerificacao] : null;

  return (
    <div className="mp ph">
      <AbasConta tipo="hospital" />

      <h1>🏥 Perfil do hospital</h1>
      {situacao === 'carregando' && <p className="painel-vazio">Carregando...</p>}
      {situacao === 'erro' && <p className="painel-vazio">Não consegui carregar os dados do hospital agora.</p>}
      {situacao === 'sem-perfil' && <p className="painel-vazio">Esta conta ainda não tem os dados da instituição. Faça o cadastro do hospital para continuar.</p>}

      {situacao === 'ok' && (
        <>
          <div className="ph-resumo">
            <strong>{dados.nome}</strong>
            <span className={selo.classe}>{selo.rotulo}</span>
            <span className="mp-dica">{dados.cidade}/{dados.estado} · {dados.email}</span>
          </div>

          <SubAbas abas={ABAS} atual={aba} aoTrocar={trocarAba} />

          {aba === 'dados' && (
            <form className="mp-form" id="painel-dados" role="tabpanel" aria-labelledby="aba-dados" onSubmit={salvar}>
              <fieldset>
                <legend>🏥 Instituição</legend>
                <label>Nome do hospital *
                  <input className="auth-input" value={form.nome} maxLength={120} onChange={(e) => mudar('nome', e.target.value)} />
                </label>
                <div className="mp-linha">
                  <label>CNPJ *
                    <input className="auth-input" inputMode="numeric" value={form.cnpj} onChange={(e) => mudar('cnpj', mascaraCnpj(e.target.value))} />
                  </label>
                  <label>CNES *
                    <input className="auth-input" inputMode="numeric" value={form.cnes} onChange={(e) => mudar('cnes', e.target.value.replace(/\D/g, '').slice(0, 7))} />
                  </label>
                </div>
                <p className="mp-dica">Mudar o CNPJ ou o CNES manda o cadastro de volta para verificação.</p>
              </fieldset>

              <fieldset>
                <legend>📍 Endereço</legend>
                <div className="mp-linha">
                  <label>CEP *
                    <input className="auth-input" inputMode="numeric" value={form.cep} onChange={(e) => mudar('cep', mascaraCep(e.target.value))} onBlur={buscarCep} />
                  </label>
                  <label className="mp-grande">Rua *
                    <input className="auth-input" value={form.endereco} onChange={(e) => mudar('endereco', e.target.value)} />
                  </label>
                  <label>Número *
                    <input className="auth-input" value={form.numero} maxLength={10} onChange={(e) => mudar('numero', e.target.value)} />
                  </label>
                </div>
                <div className="mp-linha">
                  <label>Bairro *
                    <input className="auth-input" value={form.bairro} onChange={(e) => mudar('bairro', e.target.value)} />
                  </label>
                  <label>Complemento
                    <input className="auth-input" value={form.complemento} onChange={(e) => mudar('complemento', e.target.value)} />
                  </label>
                </div>
                <div className="mp-linha">
                  <label className="mp-grande">Cidade *
                    <input className="auth-input" value={form.cidade} onChange={(e) => mudar('cidade', e.target.value)} />
                  </label>
                  <label>Estado *
                    <select className="auth-input" value={form.estado} onChange={(e) => mudar('estado', e.target.value)}>
                      <option value="">UF</option>
                      {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>

              <div className="mp-salvar">
                <button type="submit" className="auth-botao" disabled={salvando}>Salvar alterações</button>
                {mensagem && <div className="auth-msg" role="status">{mensagem}</div>}
              </div>
            </form>
          )}

          {aba === 'verificacao' && (
            <section className="mp-bloco" id="painel-verificacao" role="tabpanel" aria-labelledby="aba-verificacao">
              <h2>🛡️ Verificação do cadastro</h2>
              <p><span className={selo.classe}>{selo.rotulo}</span></p>
              <p>{selo.texto}</p>
              {dados.statusVerificacao === 'recusado' && (
                <>
                  <div className="verif-aviso verif-recusado" role="status"><strong>Motivo da recusa:</strong> {dados.motivo_recusa}</div>
                  <p className="mp-dica">Corrija o que for preciso na aba “Dados da instituição”. Ao salvar, o cadastro volta para análise.</p>
                  <button type="button" className="conq-btn" onClick={() => salvar()}>Reenviar para análise</button>
                  {mensagem && <div className="auth-msg" role="status">{mensagem}</div>}
                </>
              )}
              <p className="mp-dica">A verificação confere o CNPJ e o CNES. Só hospitais verificados aparecem no estoque público e podem chamar ou ver doadores.</p>
            </section>
          )}

          {aba === 'conta' && (
            <div id="painel-conta" role="tabpanel" aria-labelledby="aba-conta">
              <section className="mp-bloco">
                <h2>👤 Acesso da conta</h2>
                <p>E-mail de acesso: <strong>{dados.email}</strong></p>
                <p className="mp-dica">O nome da instituição se altera na aba “Dados da instituição”. Para trocar o e-mail de acesso, fale com um administrador.</p>
              </section>
              <AlterarSenha />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PerfilHospital;
