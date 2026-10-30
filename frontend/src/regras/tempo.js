// Hemare - Textos de tempo e identidade visual das fontes de noticias ("há 2 horas", iniciais coloridas).
// Sem dependencias do React: o teste do backend importa este arquivo direto.

// "há 5 min", "há 2 horas", "há 1 dia"... `agora` e injetavel para os testes.
export function haQuanto(iso, agora = Date.now()) {
  const ms = agora - Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return 'há ' + min + ' min';
  const horas = Math.floor(min / 60);
  if (horas < 24) return 'há ' + horas + (horas === 1 ? ' hora' : ' horas');
  const dias = Math.floor(horas / 24);
  if (dias < 7) return 'há ' + dias + (dias === 1 ? ' dia' : ' dias');
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return 'há ' + semanas + (semanas === 1 ? ' semana' : ' semanas');
  }
  return new Date(Date.parse(iso)).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Duas letras para o "logo" da fonte: "Agência Brasil" -> "AB", "g1" -> "G".
export function iniciais(nome) {
  const palavras = String(nome || '').split(/\s+/).filter((p) => /^\p{L}/u.test(p) && !/^(de|da|do|das|dos|e)$/i.test(p));
  const letras = palavras.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  return letras || '?';
}

// A mesma fonte tem sempre a mesma cor (escura o bastante para o texto branco passar no contraste).
export function corDaFonte(nome) {
  let h = 0;
  for (const c of String(nome || '')) h = (h * 31 + c.codePointAt(0)) % 360;
  return 'hsl(' + h + ', 55%, 32%)';
}
