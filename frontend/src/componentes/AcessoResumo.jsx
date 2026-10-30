// Hemare - Resumo de acesso mostrado no login e no cadastro: o que da para fazer sem conta e o que depende da conta.
// Ajuda a pessoa a entender por que o cadastro existe antes de preencher qualquer coisa.
function AcessoResumo({ tipo }) {
  return (
    <aside className="acesso-resumo" aria-label="O que cada tipo de acesso permite">
      <div>
        <h3>🌐 Sem conta</h3>
        <ul>
          <li>Ver onde doar e o termômetro de estoque</li>
          <li>Ler notícias e a previsão do sangue</li>
          <li>Guia da doação, mitos e seus direitos</li>
        </ul>
      </div>
      <div className={tipo === 'doador' ? 'acesso-destaque' : ''}>
        <h3>🩸 Conta de doador</h3>
        <ul>
          <li>Triagem "Posso doar?"</li>
          <li>Agendar e acompanhar suas doações</li>
          <li>Perfil, carteirinha e conquistas</li>
          <li>Apadrinhar pacientes</li>
        </ul>
      </div>
      <div className={tipo === 'hospital' ? 'acesso-destaque' : ''}>
        <h3>🏥 Conta de hospital</h3>
        <ul>
          <li>Estoque, necessidades e agenda</li>
          <li>Campanhas e rede de sangue raro</li>
          <li>Só depois de aprovada por um administrador</li>
        </ul>
      </div>
    </aside>
  );
}

export default AcessoResumo;
