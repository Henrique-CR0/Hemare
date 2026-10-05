// Hemare - Meu perfil (so para doadores): foto, dados pessoais, privacidade com "visao do hospital",
// carteirinha digital e os direitos da LGPD (baixar meus dados e excluir a conta).
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { URL_BACKEND } from '../config';
import { reduzirFoto } from '../regras/foto';
import { mascaraCpf, mascaraTelefone, cpfValido } from '../regras/documentos';
import Carteirinha from '../componentes/Carteirinha';
import RedeRara from '../componentes/RedeRara';

const TIPOS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const RH_NULO = 'Rh nulo (sangue dourado)';
const GENEROS = [
  ['mulher', 'Mulher'], ['homem', 'Homem'], ['mulher-trans', 'Mulher trans'], ['homem-trans', 'Homem trans'],
  ['nao-binario', 'Não binário'], ['outro', 'Outro'], ['nao-informar', 'Prefiro não informar']
];
const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

function formularioDe(d) {
  return {
    nome: d.nome || '', nomeSocial: d.nomeSocial || '', genero: d.genero || '', sexo: d.sexo || '',
    tipoSanguineo: d.tipoSanguineo || '', cidade: d.cidade || '', estado: d.estado || '',
    dataNascimento: d.dataNascimento || '', pesoKg: d.pesoKg === null || d.pesoKg === undefined ? '' : String(d.pesoKg),
    telefone: d.telefone || '', visibilidade: d.visibilidade || 'anonimo',
    contatoEmergenciaNome: d.contatoEmergenciaNome || '', contatoEmergenciaTelefone: d.contatoEmergenciaTelefone || ''
  };
}

