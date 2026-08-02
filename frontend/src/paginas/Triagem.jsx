// Hemare - Tela de triagem: o doador responde e recebe uma orientacao (nao diagnostico).
import { useState } from 'react';
import { avaliarTriagem } from '../regras/triagem';

// As perguntas de sim/nao, agrupadas. 'campo' e o nome usado na regra.
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
  { campo: 'temHipertensao', texto: 'Você tem hipertensão (pressão alta)?' }
];

function Triagem() {
  // Um objeto guarda TODAS as respostas. Comeca vazio.
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);

  // Atualiza uma resposta (marca sim/nao para uma pergunta).
  function responder(campo, valor) {
    setRespostas((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function verResultado() {
    // Chama a regra que ja testamos, passando todas as respostas.
    const r = avaliarTriagem(respostas);
    setResultado(r);
  }

  // Desenha um grupo de perguntas sim/nao.
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
    <div className="triagem-tela">
      <h1 className="hemare-logo">🩸 Hemare</h1>
      <p className="hemare-sub">Triagem — será que você pode doar hoje?</p>

      <div className="triagem-conteudo">
        {/* Peso e idade sao numeros */}
        <div className="triagem-grupo">
          <h3 className="triagem-grupo-titulo">Sobre você</h3>
          <div className="triagem-pergunta">
            <span>Sua idade</span>
            <input className="triagem-num" type="text" inputMode="numeric" placeholder="anos"
              value={respostas.idade || ''}
              onChange={(e) => responder('idade', Number(e.target.value.replace(/\D/g, '')))} />
          </div>
          <div className="triagem-pergunta">
            <span>Seu peso (kg)</span>
            <input className="triagem-num" type="text" inputMode="numeric" placeholder="kg"
              value={respostas.peso || ''}
              onChange={(e) => responder('peso', Number(e.target.value.replace(/\D/g, '')))} />
          </div>
        </div>

        {grupo('Situações recentes', PERGUNTAS_RECENTES)}
        {grupo('Saúde', PERGUNTAS_SAUDE)}
        {grupo('Condições a confirmar', PERGUNTAS_ATENCAO)}

        <button className="hemare-botao" onClick={verResultado}>Ver resultado</button>

        {/* O resultado aparece aqui depois de clicar */}
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