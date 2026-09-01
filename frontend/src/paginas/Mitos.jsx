// Hemare - Pagina de Mitos e Verdades sobre doacao de sangue.
const ITENS = [
  { mito: 'Doar sangue engorda ou emagrece.', veredito: 'Mito', texto: 'Não faz nem uma coisa nem outra. O líquido é reposto pelo corpo em cerca de 24 horas.' },
  { mito: 'Mulher menstruada não pode doar.', veredito: 'Mito', texto: 'Pode, sim! A perda menstrual já é prevista pelo corpo. Quem usa anticoncepcional ou DIU também está liberada.' },
  { mito: 'Quem tem tatuagem não pode doar.', veredito: 'Mito', texto: 'Pode — só precisa esperar 12 meses (1 ano), não importa a quantidade de tatuagens.' },
  { mito: 'Doar sangue vicia.', veredito: 'Mito', texto: 'Não existe nenhuma dependência ligada ao ato de doar.' },
  { mito: 'Preciso estar em jejum para doar.', veredito: 'Mito', texto: 'É o contrário! Você deve estar alimentado. Doar em jejum aumenta o risco de passar mal.' },
  { mito: 'Doar enfraquece o organismo.', veredito: 'Mito', texto: 'O corpo repõe o volume rapidamente — a coleta é menos de 10% do seu sangue.' },
  { mito: 'Quem toma remédio contínuo não pode doar.', veredito: 'Mito', texto: 'Na maioria dos casos, pode. Anticoncepcional e anti-hipertensivo costumam liberar — só informe na triagem. Nunca pare um remédio por conta própria.' },
  { mito: 'Já tive dengue, nunca mais posso doar.', veredito: 'Mito', texto: 'Após a recuperação e um período de espera, você volta a poder doar.' },
  { mito: 'Uma doação ajuda várias pessoas.', veredito: 'Verdade', texto: 'O sangue é separado em componentes — uma doação pode salvar até 4 vidas.' }
];

function Mitos() {
  return (
    <div className="conteudo-pagina">
      <h1>Mitos e Verdades 💬</h1>
      <p className="conteudo-intro">
        Muita gente deixa de doar por causa de informações erradas. Veja o que é mito e o que é verdade sobre doar sangue.
      </p>

      <div className="mitos-lista">
        {ITENS.map((item, i) => (
          <div key={i} className="mito-card">
            <div className="mito-pergunta">"{item.mito}"</div>
            <span className={item.veredito === 'Verdade' ? 'selo-verdade' : 'selo-mito'}>
              {item.veredito === 'Verdade' ? '✅ Verdade' : '❌ Mito'}
            </span>
            <p className="mito-texto">{item.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Mitos;