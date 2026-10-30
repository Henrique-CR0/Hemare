// Hemare - Desenha um texto Markdown (ver regras/markdown.js). Tudo vira elemento do React: nada de HTML solto do texto.
import { blocos } from '../regras/markdown';

function Trechos({ lista }) {
  return lista.map((t, i) => {
    if (t.tipo === 'texto') return t.texto;
    if (t.tipo === 'codigo') return <code key={i}>{t.texto}</code>;
    if (t.tipo === 'negrito') return <strong key={i}><Trechos lista={t.filhos} /></strong>;
    if (t.tipo === 'italico') return <em key={i}><Trechos lista={t.filhos} /></em>;
    return <a key={i} href={t.url} target="_blank" rel="noopener noreferrer"><Trechos lista={t.filhos} /></a>;
  });
}

function Markdown({ texto }) {
  return (
    <div className="md">
      {blocos(texto).map((b, i) => {
        if (b.tipo === 'titulo') {
          const Tag = 'h' + Math.min(b.nivel + 1, 5); // o h1 da pagina e o titulo da tela
          return <Tag key={i}><Trechos lista={b.filhos} /></Tag>;
        }
        if (b.tipo === 'linha') return <hr key={i} />;
        if (b.tipo === 'citacao') return <blockquote key={i}><Trechos lista={b.filhos} /></blockquote>;
        if (b.tipo === 'lista') {
          const Lista = b.ordenada ? 'ol' : 'ul';
          return <Lista key={i}>{b.itens.map((item, j) => <li key={j}><Trechos lista={item} /></li>)}</Lista>;
        }
        if (b.tipo === 'tabela') {
          return (
            <div key={i} className="md-tabela" tabIndex={0} role="region" aria-label="Tabela (role para o lado se precisar)">
              <table>
                <thead><tr>{b.cabecalho.map((c, j) => <th key={j}><Trechos lista={c} /></th>)}</tr></thead>
                <tbody>{b.linhas.map((linha, j) => <tr key={j}>{linha.map((c, k) => <td key={k}><Trechos lista={c} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={i}><Trechos lista={b.filhos} /></p>;
      })}
    </div>
  );
}

export default Markdown;
