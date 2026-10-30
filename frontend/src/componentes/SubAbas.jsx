// Hemare - Abas secundarias dentro de uma tela (ex.: Dados pessoais | Saude | Carteirinha | Seguranca).
// A aba escolhida fica no endereco (?aba=seguranca): recarregar a pagina ou mandar o link leva para a mesma aba.
// Funciona so com o teclado (setas, Home e End) e avisa leitores de tela (role="tablist").
import { useSearchParams } from 'react-router-dom';

// Devolve [abaAtual, trocar] para uma lista de ids; ids invalidos caem na primeira aba.
export function useAba(ids) {
  const [params, setParams] = useSearchParams();
  const pedida = params.get('aba');
  const atual = ids.includes(pedida) ? pedida : ids[0];
  function trocar(id) {
    const novo = new URLSearchParams(params);
    if (id === ids[0]) novo.delete('aba'); else novo.set('aba', id);
    setParams(novo, { replace: true });
  }
  return [atual, trocar];
}

function SubAbas({ abas, atual, aoTrocar }) {
  function aoTeclar(e, indice) {
    let alvo = null;
    if (e.key === 'ArrowRight') alvo = (indice + 1) % abas.length;
    if (e.key === 'ArrowLeft') alvo = (indice - 1 + abas.length) % abas.length;
    if (e.key === 'Home') alvo = 0;
    if (e.key === 'End') alvo = abas.length - 1;
    if (alvo !== null) {
      e.preventDefault();
      aoTrocar(abas[alvo].id);
      const botoes = e.currentTarget.parentElement.querySelectorAll('[role=tab]');
      if (botoes[alvo]) botoes[alvo].focus();
    }
  }

  return (
    <div className="sub-abas" role="tablist" aria-label="Seções desta página">
      {abas.map((a, i) => (
        <button
          key={a.id}
          type="button"
          role="tab"
          id={'aba-' + a.id}
          aria-selected={atual === a.id}
          aria-controls={'painel-' + a.id}
          tabIndex={atual === a.id ? 0 : -1}
          className={'sub-aba' + (atual === a.id ? ' sub-aba-ativa' : '')}
          onClick={() => aoTrocar(a.id)}
          onKeyDown={(e) => aoTeclar(e, i)}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}

export default SubAbas;
