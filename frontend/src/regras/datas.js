// Hemare - Textos de datas e horas das telas de agendamento (so apresentacao; as regras ficam no backend).
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// '2026-10-09' -> 'sex 09/10'
export function formatarData(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()] + ' ' + String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0');
}

// 'AAAA-MM-DD' de hoje no Brasil (UTC-3), igual ao backend.
export function hojeNoBrasil() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

// ['08:00', '08:30', ...] entre o primeiro e o ultimo horario, de X em X minutos (no maximo 24).
export function gerarHorarios(primeiro, ultimo, minutos) {
  const [h1, m1] = (primeiro || '').split(':').map(Number);
  const [h2, m2] = (ultimo || '').split(':').map(Number);
  const passo = Number(minutos);
  if (Number.isNaN(h1) || Number.isNaN(h2) || !passo || passo < 5) return [];
  const lista = [];
  for (let t = h1 * 60 + m1; t <= h2 * 60 + m2 && lista.length < 24; t += passo) {
    lista.push(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'));
  }
  return lista;
}

export const NOMES_STATUS = { agendado: 'Agendado', compareceu: 'Compareceu', faltou: 'Faltou', cancelado: 'Cancelado' };
export const ICONES_STATUS = { agendado: '📅', compareceu: '🩸', faltou: '⚠️', cancelado: '✖️' };
