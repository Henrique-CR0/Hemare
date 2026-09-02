// Hemare - Tela de triagem: responde e recebe uma orientacao (nao diagnostico).
import { useState } from 'react';
import { avaliarTriagem } from '../regras/triagem';

const PERGUNTAS_SAUDE = [
  { campo: 'temHIV', texto: 'Você tem HIV/AIDS?' },
  { campo: 'temHepatiteB', texto: 'Você tem Hepatite B?' },
  { campo: 'temHepatiteC', texto: 'Você tem Hepatite C?' },
  { campo: 'temHTLV', texto: 'Você tem HTLV?' },
  { campo: 'temChagas', texto: 'Você tem Doença de Chagas?' },
  { campo: 'hepatiteAposOnzeAnos', texto: 'Teve hepatite após os 11 anos de idade?' },
  { campo: 'usaDrogasInjetaveis', texto: 'Faz uso de drogas injetáveis?' }
];

const PERGUNTAS_RECENTES = [
  { campo: 'tatuagemRecente', texto: 'Fez tatuagem ou micropigmentação nos últimos 12 meses?' },
  { campo: 'gripeResfriado', texto: 'Está com gripe ou resfriado (ou teve há poucos dias)?' },
  { campo: 'bebidaAlcoolica', texto: 'Ingeriu bebida alcoólica nas últimas 12 horas?' },
  { campo: 'gravidezOuPosParto', texto: 'Está grávida ou teve parto recentemente?' }
];

const PERGUNTAS_ATENCAO = [
  { campo: 'temDiabetes', texto: 'Você tem diabetes?' },
  { campo: 'temHipertensao', texto: 'Você tem hipertensão (pressão alta)?' },
  { campo: 'usaMedicacaoContinua', texto: 'Você usa algum medicamento controlado ou de uso contínuo?' }
];

// Limites ideais para doacao (baseados nos criterios oficiais).
const IDADE_MIN = 16, IDADE_MAX = 69, PESO_MIN = 50;

function Triagem() {
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  function responder(campo, valor) {
    setRespostas((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function responderNumero(campo, valorTexto, max) {
    let n = Number(valorTexto.replace(/\D/g, ''));
    if (n > max) n = max;
    setRespostas((anterior) => ({ ...anterior, [campo]: n }));
  }

  // Avisos de "fora do ideal" (aparecem embaixo do campo enquanto digita).
  const avisoIdade = respostas.idade && (respostas.idade < IDADE_MIN || respostas.idade > IDADE_MAX)
    ? 'Idade para doação: ' + IDADE_MIN + ' a ' + IDADE_MAX + ' anos.'
    : '';
  const avisoPeso = respostas.peso && respostas.peso < PESO_MIN
    ? 'Peso mínimo para doação: ' + PESO_MIN + ' kg.'
    : '';

  function verResultado() {
    if (!respostas.idade || !respostas.peso) {
      setResultado(null);
      setErro('⚠️ Preencha pelo menos sua idade e seu peso para ver o resultado.');
      return;
    }
    setErro('');
    setResultado(avaliarTriagem(respostas));
  }

  function grupo(titulo, perguntas) {
    return (
      <div className="triagem-grupo">
        <h3 className="triagem-grupo-titulo">{titulo}</h3>
        {perguntas.map((p) => (
          <div key={p.campo} className="triagem-pergunta">
            <span>{p.texto}</span>
            <div className="triagem-opcoes">
              <button
                className={respostas[p.campo] === true ? 'triagem-op ativo-sim' : 'triagem-op'}
                onClick={() => responder(p.campo, true)}>Sim</button>
              <button
                className={respostas[p.campo] === false ? 'triagem-op ativo-nao' : 'triagem-op'}
                onClick={() => responder(p.campo, false)}>Não</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="triagem-pagina">
      <div className="triagem-cabecalho">
        <h1 className="hemare-logo">🩸 Hemare</h1>
        <p className="hemare-sub">Triagem — será que você pode doar hoje?</p>
      </div>

      <div className="triagem-grade">
        <div className="triagem-grupo">
          <h3 className="triagem-grupo-titulo">Sobre você</h3>

          <div className="triagem-campo">
            <div className="triagem-pergunta">
              <span>Sua idade</span>
              <input className="triagem-num" type="text" inputMode="numeric" placeholder="anos"
                value={respostas.idade || ''}
                onChange={(e) => responderNumero('idade', e.target.value, 120)} />
            </div>
            {avisoIdade && <p className="triagem-aviso-campo">{avisoIdade}</p>}
          </div>

          <div className="triagem-campo">
            <div className="triagem-pergunta">
              <span>Seu peso (kg)</span>
              <input className="triagem-num" type="text" inputMode="numeric" placeholder="kg"
                value={respostas.peso || ''}
                onChange={(e) => responderNumero('peso', e.target.value, 300)} />
            </div>
            {avisoPeso && <p className="triagem-aviso-campo">{avisoPeso}</p>}
          </div>
        </div>

        {grupo('Situações recentes', PERGUNTAS_RECENTES)}
        {grupo('Saúde', PERGUNTAS_SAUDE)}
        {grupo('Condições a confirmar', PERGUNTAS_ATENCAO)}
      </div>

      <div className="triagem-rodape">
        <button className="hemare-botao triagem-botao" onClick={verResultado}>Ver resultado</button>

        {erro && <div className="triagem-erro">{erro}</div>}

        {resultado && (
          <div className={'triagem-resultado nivel-' + resultado.nivel}>
            <h3>{resultado.titulo}</h3>
            {resultado.motivos.length > 0 && (
              <ul>
                {resultado.motivos.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}
            <p className="triagem-aviso">
              ⚠️ Esta é uma orientação informativa, não substitui a triagem clínica.
              A avaliação final é feita por um profissional no dia da doação.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Triagem;