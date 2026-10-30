// Hemare - Leitor de Markdown minimo, so para mostrar os relatorios em docs/ dentro do site (ex.: docs/STATUS.md).
// Nao devolve HTML: devolve uma arvore de blocos e trechos que o React desenha. Assim nada do texto vira codigo da pagina
// (sem dangerouslySetInnerHTML) e nenhum link "javascript:" vira link.
//
// Entende: titulos (#), paragrafos, citacao (>), listas (- e 1.), tabelas, linha (---), **negrito**, _italico_, `codigo` e [texto](https://link).
// Comentarios HTML (<!-- ... -->) sao ignorados.

const LINK_SEGURO = /^https?:\/\/[^\s]+$/i;

// Quebra uma linha em trechos: { tipo: 'texto' | 'negrito' | 'italico' | 'codigo' | 'link', ... }.
export function trechos(texto) {
  const saida = [];
  const padrao = /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\p{L}\p{N}])_([^_]+)_(?![\p{L}\p{N}])/gu;
  let fim = 0;
  let m;
  while ((m = padrao.exec(texto)) !== null) {
    if (m.index > fim) saida.push({ tipo: 'texto', texto: texto.slice(fim, m.index) });
    if (m[1] !== undefined) saida.push({ tipo: 'codigo', texto: m[1] });
    else if (m[2] !== undefined) saida.push({ tipo: 'negrito', filhos: trechos(m[2]) });
    else if (m[3] !== undefined) {
      if (LINK_SEGURO.test(m[4])) saida.push({ tipo: 'link', url: m[4], filhos: trechos(m[3]) });
      else saida.push({ tipo: 'texto', texto: m[3] });
    } else saida.push({ tipo: 'italico', filhos: trechos(m[5]) });
    fim = padrao.lastIndex;
  }
  if (fim < texto.length) saida.push({ tipo: 'texto', texto: texto.slice(fim) });
  return saida;
}

function celulas(linha) {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

const ehLinhaDeTabela = (l) => /^\s*\|.*\|\s*$/.test(l);
const ehSeparador = (l) => ehLinhaDeTabela(l) && celulas(l).every((c) => /^:?-+:?$/.test(c));

// Texto Markdown -> lista de blocos.
export function blocos(markdown) {
  const linhas = String(markdown || '').replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '').split('\n');
  const saida = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }

    const titulo = /^(#{1,4})\s+(.+)$/.exec(l);
    if (titulo) { saida.push({ tipo: 'titulo', nivel: titulo[1].length, filhos: trechos(titulo[2]) }); i++; continue; }

    if (/^\s*---+\s*$/.test(l)) { saida.push({ tipo: 'linha' }); i++; continue; }

    if (/^>\s?/.test(l)) {
      const partes = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) { partes.push(linhas[i].replace(/^>\s?/, '')); i++; }
      saida.push({ tipo: 'citacao', filhos: trechos(partes.join(' ').trim()) });
      continue;
    }

    if (ehLinhaDeTabela(l) && i + 1 < linhas.length && ehSeparador(linhas[i + 1])) {
      const cabecalho = celulas(l).map(trechos);
      i += 2;
      const corpo = [];
      while (i < linhas.length && ehLinhaDeTabela(linhas[i])) { corpo.push(celulas(linhas[i]).map(trechos)); i++; }
      saida.push({ tipo: 'tabela', cabecalho, linhas: corpo });
      continue;
    }

    const marcador = /^\s*(?:([-*])|(\d+)\.)\s+(.+)$/.exec(l);
    if (marcador) {
      const ordenada = marcador[2] !== undefined;
      const itens = [];
      while (i < linhas.length) {
        const m = /^\s*(?:([-*])|(\d+)\.)\s+(.+)$/.exec(linhas[i]);
        if (!m || (m[2] !== undefined) !== ordenada) break;
        itens.push(trechos(m[3]));
        i++;
      }
      saida.push({ tipo: 'lista', ordenada, itens });
      continue;
    }

    // Paragrafo: junta as linhas seguidas ate uma linha em branco ou outro bloco.
    const partes = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|>|\s*---+\s*$)/.test(linhas[i]) && !(ehLinhaDeTabela(linhas[i]) && ehSeparador(linhas[i + 1] || '')) && !/^\s*(?:[-*]|\d+\.)\s+/.test(linhas[i])) {
      partes.push(linhas[i].trim());
      i++;
    }
    if (partes.length === 0) { i++; continue; }
    saida.push({ tipo: 'paragrafo', filhos: trechos(partes.join(' ')) });
  }
  return saida;
}
