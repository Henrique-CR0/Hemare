// Hemare - Mapa com marcadores estilo "pino + gota de sangue".
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Desenha um pino de localizacao com um circulo branco e uma gota de sangue (com cruz) dentro.
function pinoGota(corPino, corGota) {
  const svg = `
    <svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
      <!-- corpo do pino -->
      <path d="M17 1 C8.2 1 1 8.2 1 17 C1 28 17 45 17 45 C17 45 33 28 33 17 C33 8.2 25.8 1 17 1 Z"
            fill="${corPino}" stroke="rgba(0,0,0,0.15)" stroke-width="0.8"/>
      <!-- circulo branco -->
      <circle cx="17" cy="16.5" r="11" fill="#ffffff"/>
      <!-- gota de sangue -->
      <path d="M17 7 C17 7 10.5 15 10.5 19.2 a6.5 6.5 0 0 0 13 0 C23.5 15 17 7 17 7 Z"
            fill="${corGota}"/>
      <!-- cruz branca dentro da gota -->
      <rect x="16.1" y="16" width="1.8" height="6" rx="0.6" fill="#ffffff"/>
      <rect x="14" y="18.1" width="6" height="1.8" rx="0.6" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    className: 'pino-icon',
    html: svg,
    iconSize: [34, 46],
    iconAnchor: [17, 45],   // a ponta do pino fica no ponto exato
    popupAnchor: [0, -40]
  });
}

// Hemocentros: pino vermelho. "Voce esta aqui": pino dourado.
const iconeLocal = pinoGota('#e8112d', '#c00020');
const iconeVoce = pinoGota('#f5b400', '#c00020');

function MapaLocais({ locais, centro }) {
  const posInicial = centro ? [centro.lat, centro.lng] : [-14.2, -51.9];
  const zoom = centro ? 10 : 4;

  return (
    <div className="mapa-caixa">
      <MapContainer center={posInicial} zoom={zoom} style={{ height: '360px', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {centro && (
          <Marker position={[centro.lat, centro.lng]} icon={iconeVoce}>
            <Popup>Você está aqui 📍</Popup>
          </Marker>
        )}

        {locais.filter((l) => l.latitude && l.longitude).map((l) => (
          <Marker key={l.id} position={[Number(l.latitude), Number(l.longitude)]} icon={iconeLocal}>
            <Popup>
              <strong>{l.nome}</strong><br />
              {l.cidade} - {l.estado}<br />
              {l.telefone}
              {l.distancia !== undefined && <><br />🚗 ~{l.distancia} km de você</>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapaLocais;