// Hemare - Regras da Ficha PcD (pessoa com deficiencia): declaracao no perfil e orientacao para a triagem.
//
// BASE: Portaria GM/MS n 11.685, de 2 de julho de 2026 (altera o Anexo IV da Portaria de Consolidacao GM/MS n 5/2017),
// lida no texto oficial do Diario Oficial em 05/10/2026. A norma federal NAO impede a doacao pela deficiencia em si:
// o que conta e a causa (doenca de base, cirurgia), os remedios e a capacidade de entender e consentir.
//
// PRIVACIDADE: deficiencia e dado sensivel (LGPD, art. 11). Fica so no perfil da pessoa, depende de consentimento,
// nunca chega a um hospital, entra no "baixar meus dados" e e apagada ao excluir a conta.
// A ficha em si (as respostas) NAO e guardada: e calculada na hora e so existe na tela.
//
// Esta ficha e uma ORIENTACAO. Quem decide a aptidao e sempre a equipe de triagem do hemocentro.

const NORMA = 'Portaria GM/MS nº 11.685/2026';

const TIPOS = [
    ['fisica', 'Física (mobilidade, amputação, paralisia)'],
    ['visual', 'Visual (baixa visão ou cegueira)'],
    ['auditiva', 'Auditiva (surdez ou deficiência auditiva)'],
    ['intelectual', 'Intelectual'],
    ['psicossocial', 'Psicossocial (saúde mental)'],
    ['tea', 'Transtorno do espectro autista (TEA)'],
    ['multipla', 'Múltipla (mais de uma)']
].map(([valor, rotulo]) => ({ valor, rotulo }));

// O que ajuda no atendimento. Serve so para montar o "avise antes" da ficha; nao muda a aptidao.
const APOIOS = [
    ['mobilidade', 'Cadeira de rodas ou ajuda para me deslocar'],
    ['libras', 'Intérprete de Libras'],
    ['leitura', 'Ajuda para ler e assinar (leitura em voz alta, letra grande, braile)'],
    ['linguagem-simples', 'Explicação em linguagem simples, com calma'],
    ['acompanhante', 'Ir com um acompanhante de confiança'],
    ['prioridade', 'Atendimento prioritário']
].map(([valor, rotulo]) => ({ valor, rotulo }));

const CAUSAS = [
    ['nascenca', 'De nascença, genética ou sensorial (surdez, baixa visão, cegueira), sem doença ativa'],
    ['paralisia-cerebral', 'Paralisia cerebral'],
    ['lesao-trauma', 'Acidente ou trauma (lesão medular, politrauma)'],
    ['amputacao', 'Amputação'],
    ['avc', 'AVC (derrame) no passado'],
    ['neuro-lista', 'Esclerose múltipla ou em placa, ELA, miastenia gravis, neurofibromatose forma maior, hematoma com sequela ou leucoencefalopatia multifocal progressiva'],
    ['epilepsia', 'Epilepsia'],
    ['autoimune', 'Doença autoimune que afeta mais de um órgão (lúpus, artrite reumatoide...)'],
    ['infecciosa', 'Sequela de infecção (por exemplo, meningite ou poliomielite)'],
    ['psiquiatrica', 'Condição psiquiátrica'],
    ['outra', 'Outra causa ou não sei']
].map(([valor, rotulo]) => ({ valor, rotulo }));

const MEDICAMENTOS = [
    ['anticonvulsivante-convulsao', 'Anticonvulsivante para controlar convulsões'],
    ['anticonvulsivante-outro', 'Anticonvulsivante para outra coisa (dor, enxaqueca, humor)'],
    ['antipsicotico', 'Antipsicótico (haloperidol, quetiapina, clorpromazina...)'],
    ['antidepressivo', 'Antidepressivo'],
    ['ansiolitico', 'Ansiolítico ou remédio para dormir'],
    ['anticoagulante', 'Anticoagulante (varfarina, rivaroxabana, apixabana...)'],
    ['antiagregante', 'Antiagregante plaquetário (clopidogrel, ticagrelor...)'],
    ['imunossupressor', 'Imunossupressor ou imunobiológico'],
    ['corticoide', 'Corticoide por via oral ou injetável'],
    ['outro', 'Outro remédio de uso contínuo']
].map(([valor, rotulo]) => ({ valor, rotulo }));

const DECISOES = [
    ['sozinho', 'Eu entendo e decido sozinho(a) sobre a minha saúde'],
    ['com-apoio', 'Eu decido, com o apoio de alguém de confiança para entender'],
    ['por-responsavel', 'Outra pessoa (curador ou responsável legal) decide por mim e eu não consigo compreender o processo de doação']
].map(([valor, rotulo]) => ({ valor, rotulo }));

const SITUACOES_EPILEPSIA = [
    ['em-tratamento', 'Estou em tratamento com anticonvulsivante'],
    ['menos-3-anos', 'Parei o tratamento (com meu médico) há menos de 3 anos, ou tive crise nesse período'],
    ['tres-anos-ou-mais', 'Parei o tratamento (com meu médico) há 3 anos ou mais, sem nenhuma crise']
].map(([valor, rotulo]) => ({ valor, rotulo }));

const NOTA_PRATICA = 'Cada hemocentro aplica a norma com a sua equipe e alguns são mais restritivos do que a norma federal ' +
    '(o Hemominas, por exemplo, lista a síndrome de Down como inaptidão definitiva). Em 01/10/2025 o Ministério Público Federal ' +
    'entrou na Justiça contra a exclusão automática de pessoas com deficiência neurológica. Se você receber um "não", peça o motivo ' +
    'e o prazo: o serviço é obrigado a explicar e a registrar na ficha de triagem (art. 69).';

const AVISO = 'Esta ficha é uma orientação feita a partir da norma federal. Não é diagnóstico nem autorização: quem decide é a equipe de triagem do hemocentro.';

const FONTE = {
    norma: 'Portaria GM/MS nº 11.685, de 2 de julho de 2026 (altera o Anexo IV da Portaria de Consolidação GM/MS nº 5/2017)',
    consultadaEm: '2026-10-05'
};

function ids(lista) { return lista.map((x) => x.valor); }

// Confere uma lista de opcoes: so valores conhecidos, sem repeticao. Devolve { erro } ou { valores }.
function conferirLista(entrada, validos, rotulo, minimo) {
    if (entrada === undefined || entrada === null) entrada = [];
    if (!Array.isArray(entrada)) return { erro: 'Lista de ' + rotulo + ' inválida.' };
    const valores = [];
    for (const v of entrada) {
        if (!validos.includes(v)) return { erro: 'Opção inválida em ' + rotulo + '.' };
        if (!valores.includes(v)) valores.push(v);
    }
    if (valores.length < (minimo || 0)) return { erro: 'Escolha ao menos uma opção em ' + rotulo + '.' };
    return { valores };
}

// Declaracao no perfil. { declarado:false } limpa tudo. Para declarar: tipos, consentimento explicito, apoios opcionais.
// Devolve { erro } ou { pcd: { declarado, tipos, apoios } }.
function validarPcd(corpo) {
    const c = corpo || {};
    if (c.declarado !== true) return { pcd: { declarado: false, tipos: [], apoios: [] } };
    const tipos = conferirLista(c.tipos, ids(TIPOS), 'tipo de deficiência', 1);
    if (tipos.erro) return { erro: tipos.erro };
    const apoios = conferirLista(c.apoios, ids(APOIOS), 'apoios', 0);
    if (apoios.erro) return { erro: apoios.erro };
    if (c.consentimento !== true) {
        return { erro: 'Para guardar esta informação, confirme que você entende que ela é sensível e só aparece para você.' };
    }
    return { pcd: { declarado: true, tipos: tipos.valores, apoios: apoios.valores } };
}

