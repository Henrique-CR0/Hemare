// Hemare - Pagina "Depois de doar: cuidados e repouso".
function PosDoacao() {
  return (
    <div className="conteudo-pagina">
      <h1>Depois de doar: cuidados 🚗</h1>
      <p className="conteudo-intro">
        A doação é rápida e segura, mas alguns cuidados nas horas seguintes garantem que tudo corra bem.
      </p>

      <div className="conteudo-bloco">
        <h2>✅ Logo após a doação</h2>
        <ul>
          <li>Permaneça no hemocentro por <strong>15 minutos</strong> e aceite o lanche oferecido.</li>
          <li>Mantenha o <strong>curativo por pelo menos 4 horas</strong>. Se voltar a sangrar, comprima o local sem dobrar o braço.</li>
          <li><strong>Hidrate-se bem</strong> — beba mais líquido que o normal, especialmente nas primeiras 4 horas.</li>
          <li>Não fume por cerca de <strong>2 horas</strong> e evite álcool por <strong>12 horas</strong>.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>🚗 Dirigir e esforço físico</h2>
        <ul>
          <li><strong>Dirigir (carro):</strong> aguarde pelo menos <strong>1 hora</strong>. Se sentir mal-estar, pare o veículo imediatamente.</li>
          <li><strong>Esforço físico e academia:</strong> evite por <strong>12 horas</strong> (idealmente 24h), principalmente com o braço da punção.</li>
          <li>Ao voltar aos exercícios, comece de forma leve.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>👷 Atenção a algumas profissões e esportes</h2>
        <p style={{ marginBottom: '10px', color: '#4a3034' }}>Por segurança, algumas atividades pedem repouso maior antes de retomar:</p>
        <ul>
          <li><strong>Motoristas de ônibus/caminhão, operadores de máquinas:</strong> aguardar <strong>12 horas</strong>.</li>
          <li><strong>Atletas</strong> (ciclismo, natação, mergulho, esportes de competição): aguardar <strong>24 horas</strong>.</li>
          <li>Trabalho em altura (andaimes), paraquedismo e mergulho também exigem espera.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>🚨 Fique atento nos dias seguintes</h2>
        <ul>
          <li>Se tiver <strong>febre, diarreia</strong> ou sintomas de infecção em até <strong>7 a 14 dias</strong>, comunique o hemocentro — a bolsa pode precisar ser avaliada.</li>
          <li>A cada doação são feitos exames (Hepatite B e C, Sífilis, HIV, HTLV, Chagas). Se algo for detectado, você é convocado.</li>
        </ul>
      </div>

      <p className="conteudo-aviso">
        ⚠️ Orientações baseadas em hemocentros oficiais (Pró-Sangue, Hemominas, Santa Casa). Siga sempre as instruções do local onde você doou.
      </p>
    </div>
  );
}

export default PosDoacao;