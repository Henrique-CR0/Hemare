// Hemare - Guia completo da doacao: antes, durante e depois.
function Orientacoes() {
  return (
    <div className="conteudo-pagina">
      <h1>Guia da doação 🩸</h1>
      <p className="conteudo-intro">
        Tudo o que você precisa saber para doar com tranquilidade — do preparo até os cuidados depois.
      </p>

      <h2 className="conteudo-secao">Antes de doar</h2>

      <div className="conteudo-bloco">
        <h2>🍽️ Alimentação e preparo</h2>
        <ul>
          <li><strong>Alimente-se bem</strong> — nunca vá em jejum. Faça uma refeição leve algumas horas antes (pão, tapioca, arroz, frutas, ovos, queijos leves).</li>
          <li><strong>Reforce o ferro nos dias anteriores</strong> — carnes magras, feijão, lentilha, ovos e folhas verde-escuras. Combine com vitamina C (laranja, acerola).</li>
          <li><strong>Hidrate-se</strong> — beba bastante água no dia anterior e um copo pouco antes de doar.</li>
          <li><strong>Descanse</strong> — tenha dormido bem na última noite.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>🚫 Evite no dia</h2>
        <ul>
          <li>Alimentos gordurosos, frituras e fast-food (atrapalham os exames do sangue)</li>
          <li>Bebida alcoólica nas 12 horas anteriores</li>
          <li>Excesso de café (ajuda a desidratar)</li>
        </ul>
      </div>

      <h2 className="conteudo-secao">No dia da doação</h2>

      <div className="conteudo-bloco">
        <h2>⏱️ Como funciona</h2>
        <ul>
          <li>O processo completo (cadastro, triagem, coleta e lanche) leva em média <strong>40 minutos</strong>.</li>
          <li>A coleta em si dura só <strong>5 a 15 minutos</strong>.</li>
          <li>Leve um <strong>documento oficial com foto</strong>.</li>
        </ul>
      </div>

      <h2 className="conteudo-secao">Depois de doar</h2>

      <div className="conteudo-bloco">
        <h2>✅ Cuidados imediatos</h2>
        <ul>
          <li>Permaneça no hemocentro por <strong>15 minutos</strong> e aceite o lanche oferecido.</li>
          <li>Mantenha o <strong>curativo por pelo menos 4 horas</strong>. Se voltar a sangrar, comprima o local sem dobrar o braço.</li>
          <li><strong>Hidrate-se bem</strong>, especialmente nas primeiras 4 horas.</li>
          <li>Não fume por cerca de <strong>2 horas</strong> e evite álcool por <strong>12 horas</strong>.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>🚗 Dirigir e esforço físico</h2>
        <ul>
          <li><strong>Dirigir (carro):</strong> aguarde pelo menos <strong>1 hora</strong>. Se sentir mal-estar, pare o veículo.</li>
          <li><strong>Esforço físico e academia:</strong> evite por <strong>12 horas</strong> (idealmente 24h), principalmente com o braço da punção.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>👷 Atenção a algumas profissões e esportes</h2>
        <p style={{ marginBottom: '10px', color: '#4a3034' }}>Por segurança, algumas atividades pedem repouso maior antes de retomar:</p>
        <ul>
          <li><strong>Motoristas de ônibus/caminhão, operadores de máquinas:</strong> aguardar <strong>12 horas</strong>.</li>
          <li><strong>Atletas</strong> (ciclismo, natação, mergulho, competição): aguardar <strong>24 horas</strong>.</li>
          <li>Trabalho em altura, paraquedismo e mergulho também exigem espera.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>🚨 Nos dias seguintes</h2>
        <ul>
          <li>Se tiver <strong>febre, diarreia</strong> ou sintomas de infecção em até <strong>7 a 14 dias</strong>, comunique o hemocentro.</li>
          <li>A cada doação são feitos exames (Hepatite B e C, Sífilis, HIV, HTLV, Chagas). Se algo for detectado, você é convocado.</li>
        </ul>
      </div>

      <p className="conteudo-aviso">
        ⚠️ Informações orientativas, baseadas no Ministério da Saúde e em hemocentros oficiais (Pró-Sangue, Hemominas, Santa Casa). A avaliação final é feita por um profissional no dia da doação.
      </p>
    </div>
  );
}

export default Orientacoes;