function inteiroOpcional(valor, minimo, maximo, rotulo) {
    if (valor === undefined || valor === null || valor === '') return { valor: undefined };
    const n = Number(valor);
    if (!Number.isInteger(n) || n < minimo || n > maximo) return { erro: rotulo + ' inválido.' };
    return { valor: n };
}

const item = (nivel, texto, base) => ({ nivel, texto, base: base || null });

// Itens de idade e peso (requisitos gerais que valem para todo mundo).
function itensGerais(idade, pesoKg) {
    const itens = [];
    if (idade !== undefined) {
        if (idade < 16) {
            itens.push(item('amarelo', 'Abaixo de 16 anos só é possível com avaliação do médico do serviço e relatório que justifique a necessidade.', 'Art. 39, § 4º'));
        } else if (idade < 18) {
            itens.push(item('ok', 'Entre 16 e 17 anos é preciso levar autorização escrita do responsável legal para cada doação, com cópia da identidade de quem assina.', 'Art. 39, § 1º'));
        } else if (idade >= 70) {
            itens.push(item('amarelo', 'Acima de 69 anos, só continua doando quem já era doador de repetição, após avaliação médica.', 'Art. 39, § 5º'));
        } else if (idade >= 61) {
            itens.push(item('amarelo', 'Se esta for a sua primeira doação, o limite é 60 anos; quem já doa de repetição pode seguir até 69.', 'Art. 39, § 3º'));
        } else {
            itens.push(item('ok', 'Sua idade está dentro da faixa de 16 a 69 anos.', 'Art. 39'));
        }
    }
    if (pesoKg !== undefined) {
        if (pesoKg < 50) {
            itens.push(item('amarelo', 'O peso mínimo é 50 kg. Abaixo disso, só com avaliação médica e volume de coleta reduzido.', 'Art. 40'));
        } else {
            itens.push(item('ok', 'Seu peso atende ao mínimo de 50 kg.', 'Art. 40'));
        }
    }
    return itens;
}

