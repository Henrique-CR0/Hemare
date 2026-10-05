// Hemare - Pagina de Mitos e Verdades sobre doacao de sangue (baseada em fontes oficiais).
const ITENS = [
  { mito: 'Doar sangue engorda ou emagrece.', veredito: 'Mito', texto: 'Não faz nem uma coisa nem outra. O líquido é reposto pelo corpo em cerca de 24 horas.' },
  { mito: 'Mulher menstruada não pode doar.', veredito: 'Mito', texto: 'Pode, sim! A perda menstrual já é prevista pelo corpo. Quem usa anticoncepcional ou DIU também está liberada.' },
  { mito: 'Quem fez tatuagem recente pode doar normalmente.', veredito: 'Depende', texto: 'Desde setembro de 2026 a espera é de 4 meses (antes eram 12) para tatuagem, piercing, maquiagem definitiva e botox. Se o local tem alvará sanitário e você leva o comprovante, são só 7 dias. Piercing na boca ou na região genital: 4 meses depois de retirar.' },
  { mito: 'Doar sangue vicia.', veredito: 'Mito', texto: 'Não existe nenhuma dependência ligada ao ato de doar.' },
  { mito: 'Preciso estar em jejum para doar.', veredito: 'Mito', texto: 'É o contrário! Você deve estar alimentado. Doar em jejum aumenta o risco de passar mal.' },
  { mito: 'Doar enfraquece o organismo ou deixa o sangue "mais fraco".', veredito: 'Mito', texto: 'O corpo repõe o volume rapidamente — a coleta é menos de 10% do seu sangue. Não há enfraquecimento.' },
  { mito: 'Quem toma remédio nunca pode doar.', veredito: 'Mito', texto: 'Depende do remédio. Muitos não impedem (como anticoncepcional). Antibióticos e anti-inflamatórios pedem um tempo de espera. Informe sempre na triagem e nunca pare um remédio por conta própria.' },
  { mito: 'Quem tem pressão alta ou diabetes não pode doar.', veredito: 'Depende', texto: 'Se a hipertensão ou o diabetes estiverem controlados e sem complicações, geralmente é possível doar. A avaliação é feita na triagem.' },
  { mito: 'Já tive dengue, nunca mais posso doar.', veredito: 'Mito', texto: 'Falso. Após a recuperação e um período de espera, você volta a poder doar.' },
  { mito: 'Quem já teve hepatite depois dos 11 anos não pode doar.', veredito: 'Verdade', texto: 'Segundo a legislação, quem teve hepatite viral após os 11 anos de idade fica impedido de doar.' },
  { mito: 'Gripe ou febre não atrapalham a doação.', veredito: 'Mito', texto: 'Quem está com gripe, resfriado ou febre deve aguardar a recuperação antes de doar.' },
  { mito: 'Uma doação ajuda várias pessoas.', veredito: 'Verdade', texto: 'O sangue é separado em componentes — uma doação pode salvar até 4 vidas.' },
  { mito: 'Todo tipo sanguíneo é bem-vindo.', veredito: 'Verdade', texto: 'Todos são importantes! O O– é o doador universal e o mais requisitado em emergências, mas os tipos mais comuns (O+ e A+) também são muito usados.' },
  { mito: 'Pessoas com tatuagem antiga não podem doar.', veredito: 'Mito', texto: 'Podem. A espera é só para procedimentos recentes (4 meses, ou 7 dias com alvará sanitário), não importa a quantidade de tatuagens.' },
  { mito: 'Quem fez endoscopia ou colonoscopia precisa esperar 6 meses.', veredito: 'Mito', texto: 'Mudou: desde setembro de 2026 a espera é de 4 meses depois do exame.' },
  { mito: 'Idosos não podem doar sangue.', veredito: 'Mito', texto: 'Podem. A primeira doação vai até os 60 anos, e quem já é doador regular pode continuar depois dos 70, após avaliação da triagem clínica. No Hemope, por exemplo, é preciso ter doado ao menos uma vez nos últimos 12 meses, com intervalo de 6 meses entre as doações.' },
  { mito: 'Posso doar quantas vezes eu quiser no ano.', veredito: 'Mito', texto: 'Há um intervalo: homens a cada 60 dias (até 4x/ano) e mulheres a cada 90 dias (até 3x/ano), para o corpo repor o ferro.' }
];

function selo(veredito) {
  if (veredito === 'Verdade') return { classe: 'selo-verdade', texto: '✅ Verdade' };
  if (veredito === 'Depende') return { classe: 'selo-depende', texto: '⚠️ Depende' };
  return { classe: 'selo-mito', texto: '❌ Mito' };
}

function Mitos() {
  return (
    <div className="conteudo-pagina">
      <h1>Mitos e Verdades 💬</h1>
      <p className="conteudo-intro">
        Muita gente deixa de doar por causa de informações erradas. Veja o que é mito e o que é verdade sobre doar sangue, com base em fontes oficiais.
      </p>

      <div className="mitos-lista">
        {ITENS.map((item, i) => {
          const s = selo(item.veredito);
          return (
            <div key={i} className="mito-card">
              <div className="mito-pergunta">"{item.mito}"</div>
              <span className={s.classe}>{s.texto}</span>
              <p className="mito-texto">{item.texto}</p>
            </div>
          );
        })}
      </div>

      <p className="conteudo-aviso">
        ⚠️ Conteúdo baseado em informações do Ministério da Saúde e de hemocentros oficiais (Hemominas, Hemoce, Pró-Sangue). Em caso de dúvida sobre seu caso, consulte o hemocentro antes de doar.
      </p>
    </div>
  );
}

export default Mitos;