// Hemare - O que cada tela que exige conta explica para quem ainda nao tem (o "portao de acesso").
// Regra: mostrar o valor ANTES de pedir o cadastro, dizer por que a conta e necessaria e deixar claro o que continua aberto.

export const PORTOES = {
  triagem: {
    icone: '🩺',
    titulo: 'A triagem "Posso doar?" é para quem tem conta',
    porque: 'A triagem pergunta sobre a sua saúde (remédios, doenças, procedimentos recentes). Isso é dado sensível: por respeito à LGPD, só aparece para quem criou conta e aceitou usar o Hemare. Suas respostas não ficam guardadas.',
    beneficios: [
      'Descobrir em 2 minutos se você parece apto e o que levar',
      'Saber quando poderá doar de novo, pelo intervalo desde a sua última doação',
      'Agendar o horário num hospital e acompanhar o seu histórico'
    ],
    abertas: [
      { para: '/orientacoes', rotulo: 'Guia da doação (requisitos gerais)' },
      { para: '/mitos', rotulo: 'Mitos e verdades' },
      { para: '/locais', rotulo: 'Onde doar' }
    ]
  },
  apadrinhar: {
    icone: '💝',
    titulo: 'Apadrinhar é para quem tem conta de doador',
    porque: 'Os pacientes que procuram padrinhos precisam de cuidado: só doadores com conta veem a lista, e cada padrinho só é chamado quando está apto e dentro do limite combinado. Os pacientes aparecem apenas por apelido, nunca com o nome verdadeiro.',
    beneficios: [
      'Ver quem precisa de sangue com regularidade e escolher quem apadrinhar',
      'Ser chamado só quando já puder doar (sem insistência)',
      'Ganhar o emblema de padrinho e acompanhar o seu afilhado'
    ],
    abertas: [
      { para: '/noticias', rotulo: 'Notícias de doação por estado' },
      { para: '/estoque', rotulo: 'Termômetro de estoque' },
      { para: '/locais', rotulo: 'Onde doar' }
    ]
  }
};
