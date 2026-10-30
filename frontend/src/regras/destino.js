// Hemare - Para onde voltar depois de entrar ou se cadastrar.
// Quem tenta abrir uma tela que exige conta (ex.: "Posso doar?") e levado ao login/cadastro com ?destino=/triagem e, depois
// de entrar, volta para onde queria ir. O destino vem da barra de endereco (qualquer um pode escrever qualquer coisa ali),
// entao so vale um CAMINHO DO PROPRIO SITE: nada de https://outro-site, //outro-site ou javascript:.

export function destinoSeguro(valor, padrao) {
  if (typeof valor !== 'string') return padrao;
  const texto = valor.trim();
  if (texto.length === 0 || texto.length > 200) return padrao;
  if (!texto.startsWith('/') || texto.startsWith('//') || texto.includes('\\') || /[\u0000-\u001f]/.test(texto)) return padrao;
  // Telas de entrada nao servem de destino (voltaria para o login sem sair do lugar).
  if (/^\/(login|cadastro|cadastro-hospital|recuperar-senha)(\/|\?|$)/.test(texto)) return padrao;
  return texto;
}

// Monta o endereco do login/cadastro que lembra para onde voltar.
export function comDestino(caminho, destino) {
  const seguro = destinoSeguro(destino, null);
  return seguro ? caminho + '?destino=' + encodeURIComponent(seguro) : caminho;
}
