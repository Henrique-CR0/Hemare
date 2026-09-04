// Hemare - Completar perfil do doador: tipo sanguineo, genero, cidade, nome social e CPF.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

const TIPOS_COMUNS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const RH_NULL = 'Rh nulo (sangue dourado)';

// Valida CPF (algoritmo oficial dos digitos verificadores).
function cpfValido(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let d1 = (soma * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let d2 = (soma * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

// Aplica a mascara 000.000.000-00 enquanto digita.
function mascaraCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function CompletarPerfil() {
  const navegar = useNavigate();
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [sexo, setSexo] = useState('');
  const [cidade, setCidade] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfTocado, setCpfTocado] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const cpfOk = cpf === '' || cpfValido(cpf); // vazio e permitido (opcional-ish)
  const mostrarCpfErro = cpfTocado && cpf !== '' && !cpfValido(cpf);

  async function salvarPerfil() {
    if (!tipoSanguineo || !sexo || !cidade) {
      setMensagem('❌ Preencha tipo sanguíneo, gênero e cidade.');
      return;
    }
        if (!cpf) {
      setMensagem('❌ Informe seu CPF.');
      return;
    }
    if (!cpfValido(cpf)) {
      setMensagem('❌ O CPF informado não é válido.');
      return;
    }
    setMensagem('Salvando...');
    try {
      const token = localStorage.getItem('hemare_token');
      const resposta = await fetch(URL_BACKEND + '/doador/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ tipoSanguineo, sexo, cidade, nomeSocial, cpf })
      });
      const dados = await resposta.json();
      if (resposta.ok) {
        setMensagem('✅ ' + dados.mensagem);
        setTimeout(() => navegar('/area-doador'), 1200);
      } else {
        setMensagem('❌ ' + dados.erro);
      }
    } catch (erro) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card perfil-card">
        <div className="auth-gota">🩸</div>
        <h1 className="auth-titulo">Complete seu perfil</h1>
        <p className="auth-sub">Esses dados ajudam a te conectar a quem precisa.</p>

        <div className="auth-form">
          {/* Tipo sanguineo */}
          <label className="perfil-label">Tipo sanguíneo *</label>
          <select className="auth-input" value={tipoSanguineo} onChange={(e) => setTipoSanguineo(e.target.value)}>
            <option value="">Selecione...</option>
            {TIPOS_COMUNS.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value={RH_NULL}>🌟 Rh nulo (sangue dourado) — raríssimo</option>
          </select>
          {tipoSanguineo === RH_NULL && (
            <div className="hemare-destaque-ouro">
              🌟 Sangue dourado! É o tipo mais raro do mundo. Nosso time dará atenção especial ao seu cadastro.
            </div>
          )}

          {/* Genero */}
          <label className="perfil-label">Gênero *</label>
          <select className="auth-input" value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Selecione...</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>

          {/* Cidade */}
          <label className="perfil-label">Cidade *</label>
          <input className="auth-input" type="text" placeholder="Sua cidade"
            value={cidade} onChange={(e) => setCidade(e.target.value)} />

          {/* Nome social (opcional) */}
          <label className="perfil-label">Nome social (opcional)</label>
          <input className="auth-input" type="text" placeholder="Como você prefere ser chamado(a)"
            value={nomeSocial} onChange={(e) => setNomeSocial(e.target.value)} />

          {/* CPF (opcional, com validacao) */}
          <label className="perfil-label">CPF *</label>
          <input
            className={'auth-input' + (mostrarCpfErro ? ' campo-erro' : '')}
            type="text" inputMode="numeric" placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(mascaraCpf(e.target.value))}
            onBlur={() => setCpfTocado(true)} />
          {mostrarCpfErro && <p className="campo-aviso">CPF inválido confira os números.</p>}

          <button className="auth-botao" onClick={salvarPerfil}>Salvar perfil</button>
        </div>

        {mensagem && <div className="auth-msg">{mensagem}</div>}
      </div>
    </div>
  );
}

export default CompletarPerfil;