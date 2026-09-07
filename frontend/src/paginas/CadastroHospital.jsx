// Hemare - Cadastro de hospital: CNPJ, CNES, endereco completo (com busca por CEP).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// Valida CNPJ (algoritmo oficial dos digitos verificadores).
function cnpjValido(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base) => {
    let soma = 0, pos = base - 7;
    for (let i = base; i >= 1; i--) {
      soma += Number(cnpj[base - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

function mascaraCnpj(v) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
function mascaraCep(v) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

function CadastroHospital() {
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnes, setCnes] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Busca o endereco pelo CEP (ViaCEP) quando sai do campo.
  async function buscarCep() {
    const so = cep.replace(/\D/g, '');
    if (so.length !== 8) return;
    try {
      const r = await fetch('https://viacep.com.br/ws/' + so + '/json/');
      const d = await r.json();
      if (!d.erro) {
        setEndereco(d.logradouro || '');
        setBairro(d.bairro || '');
        setCidade(d.localidade || '');
        setEstado(d.uf || '');
      }
    } catch (e) { /* silencioso */ }
  }

  async function cadastrar() {
    if (!nome || !cnpj || !cnes || !email || !senha || !cep || !endereco || !numero || !bairro || !cidade || !estado) {
      setMensagem('❌ Preencha todos os campos obrigatórios.');
      return;
    }
    if (!cnpjValido(cnpj)) {
      setMensagem('❌ CNPJ inválido.');
      return;
    }
    if (senha.length < 8) {
      setMensagem('❌ A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setMensagem('Cadastrando...');
    try {
      const rCad = await fetch(URL_BACKEND + '/auth/cadastro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, tipo: 'hospital' })
      });
      const dCad = await rCad.json();
      if (!rCad.ok) { setMensagem('❌ ' + dCad.erro); return; }

      const rLog = await fetch(URL_BACKEND + '/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const dLog = await rLog.json();

      await fetch(URL_BACKEND + '/hospital/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + dLog.token },
        body: JSON.stringify({ cnpj, cnes, cep, endereco, numero, bairro, complemento, cidade, estado })
      });

      localStorage.setItem('hemare_token', dLog.token);
      localStorage.setItem('hemare_usuario', JSON.stringify(dLog.usuario));
      setMensagem('✅ Hospital cadastrado! Redirecionando...');
      setTimeout(() => navegar('/painel-hospital'), 1500);
    } catch (e) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card perfil-card">
        <div className="auth-gota">🏥</div>
        <h1 className="auth-titulo">Cadastrar hospital</h1>
        <p className="auth-sub">Cadastre sua instituição e encontre doadores.</p>

        <div className="auth-form">
          <label className="perfil-label">Nome do hospital *</label>
          <input className="auth-input" type="text" placeholder="Nome da instituição"
            value={nome} onChange={(e) => setNome(e.target.value)} />

          <label className="perfil-label">CNPJ *</label>
          <input className="auth-input" type="text" inputMode="numeric" placeholder="00.000.000/0000-00"
            value={cnpj} onChange={(e) => setCnpj(mascaraCnpj(e.target.value))} />

          <label className="perfil-label">CNES *</label>
          <input className="auth-input" type="text" inputMode="numeric" placeholder="Número do CNES"
            value={cnes} onChange={(e) => setCnes(e.target.value.replace(/\D/g, '').slice(0, 7))} />

          <label className="perfil-label">Email *</label>
          <input className="auth-input" type="email" placeholder="Email institucional"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="perfil-label">Senha *</label>
          <input className="auth-input" type="password" placeholder="Senha (mín. 8 caracteres)"
            value={senha} onChange={(e) => setSenha(e.target.value)} />

          <label className="perfil-label">CEP *</label>
          <input className="auth-input" type="text" inputMode="numeric" placeholder="00000-000"
            value={cep} onChange={(e) => setCep(mascaraCep(e.target.value))} onBlur={buscarCep} />

          <label className="perfil-label">Endereço (rua) *</label>
          <input className="auth-input" type="text" placeholder="Logradouro"
            value={endereco} onChange={(e) => setEndereco(e.target.value)} />

          <label className="perfil-label">Número *</label>
          <input className="auth-input" type="text" placeholder="Número"
            value={numero} onChange={(e) => setNumero(e.target.value)} />

          <label className="perfil-label">Bairro *</label>
          <input className="auth-input" type="text" placeholder="Bairro"
            value={bairro} onChange={(e) => setBairro(e.target.value)} />

          <label className="perfil-label">Complemento (opcional)</label>
          <input className="auth-input" type="text" placeholder="Sala, bloco, etc."
            value={complemento} onChange={(e) => setComplemento(e.target.value)} />

          <label className="perfil-label">Cidade *</label>
          <input className="auth-input" type="text" placeholder="Cidade"
            value={cidade} onChange={(e) => setCidade(e.target.value)} />

          <label className="perfil-label">Estado (UF) *</label>
          <select className="auth-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Selecione...</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>

          <button className="auth-botao" onClick={cadastrar}>Cadastrar hospital</button>
        </div>

        {mensagem && <div className="auth-msg">{mensagem}</div>}

        <p className="auth-troca">É doador? <Link to="/cadastro">Cadastre-se aqui</Link></p>
      </div>
    </div>
  );
}

export default CadastroHospital;