function itemDaCausa(causa, ctx) {
    const meses = ctx.mesesDesdeProcedimento;
    switch (causa) {
        case 'nascenca':
            return item('ok', 'Uma deficiência de nascença, genética ou sensorial, sem doença ativa, não aparece como motivo de inaptidão na norma federal. O que conta é a sua saúde hoje e os remédios que você usa.');
        case 'paralisia-cerebral':
            return item('amarelo', 'A norma federal não cita a paralisia cerebral entre as causas de inaptidão, mas a decisão é caso a caso. Leve um relatório do seu médico e avise o hemocentro antes. Alguns hemocentros pedem que você consiga ir até a poltrona ou maca de coleta e estender o braço (por exemplo, o Hemominas).');
        case 'lesao-trauma':
            if (meses !== undefined && meses >= 12) {
                return item('ok', 'Já passou o prazo de 12 meses depois de politrauma. Cirurgias ortopédicas e de coluna pedem 6 meses. Se houve transplante de órgão ou tecido, a inaptidão é definitiva.', 'Anexo 2');
            }
            return item('amarelo', 'Depois de politrauma a espera é de 12 meses; cirurgias ortopédicas e de coluna (laminectomia, artrodese) pedem 6 meses. Se houve transplante de órgão ou tecido, a inaptidão é definitiva.', 'Anexo 2');
        case 'amputacao':
            if (meses !== undefined && meses >= 6) {
                return item('ok', 'A amputação em si não é impedimento. A cirurgia ortopédica pede 6 meses de espera e esse prazo já passou. O que conta é a causa da amputação (por exemplo, diabetes com insulina é inaptidão definitiva).', 'Anexo 1 e 2');
            }
            return item('amarelo', 'A amputação em si não é impedimento. Cirurgia ortopédica pede 6 meses de espera. O que também conta é a causa (por exemplo, diabetes com insulina é inaptidão definitiva).', 'Anexo 1 e 2');
        case 'avc':
            return item('vermelho', 'Antecedente de AVC é causa de inaptidão definitiva.', 'Anexo 1-A');
        case 'neuro-lista':
            return item('vermelho', 'Essas doenças neurológicas estão na lista de inaptidão definitiva.', 'Anexo 1-A');
        case 'epilepsia':
            if (ctx.epilepsiaSituacao === 'em-tratamento') {
                return item('vermelho', 'Enquanto está em tratamento para convulsão, a norma não permite doar. Se um dia o seu médico suspender o tratamento, a espera é de 3 anos sem crises. Nunca pare o remédio por conta própria para poder doar.', 'Anexo 1-B e Anexo 3');
            }
            if (ctx.epilepsiaSituacao === 'menos-3-anos') {
                return item('amarelo', 'Depois de suspender o tratamento (com o seu médico), a espera é de 3 anos sem nenhuma crise. Ainda não completou esse tempo.', 'Anexo 1-B');
            }
            return item('amarelo', 'Com 3 anos ou mais sem tratamento e sem crise, a norma permite a avaliação. Leve um relatório do neurologista confirmando.', 'Anexo 1-B');
        case 'autoimune':
            return item('vermelho', 'Doenças autoimunes que comprometem mais de um órgão são causa de inaptidão definitiva.', 'Anexo 1-A');
        case 'infecciosa':
            return item('amarelo', 'A infecção precisa estar curada (meningite infecciosa pede 6 meses após a cura). A sequela em si não é citada como impedimento. Leve um relatório do médico.', 'Anexo 1-B');
        case 'psiquiatrica':
            return item('ok', 'Uma condição psiquiátrica só impede a doação se gerar incapacidade jurídica. Os remédios têm regras próprias (veja abaixo).', 'Anexo 1-A');
        default:
            return item('amarelo', 'Essa causa não está na lista da ficha. Leve um relatório do médico que acompanha você, explicando a causa e se há alguma restrição, e converse com o hemocentro antes de ir.');
    }
}

function itemDoMedicamento(m) {
    switch (m) {
        case 'anticonvulsivante-convulsao':
            return item('vermelho', 'Anticonvulsivante usado para convulsão: a norma não permite doar enquanto estiver em uso. Nunca pare o remédio por conta própria para poder doar.', 'Anexo 3');
        case 'anticonvulsivante-outro':
            return item('ok', 'Anticonvulsivante usado para outra coisa que não convulsão não causa inaptidão.', 'Anexo 3');
        case 'antipsicotico':
            return item('amarelo', 'Antipsicóticos pedem 7 dias após a suspensão feita pelo médico que acompanha você, e o caso é avaliado individualmente. Nunca pare o remédio por conta própria.', 'Anexo 3');
        case 'antidepressivo':
            return item('ok', 'Antidepressivos não contraindicam a doação, mas o médico da triagem vai avaliar você.', 'Anexo 3');
        case 'ansiolitico':
            return item('ok', 'Ansiolíticos e remédios para dormir só contraindicam a doação em dose elevada.', 'Anexo 3');
        case 'anticoagulante':
            return item('amarelo', 'Anticoagulantes pedem de 2 a 7 dias após a última dose, conforme o remédio, e a equipe avalia o motivo da prescrição.', 'Anexo 3');
        case 'antiagregante':
            return item('amarelo', 'Antiagregantes plaquetários pedem de 3 a 30 dias, conforme o remédio, e a equipe avalia o motivo da prescrição.', 'Anexo 3');
        case 'imunossupressor':
            return item('amarelo', 'Imunossupressores e imunobiológicos pedem 12 meses após interromper o remédio, avaliando o motivo e as sequelas.', 'Anexo 3');
        case 'corticoide':
            return item('amarelo', 'Corticoides por via oral ou injetável pedem no mínimo 48 horas após suspender, e dependem da doença para a qual foram usados.', 'Anexo 3');
        default:
            return item('amarelo', 'Cada remédio é avaliado individualmente. Leve a receita ou a caixa para a equipe conferir.', 'Art. 44');
    }
}

