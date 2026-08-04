// Hemare - Pagina do diretorio de locais de doacao (com busca por cidade/estado).
import { useState, useEffect } from 'react';

const URL_BACKEND = 'https://expert-waddle-7vwq77rg5ppp3pq67-3000.app.github.dev';

function Locais() {
  const [locais, setLocais] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Busca os locais no backend. Se vier um termo, filtra por cidade/estado.
  function buscarLocais(termo) {
    setCarregando(true);
    const url = termo
      ? URL_BACKEND + '/locais?cidade=' + encodeURIComponent(termo)
      : URL_BACKEND + '/locais';

    fetch(url)
      .then((r) => r.json())
      .then((dados) => { setLocais(dados); setCarregando(false); })
      .catch(() => setCarregando(false));
  }

  // Quando a pagina abre, carrega todos os locais.
  useEffect(() => {
    buscarLocais('');
  }, []);

  return (
    <div className="locais">
      <h1>Onde doar 🩸</h1>
      <p className="locais-sub">Encontre um hemocentro perto de você. Busque pela cidade ou estado.</p>

      <div className="locais-busca">
        <input
          className="locais-input"
          type="text"
          placeholder="Digite sua cidade ou estado (ex: Recife, PE)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="botao-principal" onClick={() => buscarLocais(busca)}>Buscar</button>
      </div>

      {carregando ? (
        <p className="locais-info">Carregando...</p>
      ) : locais.length === 0 ? (
        <p className="locais-info">Nenhum local encontrado para essa busca.</p>
      ) : (
        <div className="locais-lista">
          {locais.map((local) => (
            <div key={local.id} className="local-card">
              <div className="local-cabecalho">
                <h3>{local.nome}</h3>
                <span className="local-uf">{local.estado}</span>
              </div>
              <p className="local-cidade">📍 {local.cidade}</p>
              {local.endereco && <p className="local-endereco">{local.endereco}</p>}
              {local.telefone && <p className="local-telefone">📞 {local.telefone}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Locais;