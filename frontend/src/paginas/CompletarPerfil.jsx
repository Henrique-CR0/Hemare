// Hemare - Tela para o doador completar o perfil (apos o login).
import { useState } from 'react';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

// Os 8 tipos comuns + o Rh-null (sangue dourado), tratado a parte.
const TIPOS_COMUNS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const RH_NULL = 'Rh nulo (sangue dourado)';

function CompletarPerfil() {
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [sexo, setSexo] = useState('');
  const [cidade, setCidade] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function salvarPerfil() {
    if (!tipoSanguineo || !sexo || !cidade) {
      setMensagem('❌ Preencha todos os campos.');
      return;
    }

    setMensagem('Salvando...');
    try {
      // Pega o token guardado no login para provar quem somos.
      const token = localStorage.getItem('hemare_token');

      const resposta = await fetch(URL_BACKEND + '/doador/perfil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ tipoSanguineo: tipoSanguineo, sexo: sexo, cidade: cidade })
      });
      const dados = await resposta.json();

      if (resposta.ok) {
        setMensagem('✅ ' + dados.mensagem);
      } else {
        setMensagem('❌ ' + dados.erro);
      }
    } catch (erro) {
      setMensagem('❌ Nao consegui falar com o servidor.');
    }
  }

  return (
    <div className="hemare-tela">
      <h1 className="hemare-logo">🩸 Hemare</h1>
      <p className="hemare-sub">Complete seu perfil de doador</p>

      <div className="hemare-form">
        {/* Seletor de tipo sanguineo, com o Rh-null em destaque */}
        <select className="hemare-input" value={tipoSanguineo}
          onChange={(e) => setTipoSanguineo(e.target.value)}>
          <option value="">Tipo sanguíneo...</option>
          {TIPOS_COMUNS.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
          <option value={RH_NULL}>Rh nulo (sangue dourado) — raríssimo</option>
        </select>

        {/* Aviso especial se escolher o sangue dourado */}
        {tipoSanguineo === RH_NULL && (
          <div className="hemare-destaque-ouro">
            Sangue dourado! É o tipo mais raro do mundo e um doador valiosíssimo.
            Nosso time dará atenção especial ao seu cadastro.
          </div>
        )}

        <select className="hemare-input" value={sexo}
          onChange={(e) => setSexo(e.target.value)}>
          <option value="">Sexo...</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>

        <input className="hemare-input" type="text" placeholder="Cidade"
          value={cidade} onChange={(e) => setCidade(e.target.value)} />

        <button className="hemare-botao" onClick={salvarPerfil}>Salvar perfil</button>
      </div>

      {mensagem && <div className="hemare-status">{mensagem}</div>}
    </div>
  );
}

export default CompletarPerfil;