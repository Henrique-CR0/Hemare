// Hemare - Configuracao do endereco do backend (API).
// Um lugar so para todas as paginas, sem precisar editar cada arquivo.
//
// Ordem de escolha:
// 1. VITE_API_URL no arquivo frontend/.env.local (se existir), ex.: VITE_API_URL=http://localhost:3000
// 2. No Codespaces: o mesmo endereco do site, trocando a porta 5173 pela 3000
// 3. Rodando no computador: http://localhost:3000

function descobrirUrlBackend() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const { protocol, hostname } = window.location;

  // No Codespaces o site fica em https://<nome>-5173.app.github.dev
  // e o backend em https://<nome>-3000.app.github.dev
  if (hostname.endsWith('.app.github.dev')) {
    return protocol + '//' + hostname.replace('-5173.', '-3000.');
  }

  return 'http://localhost:3000';
}

export const URL_BACKEND = descobrirUrlBackend();