function itemDaDecisao(decisao) {
    if (decisao === 'por-responsavel') {
        return item('vermelho', 'Quando a deficiência intelectual ou a condição psiquiátrica gera incapacidade jurídica, a norma não permite a doação. A deficiência por si só não retira a sua capacidade (Lei 13.146/2015, arts. 6º e 85, § 1º), então quem avalia isso é a equipe, caso a caso.', 'Anexo 1-A');
    }
    if (decisao === 'com-apoio') {
        return item('amarelo', 'Você precisa entender e assinar o termo de consentimento. É permitido receber apoio para compreender, mas a decisão final é sua e a equipe confere isso na entrevista.', 'Art. 34 e Lei 13.146/2015, art. 12');
    }
    return item('ok', 'Você entende e decide sobre a sua saúde. Isso é o que o termo de consentimento exige.', 'Art. 34');
}

const TEXTO_APOIO = {
    mobilidade: 'Pergunte antes se o serviço tem rampa ou elevador, e como é a passagem da cadeira para a poltrona ou maca de coleta.',
    libras: 'Peça um intérprete de Libras com antecedência. A norma manda explicar os cuidados e os riscos de forma acessível antes de você assinar o termo.',
    leitura: 'Peça que leiam o termo e o questionário em voz alta ou em letra ampliada. A explicação precisa ser acessível e detalhada.',
    'linguagem-simples': 'Peça que a equipe explique em linguagem simples e sem pressa. A norma pede informações em linguagem compreensível.',
    acompanhante: 'Leve um acompanhante adulto de confiança. Ele ajuda você, mas a entrevista e o termo de consentimento continuam sendo seus.',
    prioridade: 'Você tem direito a atendimento prioritário (Lei 10.048/2000). Avise na recepção.'
};

