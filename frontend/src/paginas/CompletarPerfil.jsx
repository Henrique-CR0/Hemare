// Hemare - Completar perfil do doador: dados + telefone + escolha de privacidade + Enter funcionando.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { URL_BACKEND } from '../config';
const TIPOS_COMUNS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const RH_NULL = 'Rh nulo (sangue dourado)';

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
function mascaraCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function mascaraTel(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function CompletarPerfil() {
  const navegar = useNavigate();
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [sexo, setSexo] = useState('');
  const [cidade, setCidade] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [visibilidade, setVisibilidade] = useState('anonimo');
  const [cpfTocado, setCpfTocado] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const mostrarCpfErro = cpfTocado && cpf !== '' && !cpfValido(cpf);

  async function salvarPerfil() {
    if (!tipoSanguineo || !sexo || !cidade) {
      setMensagem('❌ Preencha tipo sanguíneo, gênero e cidade.'); return;
    }
    if (!cpf || !cpfValido(cpf)) {
      setMensagem('❌ Informe um CPF válido.'); return;
    }
    if (visibilidade === 'identificado' && !telefone) {
      setMensagem('❌ Para aparecer aos hospitais, informe um telefone de contato.'); return;
    }
    setMensagem('Salvando...');
    try {
      const token = localStorage.getItem('hemare_token');
      const resposta = await fetch(URL_BACKEND + '/doador/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ tipoSanguineo, sexo, cidade, nomeSocial, cpf, telefone, visibilidade })
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

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); salvarPerfil(); }}>
          <label className="perfil-label">Tipo sanguíneo *</label>
          <select className="auth-input" value={tipoSanguineo} onChange={(e) => setTipoSanguineo(e.target.value)}>
            <option value="">Selecione...</option>
            {TIPOS_COMUNS.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value={RH_NULL}>🌟 Rh nulo (sangue dourado) — raríssimo</option>
          </select>
          {tipoSanguineo === RH_NULL && (
            <div className="hemare-destaque-ouro">
              🌟 Sangue dourado! É o tipo mais raro do mundo. Nosso time dará atenção especial.
            </div>
          )}

          <label className="perfil-label">Gênero *</label>
          <select className="auth-input" value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Selecione...</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>

          <label className="perfil-label">Cidade *</label>
          <input className="auth-input" type="text" placeholder="Sua cidade"
            value={cidade} onChange={(e) => setCidade(e.target.value)} />

          <label className="perfil-label">Nome social (opcional)</label>
          <input className="auth-input" type="text" placeholder="Como você prefere ser chamado(a)"
            value={nomeSocial} onChange={(e) => setNomeSocial(e.target.value)} />

          <label className="perfil-label">CPF *</label>
          <input className={'auth-input' + (mostrarCpfErro ? ' campo-erro' : '')}
            type="text" inputMode="numeric" placeholder="000.000.000-00"
            value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))}
            onBlur={() => setCpfTocado(true)} />
          {mostrarCpfErro && <p className="campo-aviso">CPF inválido — confira os números.</p>}

          <label className="perfil-label">Telefone / WhatsApp</label>
          <input className="auth-input" type="text" inputMode="numeric" placeholder="(00) 00000-0000"
            value={telefone} onChange={(e) => setTelefone(mascaraTel(e.target.value))} />

          <label className="perfil-label">Privacidade *</label>
          <div className="privacidade-opcoes">
            <label className={'priv-opcao' + (visibilidade === 'anonimo' ? ' priv-ativa' : '')}>
              <input type="radio" name="vis" checked={visibilidade === 'anonimo'}
                onChange={() => setVisibilidade('anonimo')} />
              <div>
                <strong>🔒 Anônimo</strong>
                <span>Você ajuda sem que hospitais vejam seu nome ou contato.</span>
              </div>
            </label>
            <label className={'priv-opcao' + (visibilidade === 'identificado' ? ' priv-ativa' : '')}>
              <input type="radio" name="vis" checked={visibilidade === 'identificado'}
                onChange={() => setVisibilidade('identificado')} />
              <div>
                <strong>👋 Identificado</strong>
                <span>Autorizo hospitais compatíveis a verem meu nome e contato para me convocar.</span>
              </div>
            </label>
          </div>

          <button type="submit" className="auth-botao">Salvar perfil</button>
        </form>

        {mensagem && <div className="auth-msg">{mensagem}</div>}
      </div>
    </div>
  );
}

export default CompletarPerfil;