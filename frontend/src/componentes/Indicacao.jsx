// Hemare - "Traga um amigo": link de convite do doador e quantos amigos ja vieram.
import { useState, useEffect } from 'react';
import { URL_BACKEND } from '../config';

function Indicacao() {
  const [dados, setDados] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let ativo = true;
    fetch(URL_BACKEND + '/doador/indicacao', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('hemare_token') }
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => ativo && setDados(d))
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  // Se nao carregou (ex.: conta de hospital), nao mostra nada.
  if (!dados) return null;

  const link = window.location.origin + '/cadastro?ref=' + dados.codigo;
  const texto = 'Doar sangue pode salvar até 4 vidas 🩸 Crie sua conta no Hemare pelo meu convite e veja se você pode doar: ' + link;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setAviso('Link copiado! Envie para um amigo.');
    } catch {
      setAviso('Não foi possível copiar. Use o botão do WhatsApp.');
    }
  }

  return (
    <section className="amigo" aria-labelledby="amigo-titulo">
      <h2 id="amigo-titulo" className="amigo-titulo">🤝 Traga um amigo</h2>
      <p className="amigo-sub">
        Muita gente doa uma vez só e não volta. Convide alguém: quando o seu amigo fizer a primeira doação confirmada,
        você ganha o emblema <strong>Recrutador</strong> (e <strong>Multiplicador</strong> com três amigos).
      </p>

      <div className="amigo-link">
        <input readOnly value={link} aria-label="Seu link de convite" onFocus={(e) => e.target.select()} />
        <button type="button" className="conq-btn" onClick={copiar}>📋 Copiar</button>
        <a className="conq-btn conq-btn-whats" target="_blank" rel="noopener noreferrer"
           href={'https://wa.me/?text=' + encodeURIComponent(texto)}>💬 WhatsApp</a>
      </div>
      {aviso && <p className="conq-copia" role="status">{aviso}</p>}

      <div className="amigo-numeros">
        <div><strong>{dados.amigosCadastrados}</strong><span>{dados.amigosCadastrados === 1 ? 'amigo criou conta' : 'amigos criaram conta'}</span></div>
        <div><strong>{dados.amigosQueDoaram}</strong><span>{dados.amigosQueDoaram === 1 ? 'amigo já doou' : 'amigos já doaram'}</span></div>
      </div>
    </section>
  );
}

export default Indicacao;