// Avalia a ficha. corpo: { idade?, pesoKg?, causas: [], epilepsiaSituacao?, mesesDesdeProcedimento?, medicamentos: [], decisao?, apoios: [] }
// Devolve { erro } ou { resultado: { nivel, titulo, resumo, avaliacao, apoios, levar, depois, notaPratica, aviso, fonte } }
function avaliarFicha(corpo) {
    const c = corpo || {};
    const idade = inteiroOpcional(c.idade, 0, 120, 'Idade');
    if (idade.erro) return { erro: idade.erro };
    const peso = inteiroOpcional(c.pesoKg, 20, 300, 'Peso');
    if (peso.erro) return { erro: peso.erro };
    const meses = inteiroOpcional(c.mesesDesdeProcedimento, 0, 1200, 'Tempo desde o procedimento');
    if (meses.erro) return { erro: meses.erro };

    const causas = conferirLista(c.causas, ids(CAUSAS), 'causas', 0);
    if (causas.erro) return { erro: causas.erro };
    const meds = conferirLista(c.medicamentos, ids(MEDICAMENTOS), 'medicamentos', 0);
    if (meds.erro) return { erro: meds.erro };
    const apoios = conferirLista(c.apoios, ids(APOIOS), 'apoios', 0);
    if (apoios.erro) return { erro: apoios.erro };

    const decisao = c.decisao === undefined || c.decisao === null || c.decisao === '' ? 'sozinho' : c.decisao;
    if (!ids(DECISOES).includes(decisao)) return { erro: 'Opção inválida em "como você decide sobre a sua saúde".' };

    let epilepsiaSituacao;
    if (causas.valores.includes('epilepsia')) {
        if (!ids(SITUACOES_EPILEPSIA).includes(c.epilepsiaSituacao)) {
            return { erro: 'Para epilepsia, informe se está em tratamento ou há quanto tempo parou.' };
        }
        epilepsiaSituacao = c.epilepsiaSituacao;
    }

    const ctx = { mesesDesdeProcedimento: meses.valor, epilepsiaSituacao };
    const avaliacao = [
        ...itensGerais(idade.valor, peso.valor),
        ...causas.valores.map((causa) => itemDaCausa(causa, ctx)),
        ...meds.valores.map(itemDoMedicamento),
        itemDaDecisao(decisao)
    ];

    const impeditivos = avaliacao.filter((i) => i.nivel === 'vermelho');
    const atencoes = avaliacao.filter((i) => i.nivel === 'amarelo');
    let nivel, titulo, resumo;
    if (impeditivos.length > 0) {
        nivel = 'vermelho';
        titulo = 'Há um ponto que, pela norma, costuma impedir a doação';
        resumo = 'Converse com o hemocentro: a decisão é da equipe, que avalia o seu caso. Se a resposta for "não", você ainda pode ajudar de outras formas.';
    } else if (atencoes.length > 0) {
        nivel = 'amarelo';
        titulo = 'Dá para tentar, mas confirme alguns pontos antes';
        resumo = 'Nada aqui impede de forma definitiva, mas alguns pontos dependem de prazo, de relatório médico ou da avaliação da equipe.';
    } else {
        nivel = 'verde';
        titulo = 'Pelo que você respondeu, nada na norma impede de tentar';
        resumo = 'A equipe do hemocentro ainda faz a triagem completa no dia (pulso, hemoglobina, entrevista).';
    }

    const levar = ['Documento oficial com foto.'];
    if (idade.valor !== undefined && idade.valor >= 16 && idade.valor < 18) {
        levar.push('Autorização escrita do responsável legal e cópia da identidade de quem assina (para cada doação).');
    }
    const causasComRelatorio = causas.valores.filter((x) => !['nascenca', 'psiquiatrica'].includes(x));
    if (causasComRelatorio.length > 0) {
        levar.push('Relatório recente do médico que acompanha você, explicando a causa e se há alguma restrição.');
    }
    if (meds.valores.length > 0) {
        levar.push('Lista dos remédios que você usa, com nome e dose (a receita ou a caixa).');
    }
    if (decisao === 'com-apoio') {
        levar.push('Uma pessoa de confiança junto, para apoiar você a entender o processo.');
    }

    const depois = [
        'Você tem direito de saber o motivo e o prazo de qualquer inaptidão: o serviço registra na ficha de triagem e explica (art. 69).',
        'Quem não pode doar ainda ajuda: no Hemare, convide amigos com o "Traga um amigo" e divulgue campanhas de reposição. O serviço de hemoterapia deve estimular isso (art. 69, § 3º).'
    ];

    return {
        resultado: {
            nivel, titulo, resumo, avaliacao,
            apoios: apoios.valores.map((a) => TEXTO_APOIO[a]),
            levar, depois, notaPratica: NOTA_PRATICA, aviso: AVISO, fonte: FONTE, norma: NORMA
        }
    };
}

// O que as telas precisam para montar as perguntas (conteudo fixo, sem dado de ninguem).
function guia() {
    return {
        tipos: TIPOS, apoios: APOIOS, causas: CAUSAS, medicamentos: MEDICAMENTOS, decisoes: DECISOES,
        situacoesEpilepsia: SITUACOES_EPILEPSIA, aviso: AVISO, notaPratica: NOTA_PRATICA, fonte: FONTE
    };
}

// Coluna de texto simples: 'fisica,visual' <-> ['fisica','visual'] (so valores conhecidos).
function listaDoBanco(texto, validos) {
    return String(texto || '').split(',').filter((v) => validos.includes(v));
}

module.exports = {
    NORMA, TIPOS, APOIOS, CAUSAS, MEDICAMENTOS, DECISOES, SITUACOES_EPILEPSIA, NOTA_PRATICA, AVISO, FONTE,
    validarPcd, avaliarFicha, guia, listaDoBanco
};
