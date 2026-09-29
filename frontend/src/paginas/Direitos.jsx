// Hemare - Pagina "Seus direitos como doador" (baseada na CLT e leis).
function Direitos() {
  return (
    <div className="conteudo-pagina">
      <h1>Seus direitos como doador ⚖️</h1>
      <p className="conteudo-intro">
        Doar sangue dá direitos que muita gente não conhece. Saber deles é também uma forma de incentivar a doação.
      </p>

      <div className="conteudo-bloco">
        <h2>💼 Folga no trabalho</h2>
        <ul>
          <li>Pela <strong>CLT (art. 473)</strong>, o trabalhador pode faltar <strong>1 dia a cada 12 meses</strong>, sem prejuízo do salário, em caso de doação voluntária comprovada.</li>
          <li>Essa folga <strong>não pode ser descontada</strong> em folha nem usada para compensar horas.</li>
          <li>Para <strong>servidores públicos e militares</strong>, o direito vem da Lei nº 1.075/1950 (dispensa do ponto no dia da doação).</li>
          <li><strong>Atenção:</strong> a folga só vale se a doação for <strong>efetivada</strong>. Se você foi mas não estava apto, não gera o direito.</li>
          <li>Para garantir, apresente ao RH o <strong>comprovante</strong> com data e horário da doação.</li>
          <li>Se a doação foi confirmada pelo hospital no Hemare, você também encontra na sua área um <strong>comprovante verificável com QR code</strong>, que o RH pode conferir na hora.</li>
        </ul>
      </div>

      <div className="conteudo-bloco">
        <h2>🎟️ Outros benefícios (variam por estado)</h2>
        <ul>
          <li>Isenção de taxa de inscrição em <strong>concursos públicos</strong> estaduais, em vários estados.</li>
          <li><strong>Meia-entrada</strong> e atendimento preferencial em eventos culturais e esportivos, conforme a lei de cada estado.</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#8a6b6f', marginTop: '8px' }}>
          Os benefícios estaduais variam — vale conferir a legislação do seu estado.
        </p>
      </div>

      <p className="conteudo-aviso">
        ⚖️ Direitos baseados na CLT (art. 473) e na Lei nº 1.075/1950. Regras estaduais podem complementar esses direitos.
      </p>
    </div>
  );
}

export default Direitos;