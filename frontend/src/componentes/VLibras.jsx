// Hemare - VLibras (tradutor oficial de Libras do Governo Federal).
// O script oficial ja cria o botao sozinho quando carrega. Aqui so garantimos
// que ele seja carregado UMA vez (sem isso aparecem dois botoes empilhados).
import { useEffect } from 'react';

const ENDERECO_VLIBRAS = 'https://vlibras.gov.br/app';
const ID_SCRIPT = 'vlibras-plugin';

function VLibras() {
  useEffect(() => {
    if (document.getElementById(ID_SCRIPT)) return;

    const script = document.createElement('script');
    script.id = ID_SCRIPT;
    script.src = ENDERECO_VLIBRAS + '/vlibras-plugin.js';
    script.async = true;
    script.onload = () => new window.VLibras.Widget(ENDERECO_VLIBRAS);
    document.head.appendChild(script);
  }, []);

  return null;
}

export default VLibras;
