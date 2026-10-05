// Hemare - Diretorio de locais: busca por cidade, proximidade (GPS) e mapa visual.
import { useState, useEffect } from 'react';
import { calcularDistancia } from '../regras/distancia';
import MapaLocais from '../componentes/MapaLocais';

import { URL_BACKEND } from '../config';

function Locais() {
  const [locais, setLocais] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [minhaPos, setMinhaPos] = useState(null);
  const [avisoGps, setAvisoGps] = useState('');

  function buscarLocais(termo) {
    setCarregando(true);
    const url = termo
      ? URL_BACKEND + '/locais?cidade=' + encodeURIComponent(termo)
      : URL_BACKEND + '/locais';

    fetch(url)
      .then((r) => r.json())
      .then((dados) => { setLocais(Array.isArray(dados) ? dados : []); setCarregando(false); })
      .catch(() => setCarregando(false));
  }

  useEffect(() => {
    buscarLocais('');
  }, []);

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      setAvisoGps('Seu navegador não suporta geolocalização.');
      return;
    }
    setAvisoGps('Obtendo sua localização...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMinhaPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAvisoGps('');
      },
      () => {
        setAvisoGps('Não foi possível obter sua localização (permissão negada).');
      }
    );
  }

  // Calcula distancia e ordena, se tivermos a posicao do doador.
  let listaExibida = locais;
  if (minhaPos) {
    listaExibida = locais
      .filter((l) => l.latitude && l.longitude)
      .map((l) => ({
        ...l,
        distancia: calcularDistancia(minhaPos.lat, minhaPos.lng, Number(l.latitude), Number(l.longitude))
      }))
      .sort((a, b) => a.distancia - b.distancia);
  }

  return (
    <div className="locais">
      <h1>Onde doar 🩸</h1>
      <p className="locais-sub">Encontre um hemocentro perto de você. Busque pela cidade ou use sua localização.</p>

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

      <button className="botao-gps" onClick={usarMinhaLocalizacao}>📍 Usar minha localização</button>
      {avisoGps && <p className="locais-info">{avisoGps}</p>}

      {/* O MAPA */}
      {!carregando && <MapaLocais locais={listaExibida} centro={minhaPos} />}

      {carregando ? (
        <p className="locais-info">Carregando...</p>
      ) : listaExibida.length === 0 ? (
        <p className="locais-info">Nenhum local encontrado para essa busca.</p>
      ) : (
        <div className="locais-lista">
          {listaExibida.map((local) => (
            <div key={local.id} className="local-card">
              <div className="local-cabecalho">
                <h3>{local.nome}</h3>
                <span className="local-uf">{local.estado}</span>
              </div>
              <p className="local-cidade">📍 {local.cidade}</p>
              {local.endereco && <p className="local-endereco">{local.endereco}</p>}
              {local.telefone && <p className="local-telefone">📞 {local.telefone}</p>}
              {local.distancia !== undefined && (
                <p className="local-distancia">🚗 a aproximadamente {local.distancia} km de você</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Locais;