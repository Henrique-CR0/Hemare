// Hemare - Textos de datas do Calendario do sangue (so apresentacao; as regras ficam no backend).
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// '2026-10-09' -> 'sex 09/10'
export function formatarData(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()] + ' ' + String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0');
}

export function quando(p) {
  if (p.emAndamento) return 'Acontecendo agora';
  if (p.diasParaInicio === 1) return 'Começa amanhã';
  return 'Começa em ' + p.diasParaInicio + ' dias';
}