function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function MeuPerfil() {
  const navegar = useNavigate();
  const token = localStorage.getItem('hemare_token');
  const cabecalho = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const [dados, setDados] = useState(null);
  const [situacao, setSituacao] = useState('carregando'); // carregando | ok | erro
  const [form, setForm] = useState(null);
  const [foto, setFoto] = useState(null);
  const [fotoAlterada, setFotoAlterada] = useState(false);
  const [alterandoCpf, setAlterandoCpf] = useState(false);
  const [novoCpf, setNovoCpf] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [avisoFoto, setAvisoFoto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [entendi, setEntendi] = useState(false);
  const [avisoLgpd, setAvisoLgpd] = useState('');

  function sairDaConta() {
    localStorage.removeItem('hemare_token');
    localStorage.removeItem('hemare_usuario');
    navegar('/');
  }

  function aplicar(perfil) {
    setDados(perfil);
    setForm(formularioDe(perfil));
    setFoto(perfil.foto);
    setFotoAlterada(false);
    setNovoCpf('');
    setAlterandoCpf(false);
  }

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/perfil', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(async (r) => {
        if (!ativo) return;
        if (r.status === 404) return navegar('/completar-perfil');
        if (r.status === 401) return sairDaConta();
        if (!r.ok) return setSituacao('erro');
        aplicar(await r.json());
        setSituacao('ok');
      })
      .catch(() => ativo && setSituacao('erro'));
    return () => { ativo = false; };
  }, []);

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function escolherFoto(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    setAvisoFoto('');
    try {
      setFoto(await reduzirFoto(arquivo));
      setFotoAlterada(true);
    } catch (erro) {
      setAvisoFoto('❌ ' + erro.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (alterandoCpf && novoCpf && !cpfValido(novoCpf)) { setMensagem('❌ CPF inválido. Confira os números.'); return; }
    setSalvando(true);
    setMensagem('Salvando...');
    const corpo = { ...form };
    if (alterandoCpf && novoCpf) corpo.cpf = novoCpf;
    if (fotoAlterada) corpo.foto = foto;
    try {
      const r = await fetch(URL_BACKEND + '/perfil', { method: 'PUT', headers: cabecalho, body: JSON.stringify(corpo) });
      const d = await r.json();
      if (r.ok) {
        aplicar(d.perfil);
        try { localStorage.setItem('hemare_usuario', JSON.stringify(d.usuario)); } catch { /* sem armazenamento */ }
        setMensagem('✅ ' + d.mensagem);
      } else {
        setMensagem('❌ ' + d.erro);
      }
    } catch {
      setMensagem('❌ Não consegui falar com o servidor.');
    }
    setSalvando(false);
  }

  async function baixarDados() {
    setAvisoLgpd('Preparando seu arquivo...');
    try {
      const r = await fetch(URL_BACKEND + '/perfil/exportar', { headers: { 'Authorization': 'Bearer ' + token } });
      if (!r.ok) { setAvisoLgpd('❌ Não consegui gerar o arquivo agora.'); return; }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados-hemare.json';
      a.click();
      URL.revokeObjectURL(url);
      setAvisoLgpd('✅ Arquivo baixado.');
    } catch {
      setAvisoLgpd('❌ Não consegui falar com o servidor.');
    }
  }

  async function excluirConta() {
    setAvisoLgpd('Excluindo...');
    try {
      const r = await fetch(URL_BACKEND + '/perfil/excluir', { method: 'POST', headers: cabecalho, body: JSON.stringify({ senha: senhaExcluir }) });
      const d = await r.json();
      if (r.ok) { alert(d.mensagem); sairDaConta(); return; }
      setAvisoLgpd('❌ ' + d.erro);
    } catch {
      setAvisoLgpd('❌ Não consegui falar com o servidor.');
    }
  }

  if (situacao === 'carregando') return <p className="mp-vazio">Carregando seu perfil...</p>;
  if (situacao === 'erro') return <p className="mp-vazio">Não foi possível carregar o perfil agora.</p>;

  const identificado = form.visibilidade === 'identificado';
  const nomeVisto = identificado ? (form.nomeSocial.trim() || form.nome) : 'Doador anônimo';
  const telefoneVisto = identificado ? (form.telefone || 'Não informado') : 'Protegido 🔒';
  const nomeExibido = dados.nomeSocial || dados.nome;
  const cartao = { ...dados, ...form, foto, nomeSocial: form.nomeSocial.trim(), pesoKg: dados.pesoKg };
  const pct = dados.completude.porcentagem;

  return (
    <div className="mp">
      <div className="mp-topo">
        <div className="mp-foto-bloco">
          <div className="mp-foto" aria-hidden={!foto}>
            {foto ? <img src={foto} alt={'Foto de ' + nomeExibido} /> : <span>🩸</span>}
          </div>
          <label className="conq-btn conq-btn-vazado mp-foto-botao">
            📷 {foto ? 'Trocar foto' : 'Adicionar foto'}
            <input type="file" accept="image/*" onChange={escolherFoto} hidden />
          </label>
          {foto && <button type="button" className="mp-link" onClick={() => { setFoto(null); setFotoAlterada(true); }}>Remover foto</button>}
          {avisoFoto && <p className="campo-aviso" role="alert">{avisoFoto}</p>}
          {fotoAlterada && <p className="mp-dica">Foto nova: clique em “Salvar alterações” para guardar.</p>}
        </div>

        <div className="mp-resumo">
          <h1>{nomeExibido}</h1>
          <p className="mp-chips">
            <span className="mp-chip mp-chip-tipo">🩸 {dados.tipoSanguineo.startsWith('Rh nulo') ? 'Rh nulo' : dados.tipoSanguineo}</span>
            <span className="mp-chip">{dados.nivel.icone} {dados.nivel.nome}</span>
            <span className="mp-chip">{dados.totalDoacoes} {dados.totalDoacoes === 1 ? 'doação' : 'doações'}</span>
          </p>
          <p className="mp-email">{dados.email}</p>
          <Link to="/area-doador" className="mp-link">← Voltar para minha área</Link>
        </div>

        <div className="mp-completude" role="img" aria-label={'Perfil ' + pct + '% completo'}>
          <div className="mp-anel" style={{ '--pct': pct * 3.6 + 'deg' }}><span>{pct}%</span></div>
          <strong>Perfil completo</strong>
          {dados.completude.faltando.length > 0 ? (
            <ul>
              {dados.completude.faltando.slice(0, 3).map((f) => <li key={f.campo}>{f.rotulo}</li>)}
            </ul>
          ) : <p>Tudo preenchido! 🎉</p>}
        </div>
      </div>

      <form onSubmit={salvar} className="mp-form">
        <fieldset>
          <legend>👤 Identidade</legend>
          <label>Nome completo *
            <input className="auth-input" value={form.nome} maxLength={120} onChange={(e) => mudar('nome', e.target.value.replace(/[0-9]/g, ''))} />
          </label>
          <label>Nome social
            <input className="auth-input" value={form.nomeSocial} maxLength={120} placeholder="Como você prefere ser chamado(a)" onChange={(e) => mudar('nomeSocial', e.target.value.replace(/[0-9]/g, ''))} />
            <small>Se preencher, é o nome que aparece no perfil, na carteirinha e para os hospitais.</small>
          </label>
          <label>Gênero
            <select className="auth-input" value={form.genero} onChange={(e) => mudar('genero', e.target.value)}>
              <option value="">Não informar</option>
              {GENEROS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>📋 Dados pessoais</legend>
          <label>Data de nascimento
            <input className="auth-input" type="date" max={hojeISO()} value={form.dataNascimento} onChange={(e) => mudar('dataNascimento', e.target.value)} />
          </label>
          <label>Telefone / WhatsApp
            <input className="auth-input" inputMode="numeric" placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => mudar('telefone', mascaraTelefone(e.target.value))} />
          </label>
          <div className="mp-linha">
            <label className="mp-grande">Cidade *
              <input className="auth-input" value={form.cidade} maxLength={100} onChange={(e) => mudar('cidade', e.target.value)} />
            </label>
            <label>Estado
              <select className="auth-input" value={form.estado} onChange={(e) => mudar('estado', e.target.value)}>
                <option value="">—</option>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label>Peso (kg)
            <input className="auth-input" type="number" min="20" max="300" value={form.pesoKg} onChange={(e) => mudar('pesoKg', e.target.value)} />
            <small>Opcional. Quem doa precisa ter mais de 50 kg.</small>
          </label>
          <div className="mp-cpf">
            <span>CPF</span>
            {alterandoCpf ? (
              <>
                <input className="auth-input" inputMode="numeric" placeholder="000.000.000-00" value={novoCpf} onChange={(e) => setNovoCpf(mascaraCpf(e.target.value))} />
                <button type="button" className="mp-link" onClick={() => { setAlterandoCpf(false); setNovoCpf(''); }}>Cancelar</button>
              </>
            ) : (
              <>
                <strong>{dados.cpfMascarado || 'Não informado'}</strong>
                <button type="button" className="mp-link" onClick={() => setAlterandoCpf(true)}>{dados.temCpf ? 'Alterar' : 'Informar'}</button>
              </>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>🩸 Para doar</legend>
          <label>Tipo sanguíneo *
            <select className="auth-input" value={form.tipoSanguineo} onChange={(e) => mudar('tipoSanguineo', e.target.value)}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value={RH_NULO}>🌟 {RH_NULO}</option>
            </select>
          </label>
          <label>Sexo para o intervalo entre doações *
            <select className="auth-input" value={form.sexo} onChange={(e) => mudar('sexo', e.target.value)}>
              <option value="F">Feminino (intervalo de 90 dias)</option>
              <option value="M">Masculino (intervalo de 60 dias)</option>
            </select>
            <small>Usado só para calcular quando você pode doar de novo. Quem decide a sua aptidão é sempre o hemocentro.</small>
          </label>
        </fieldset>

        <fieldset>
          <legend>🔒 Privacidade</legend>
          <div className="privacidade-opcoes">
            <label className={'priv-opcao' + (!identificado ? ' priv-ativa' : '')}>
              <input type="radio" name="vis" checked={!identificado} onChange={() => mudar('visibilidade', 'anonimo')} />
              <div><strong>🔒 Anônimo</strong><span>Você ajuda sem que hospitais vejam seu nome ou contato.</span></div>
            </label>
            <label className={'priv-opcao' + (identificado ? ' priv-ativa' : '')}>
              <input type="radio" name="vis" checked={identificado} onChange={() => mudar('visibilidade', 'identificado')} />
              <div><strong>👋 Identificado</strong><span>Autorizo hospitais compatíveis a verem meu nome e telefone para me chamar.</span></div>
            </label>
          </div>
          <div className="mp-visao" aria-live="polite">
            <h3>👁️ Como o hospital te vê agora</h3>
            <ul>
              <li><span>Nome</span><strong>{nomeVisto}</strong></li>
              <li><span>Telefone</span><strong>{telefoneVisto}</strong></li>
              <li><span>Tipo sanguíneo</span><strong>{form.tipoSanguineo}</strong></li>
              <li><span>Cidade</span><strong>{form.cidade || '—'}</strong></li>
            </ul>
            <p className="mp-nunca"><b>Nunca vistos por hospitais:</b> {dados.visaoDoHospital.naoVe.join(', ')}.</p>
            {identificado && !form.telefone && <p className="campo-aviso">Informe um telefone para aparecer aos hospitais.</p>}
          </div>
        </fieldset>

        <fieldset>
          <legend>🚑 Contato de emergência</legend>
          <p className="mp-dica">Opcional. Aparece só na sua carteirinha, que fica no seu aparelho. Nenhum hospital vê.</p>
          <div className="mp-linha">
            <label className="mp-grande">Nome
              <input className="auth-input" value={form.contatoEmergenciaNome} maxLength={120} onChange={(e) => mudar('contatoEmergenciaNome', e.target.value.replace(/[0-9]/g, ''))} />
            </label>
            <label>Telefone
              <input className="auth-input" inputMode="numeric" placeholder="(00) 00000-0000" value={form.contatoEmergenciaTelefone} onChange={(e) => mudar('contatoEmergenciaTelefone', mascaraTelefone(e.target.value))} />
            </label>
          </div>
        </fieldset>

        <div className="mp-salvar">
          <button type="submit" className="auth-botao" disabled={salvando}>Salvar alterações</button>
          {mensagem && <div className="auth-msg" role="status">{mensagem}</div>}
        </div>
      </form>

      <RedeRara />

      <section className="mp-bloco">
        <h2>🪪 Minha carteirinha de doador</h2>
        <p className="mp-dica">Cartão com sua foto, tipo sanguíneo e nível, para guardar no celular. Ele se atualiza com o que você preenche acima.</p>
        <Carteirinha perfil={cartao} />
      </section>

      <section className="mp-bloco mp-lgpd">
        <h2>🛡️ Meus dados (LGPD)</h2>
        <p>Os dados são seus. Você pode levar uma cópia ou apagar tudo quando quiser.</p>
        <div className="mp-lgpd-acoes">
          <button type="button" className="conq-btn conq-btn-vazado" onClick={baixarDados}>⬇️ Baixar meus dados</button>
          <button type="button" className="conq-btn conq-btn-vazado mp-perigo" onClick={() => { setExcluindo(!excluindo); setAvisoLgpd(''); }}>🗑️ Excluir minha conta</button>
        </div>
        {excluindo && (
          <div className="mp-excluir">
            <p>
              Seu nome, CPF, telefone, foto e demais dados pessoais serão <strong>apagados</strong> e você não poderá mais entrar.
              As doações já confirmadas ficam no registro de auditoria <strong>sem nenhum dado seu</strong>, porque não podem ser alteradas.
              Isso não pode ser desfeito.
            </p>
            <label>Digite sua senha para confirmar
              <input className="auth-input" type="password" autoComplete="current-password" value={senhaExcluir} onChange={(e) => setSenhaExcluir(e.target.value)} />
            </label>
            <label className="apad-autoriza">
              <input type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.target.checked)} />
              Entendo que a exclusão é definitiva.
            </label>
            <button type="button" className="conq-btn mp-perigo-cheio" disabled={!entendi || !senhaExcluir} onClick={excluirConta}>Excluir definitivamente</button>
          </div>
        )}
        {avisoLgpd && <p className="conq-copia" role="status">{avisoLgpd}</p>}
      </section>
    </div>
  );
}

export default MeuPerfil;
