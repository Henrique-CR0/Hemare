// Hemare - Para onde cada tipo de conta vai ao entrar ou clicar em "Minha area".
export function rotaInicial(usuario) {
  if (usuario && usuario.tipo === 'admin') return '/admin';
  if (usuario && usuario.tipo === 'hospital') return '/painel-hospital';
  return '/area-doador';
}
