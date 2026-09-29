// Hemare - Povoamento inicial do canal de noticias: panorama por estado, pesquisado em 29/09/2026.
// Cada aviso tem resumo escrito com palavras proprias e o LINK da materia original (quem quer ler tudo clica).
// O "nivel" e o que a fonte relatou NAQUELE momento, nao a situacao de hoje: a pagina mostra a data de referencia.
// Rode depois de db/criar-noticias.js. Pode rodar de novo: links que ja existem sao pulados.
const pool = require('../banco');
const { validarNoticia } = require('../regras/noticias');

const AVISOS = [
    { uf: 'AC', nivel: 'sem-dados', referencia: 'jul/2026', fonte: 'Ecos da Notícia',
      titulo: 'Acre lança Hemocentro Digital com estoque por tipo sanguíneo',
      resumo: 'A plataforma do governo mostra o estoque por tipo (estável, alerta ou crítico) e permite pedir a carteira digital de doador. Não achamos alerta de 2026: vale conferir o painel antes de ir.',
      url: 'https://ecosdanoticia.net/2026/07/nova-plataforma-digital-reune-servicos-de-doacao-de-sangue-e-documentos-do-hemocentro/' },
    { uf: 'AL', nivel: 'critico', referencia: 'jul/2026', fonte: 'Tribuna Hoje',
      titulo: 'Hemoal opera com menos de 30% do estoque mínimo',
      resumo: 'Depois das festas juninas, o hemocentro tinha 97 bolsas quando o mínimo seria 350. Ao longo de 2026 o estoque voltou várias vezes ao nível crítico, com apelos nas unidades de Maceió e Arapiraca.',
      url: 'https://tribunahoje.com/noticias/saude/2026/07/02/188518-hemoal-dispoe-de-apenas-2771-do-estoque-minimo-necessario-e-apela-por-doacoes-de-sangue' },
    { uf: 'AP', nivel: 'alerta', referencia: 'jan/2026', fonte: 'Agência Amapá',
      titulo: 'Hemoap alerta para O negativo e falta de doadores diários',
      resumo: 'O tipo O- estava em nível crítico. O hemocentro precisa de cerca de 80 a 90 doações por dia, mas recebia de 4 a 5, e reforçou o chamado por doadores.',
      url: 'https://agenciaamapa.com.br/noticia/34193/estoque-de-sangue-o-esta-em-nivel-critico-e-hemoap-reforca-chamado-por-doadores' },
    { uf: 'AM', nivel: 'critico', referencia: 'set/2026', fonte: 'Saúde AM',
      titulo: 'Hemoam convoca doadores com estoques em estado crítico',
      resumo: 'A coleta caiu para cerca de 130 a 140 bolsas por dia, contra a meta de 250 para abastecer as redes pública e privada do estado. A fundação pede doadores em caráter de urgência.',
      url: 'https://www.saude.am.gov.br/com-estoques-em-estado-critico-hemoam-convoca-doadores-de-sangue-em-carater-de-urgencia/' },
    { uf: 'BA', nivel: 'critico', referencia: 'set/2026', fonte: 'Bahia Notícias',
      titulo: 'Hemoba amplia horário de doação em meio a estoque baixo',
      resumo: 'Quase todos os tipos estavam em situação crítica, o suficiente para cerca de dois dias da rede pública. Em setembro há coletas externas e o "Sabadão Solidário" em unidades do interior.',
      url: 'https://www.bahianoticias.com.br/saude/noticia/33232-em-meio-a-baixo-estoque-hemoba-amplia-horario-de-atendimento-para-doacao-de-sangue-na-bahia' },
    { uf: 'CE', nivel: 'estavel', referencia: 'jan/2026', fonte: 'Governo do Ceará',
      titulo: 'Hemoce supera 119 mil doações em 2025',
      resumo: 'O maior número desde que os dados são informatizados, com mais de 8 mil doações a mais que em 2024. O hemocentro faz campanhas antes de datas de pico, como Semana Santa e Carnaval.',
      url: 'https://www.ceara.gov.br/2026/01/07/hemoce-supera-119-mil-doacoes-de-sangue-em-2025-e-consolida-crescimento-do-ato-de-doar-no-estado/' },
    { uf: 'DF', nivel: 'alerta', referencia: 'set/2026', fonte: 'Correio Braziliense',
      titulo: 'Hemocentro de Brasília tem 5 dos 8 tipos em baixa',
      resumo: 'O+, O-, A+, A- e B- estavam abaixo do normal, com o B- em situação crítica. Com estoque crítico, cirurgias marcadas podem ser adiadas por falta de sangue compatível. Agendamento pelo portal agenda.df.gov.br.',
      url: 'https://www.correiobraziliense.com.br/cidades-df/2026/09/7503425-hemocentro-de-brasilia-5-dos-8-tipos-de-sangue-estao-em-baixo-estoque.html' },
    { uf: 'ES', nivel: 'sem-dados', referencia: 'painel oficial', fonte: 'Governo do ES (dados abertos)',
      titulo: 'Espírito Santo publica o estoque do Hemoes em dados abertos',
      resumo: 'O portal de dados abertos do estado disponibiliza o estoque de sangue do Hemoes. Não achamos um alerta de 2026 confirmado; consulte o painel oficial para a situação do dia.',
      url: 'https://dados.es.gov.br/dataset?tags=HEMOES' },
    { uf: 'GO', nivel: 'alerta', referencia: 'jul/2026', fonte: 'O Hoje',
      titulo: 'Estoques de sangue caem 30% em julho em Goiás',
      resumo: 'A rede estadual (Rede Hemo) viu o O- chegar a nível crítico. O Hemocentro atende cerca de 190 unidades de saúde e permite agendar pelo site agenda.hemocentro.org.br.',
      url: 'https://ohoje.com/2026/08/01/estoques-de-sangue-caem-durante-o-mes-de-julho-em-goias/' },
    { uf: 'MA', nivel: 'alerta', referencia: 'jun/2026', fonte: 'Jornal Pequeno',
      titulo: 'Maranhão lança campanha São João da Doação',
      resumo: 'Durante o Junho Vermelho, o governo mobilizou doadores porque a coleta diária ficava abaixo da meta de cerca de 250 doações. Ao longo de 2026 houve alertas para O+, A+, O- e B-.',
      url: 'https://jornalpequeno.com.br/2026/06/02/campanha-sao-joao-da-doacao-busca-aumentar-estoques-de-sangue-no-maranhao/' },
    { uf: 'MT', nivel: 'atencao', referencia: '2026', fonte: 'SES-MT',
      titulo: 'MT Hemocentro alerta para O+, O- e B- em baixa',
      resumo: 'Em 2026 os avisos alternaram entre atenção e alerta para os tipos O-, B- e O+. A unidade de Cuiabá recebe doações de segunda a sexta, com agendamento por WhatsApp e telefone.',
      url: 'https://www.saude.mt.gov.br/noticia/12253/mt-hemocentro-alerta-para-estoque-de-sangue-em-nivel-critico' },
    { uf: 'MS', nivel: 'alerta', referencia: '2026', fonte: 'Agência de Notícias MS',
      titulo: 'Hemosul alerta para baixo estoque de sangue O+',
      resumo: 'O tipo mais usado no dia a dia dos hospitais estava com cerca de 20% do volume ideal. A rede distribui aproximadamente 8.600 hemocomponentes por mês e coleta também em Dourados, Três Lagoas, Ponta Porã e Paranaíba.',
      url: 'https://agenciadenoticias.ms.gov.br/hemosul-alerta-para-baixo-estoque-de-sangue-o-e-convoca-doadores-em-ms/' },
    { uf: 'MG', nivel: 'critico', referencia: 'ago/2026', fonte: 'Tribuna de Minas',
      titulo: 'Estoques de sangue em nível crítico em Minas Gerais',
      resumo: 'A Hemominas alertou que O+, O- e A+ estavam cerca de 50% abaixo do necessário, com os demais tipos em alerta. Doadores de 16 a 69 anos podem agendar pelo site ou pelo aplicativo MG App.',
      url: 'https://tribunademinas.com.br/noticias/minas/28-08-2026/estoques-de-sangue-estao-em-nivel-critico-em-minas-gerais-alerta-hemominas.html' },
    { uf: 'PA', nivel: 'atencao', referencia: '2026', fonte: 'Agência Pará',
      titulo: 'Hemopa registra aumento nas doações e reforça estoque',
      resumo: 'O hemocentro registrou aumento nas doações e reforçou o estoque para emergências. Em junho fez a campanha "Copa do Hemopa" e mantém a Estação de Coleta Castanheira, aberta de segunda a sábado.',
      url: 'https://agenciapara.com.br/noticia/65026/hemopa-registra-aumento-nas-doacoes-de-sangue-e-reforca-estoque-para-emergencias' },
    { uf: 'PB', nivel: 'alerta', referencia: '2026', fonte: 'Governo da Paraíba',
      titulo: 'Hemocentro da Paraíba pede doação de todos os tipos',
      resumo: 'O objetivo é evitar o desabastecimento. O hemocentro intensificou coletas itinerantes em João Pessoa e no interior e recebe doadores de segunda a sábado.',
      url: 'https://paraiba.pb.gov.br/noticias/hemocentro-apela-a-populacao-para-doacao-de-todos-os-tipos-de-sangue-a-fim-de-evitar-desabastecimento' },
    { uf: 'PR', nivel: 'alerta', referencia: 'set/2026', fonte: 'CRN-1',
      titulo: 'Hemepar pede doações: O+ e O- em nível baixo',
      resumo: 'O- e A- aparecem como críticos. O Hemepar abastece mais de 380 hospitais e a rede tem 23 unidades; o agendamento é feito pela plataforma da Secretaria da Saúde.',
      url: 'https://crn1.com.br/2026/09/estoques-de-sangue-o-e-o-estao-em-nivel-baixo-no-parana-hemepar-pede-doacoes' },
    { uf: 'PE', nivel: 'critico', referencia: 'set/2026', fonte: 'Portal de Prefeitura',
      titulo: 'Hemope registra queda de 35% nas doações',
      resumo: 'O número de doadores atendidos caiu 35% nas últimas semanas, com estoque crítico em todos os tipos sanguíneos. O hemocentro reforçou o chamado e mantém coletas externas do Recife a Petrolina.',
      url: 'https://portaldeprefeitura.com.br/saude/hemope-registra-queda-de-35-nas-doacoes-de-sangue-em-pernambuco/631881/' },
    { uf: 'PI', nivel: 'estavel', referencia: 'ago/2026', fonte: 'Hemopi',
      titulo: 'Hemopi divulga estoque adequado ou estável em todos os tipos',
      resumo: 'Na atualização de 21/08, cinco tipos estavam adequados e AB-, O+ e O- estáveis. A rede tem unidades em Teresina, Parnaíba, Picos e Floriano. Em março já houve aviso para O negativo.',
      url: 'https://www.hemopi.pi.gov.br/' },
    { uf: 'RJ', nivel: 'alerta', referencia: 'jan/2026', fonte: 'Tribuna do Sertão',
      titulo: 'Hemorio faz apelo após queda de 42% na coleta',
      resumo: 'Na primeira semana do ano a coleta caiu 42%: o Hemorio precisa de 300 bolsas por dia para atender mais de 100 hospitais públicos, mas chegou a 174. Em setembro houve campanha com o TJRJ.',
      url: 'https://www.tribunadosertao.com.br/rj-em-foco/2026/01/10/842650-hemorio-faz-apelo-por-doacoes-apos-queda-de-42-no-estoque-de-sangue' },
    { uf: 'RN', nivel: 'alerta', referencia: 'jan/2026', fonte: 'Tribuna do Norte',
      titulo: 'Hemonorte convoca população com estoques em nível crítico',
      resumo: 'Todos os tipos estavam afetados no início de 2026, em especial os Rh negativos. A coleta média é de 180 bolsas por dia, quase toda destinada às demandas imediatas dos hospitais.',
      url: 'https://tribunadonorte.com.br/rio-grande-do-norte/hemonorte-convoca-populacao-para-doacao-de-sangue-estoques-estao-em-nivel-critico-no-rn/' },
    { uf: 'RS', nivel: 'atencao', referencia: 'data a confirmar', fonte: 'SES-RS',
      titulo: 'Hemorgs pede doações, sobretudo tipo O e Rh negativo',
      resumo: 'O Hemocentro do Estado atende 42 hospitais e mantém comunicados de estoque baixo, com estoque seguro de A+, B+ e AB+. A data exata do comunicado não foi confirmada na pesquisa: veja o site.',
      url: 'https://saude.rs.gov.br/hemocentro-solicita-doacoes-de-sangue-tipo-o-ou-com-fator-rh-negativo' },
    { uf: 'RO', nivel: 'atencao', referencia: 'jun/2026', fonte: 'Governo de Rondônia',
      titulo: 'Fhemeron pede reforço de A-, B- e O- em Porto Velho',
      resumo: 'Os tipos negativos precisavam de reposição para garantir urgências, cirurgias e tratamentos. O estado tem hemocentros em Porto Velho, Ariquemes, Cacoal, Ji-Paraná, Rolim de Moura e Vilhena.',
      url: 'https://rondonia.ro.gov.br/solidariedade-em-acao-estoques-de-sangue-precisam-de-reforco-em-rondonia/' },
    { uf: 'RR', nivel: 'alerta', referencia: 'set/2026', fonte: 'Folha BV',
      titulo: 'Hemoraima faz apelo urgente por tipos negativos',
      resumo: 'Mais cirurgias e atendimentos aumentaram a procura por bolsas de sangue e plaquetas nas últimas semanas. O hemocentro fica na Av. Brigadeiro Eduardo Gomes, perto do Hospital Geral de Roraima.',
      url: 'https://www.folhabv.com.br/saude-e-bem-estar/hemoraima-convoca-doadores-e-alerta-para-queda-nos-estoques-de-sangue-em-roraima/' },
    { uf: 'SC', nivel: 'critico', referencia: 'set/2026', fonte: 'UNI TV',
      titulo: 'Hemosc alerta para baixa nos estoques',
      resumo: 'O- em nível crítico, O+ em alerta e A- e A+ reduzidos. A rede tem sete hemocentros (Florianópolis, Criciúma, Chapecó, Joaçaba, Lages, Blumenau e Joinville) e unidades de coleta em Tubarão e Jaraguá do Sul.',
      url: 'https://unitv.com.br/destaque/hemosc-alerta-para-baixa-nos-estoques-de-sangue-e-reforca-pedido-de-doacoes-em-santa-catarina/' },
    { uf: 'SP', nivel: 'critico', referencia: '17/09/2026', fonte: 'Agência Brasil',
      titulo: 'Fundação Pró-Sangue alerta para baixo estoque',
      resumo: 'O+, O-, A- e B- estavam em nível crítico, com o O- como o mais preocupante. Quem tomou a vacina do sarampo precisa esperar quatro semanas para doar, por isso a orientação é doar antes de se vacinar.',
      url: 'https://agenciabrasil.ebc.com.br/saude/noticia/2026-09/fundacao-pro-sangue-alerta-para-baixo-estoque-e-faz-apelo-doadores' },
    { uf: 'SE', nivel: 'alerta', referencia: 'set/2026', fonte: 'Infonet',
      titulo: 'Hemose abre no sábado para reforçar estoques',
      resumo: 'A meta é coletar no mínimo 120 bolsas por dia, mas o hemocentro vinha chegando à metade. Todos os tipos estavam baixos, com A-, A+, AB-, O- e O+ entre os mais afetados.',
      url: 'https://infonet.com.br/noticias/saude/hemose-abre-neste-sabado-para-reforcar-estoques-de-sangue/' },
    { uf: 'TO', nivel: 'critico', referencia: '2026', fonte: 'Sou de Palmas',
      titulo: 'Tocantins enfrenta baixa nos estoques e convoca doadores',
      resumo: 'A Secretaria da Saúde pede doações de todos os tipos. Em Palmas a coleta acontece na Unidade de Coleta, anexo ao Hospital Geral, porque o Hemocentro Coordenador está fechado para reforma.',
      url: 'https://soudepalmas.com.br/geral/cotidiano-em-destaque/tocantins-enfrenta-baixa-nos-estoques-de-sangue-e-hemorrede-convoca-doadores-para-garantir-atendimentos-hospitalares' }
];

async function popular() {
    try {
        let novas = 0;
        for (const aviso of AVISOS) {
            const { erro, noticia } = validarNoticia(aviso);
            if (erro) throw new Error(aviso.uf + ': ' + erro);
            const ja = await pool.query('SELECT id FROM noticias WHERE url = $1', [noticia.url]);
            if (ja.rows.length > 0) continue;
            await pool.query(
                'INSERT INTO noticias (uf, titulo, resumo, fonte, url, nivel, referencia) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [noticia.uf, noticia.titulo, noticia.resumo, noticia.fonte, noticia.url, noticia.nivel, noticia.referencia]
            );
            novas++;
        }
        console.log('✅ ' + novas + ' aviso(s) inserido(s) (' + (AVISOS.length - novas) + ' ja existiam).');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

popular();
