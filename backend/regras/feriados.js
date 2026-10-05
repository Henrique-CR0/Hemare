// Hemare - Calendario do sangue: feriados prolongados e o plano de doacao "antes do feriado".
//
// Por que existe: hemocentros brasileiros relatam queda de 30% a 40% nas doacoes perto de feriados prolongados
// (muita gente viaja) e, ao mesmo tempo, a demanda sobe (mais acidentes de transito). As plaquetas duram so
// alguns dias, entao quem doa nos dias ANTES do feriado e quem segura o estoque durante ele.
//
// IMPORTANTE (honestidade): isto e uma previsao de CALENDARIO, nao uma estatistica do Hemare. O risco vem do
// tamanho do feriado (fim de semana prolongado, emenda). So entram feriados nacionais; municipais e estaduais nao.
//
// Datas sao sempre texto 'AAAA-MM-DD' (conta em UTC, sem erro de fuso).
const { verificarElegibilidade } = require('./elegibilidade');
const { paraDia, diasEntre, normalizarCidade } = require('./alerta');

const MS_DIA = 86400000;

// Quando o aviso automatico sai: de 10 dias ate 1 dia antes do inicio do periodo.
const DIAS_DE_AVISO = 10;
// Olhar quantos dias a frente no calendario.
const DIAS_A_FRENTE = 75;

const RISCOS = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' };

const PORQUE = 'Hemocentros brasileiros relatam queda de 30% a 40% nas doações perto de feriados prolongados, quando muita gente viaja, ' +
    'e a demanda sobe com os acidentes de trânsito. As plaquetas duram poucos dias, por isso quem doa nos dias antes do feriado é quem ' +
    'segura o estoque. Esta é uma previsão de calendário (só feriados nacionais), não uma estatística do Hemare.';

function pad(n) { return String(n).padStart(2, '0'); }

function somarDias(dia, n) {
    const d = new Date(Date.parse(dia + 'T00:00:00Z') + n * MS_DIA);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

// 0 = domingo ... 6 = sabado
function diaDaSemana(dia) {
    return new Date(dia + 'T00:00:00Z').getUTCDay();
}

// Domingo de Pascoa (algoritmo de Meeus/Jones/Butcher).
function pascoa(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return ano + '-' + pad(mes) + '-' + pad(dia);
}

// Um feriado isolado vira um periodo conforme o dia da semana (inclui a emenda).
// Devolve { inicio, fim, risco } ou null quando cai no fim de semana (ninguem perde dia util).
function periodoDeFeriadoFixo(data) {
    switch (diaDaSemana(data)) {
        case 1: return { inicio: somarDias(data, -2), fim: data, risco: 'medio' };          // sab-dom-seg
        case 2: return { inicio: somarDias(data, -3), fim: data, risco: 'alto' };           // emenda na segunda: sab a ter
        case 3: return { inicio: data, fim: data, risco: 'baixo' };                          // no meio da semana
        case 4: return { inicio: data, fim: somarDias(data, 3), risco: 'alto' };            // emenda na sexta: qui a dom
        case 5: return { inicio: data, fim: somarDias(data, 2), risco: 'medio' };           // sex-sab-dom
        default: return null;
    }
}

// Feriados NACIONAIS e os periodos de risco que eles formam, num ano civil.
// Natal e Ano Novo viram um periodo so (24/12 a 02/01), que pertence ao ano em que comeca.
function periodosDoAno(ano) {
    const lista = [];
    const adicionar = (nome, data, periodo) => {
        if (periodo) lista.push({ nome, data, ...periodo });
    };

    const pas = pascoa(ano);
    const carnaval = somarDias(pas, -47); // terca-feira de Carnaval
    adicionar('Carnaval', carnaval, { inicio: somarDias(pas, -50), fim: somarDias(pas, -46), risco: 'alto' });
    const sextaSanta = somarDias(pas, -2);
    adicionar('Sexta-feira Santa', sextaSanta, { inicio: sextaSanta, fim: pas, risco: 'medio' });

    const fixos = [
        ['Ano Novo', '-01-01'], ['Tiradentes', '-04-21'], ['Dia do Trabalho', '-05-01'], ['Independência', '-09-07'],
        ['Nossa Senhora Aparecida', '-10-12'], ['Finados', '-11-02'], ['Proclamação da República', '-11-15'],
        ['Consciência Negra', '-11-20']
    ];
    for (const [nome, sufixo] of fixos) {
        if (nome === 'Ano Novo') continue; // entra em "Natal e Ano Novo" do ano anterior
        const data = ano + sufixo;
        adicionar(nome, data, periodoDeFeriadoFixo(data));
    }

    // Corpus Christi e ponto facultativo: pesa um nivel a menos.
    const corpus = somarDias(pas, 60);
    const pCorpus = periodoDeFeriadoFixo(corpus);
    if (pCorpus) adicionar('Corpus Christi', corpus, { ...pCorpus, risco: pCorpus.risco === 'alto' ? 'medio' : 'baixo' });

    adicionar('Natal e Ano Novo', ano + '-12-25', { inicio: ano + '-12-24', fim: (ano + 1) + '-01-02', risco: 'alto' });

    return lista.sort((a, b) => (a.inicio < b.inicio ? -1 : 1))
        .map((p) => ({ ...p, dias: diasEntre(p.inicio, p.fim) + 1 }));
}

// Periodos que ainda importam a partir de 'hoje' (em andamento ou comecando nos proximos dias).
// 'baixo' (feriado no meio da semana) nao entra: nao muda o comportamento de ninguem.
function proximosPeriodos(hoje, diasAFrente) {
    const dia = paraDia(hoje || new Date());
    const limite = somarDias(dia, diasAFrente || DIAS_A_FRENTE);
    const ano = Number(dia.slice(0, 4));
    const todos = [...periodosDoAno(ano - 1), ...periodosDoAno(ano), ...periodosDoAno(ano + 1)];
    return todos
        .filter((p) => p.risco !== 'baixo' && p.fim >= dia && p.inicio <= limite)
        .sort((a, b) => (a.inicio < b.inicio ? -1 : 1))
        .map((p) => ({
            ...p,
            emAndamento: p.inicio <= dia,
            diasParaInicio: Math.max(0, diasEntre(dia, p.inicio)),
            ultimoDiaParaDoar: somarDias(p.inicio, -1)
        }));
}

// Em quanto tempo a pessoa fica apta (0 = ja esta).
function diasParaFicarApto(doador, hoje) {
    const e = verificarElegibilidade(doador.ultima_doacao ? paraDia(doador.ultima_doacao) : null, doador.sexo, paraDia(hoje));
    if (e.diasRestantes === null || e.diasRestantes === undefined) return null; // sexo nao informado
    return e.diasRestantes;
}

// O que a pessoa precisa saber para ajudar ANTES deste periodo.
// doador: { sexo, ultima_doacao }.  Devolve { situacao, aptoEm, janela: { de, ate }, mensagem }.
function planoDoDoador(doador, periodo, hoje) {
    const dia = paraDia(hoje || new Date());
    const ate = periodo.ultimoDiaParaDoar;
    const falta = diasParaFicarApto(doador, dia);
    if (falta === null) {
        return { situacao: 'sem-dados', aptoEm: null, janela: null,
            mensagem: 'Informe o sexo no seu perfil para ver quando você fica apto.' };
    }
    if (periodo.emAndamento) {
        return falta === 0
            ? { situacao: 'apto-agora', aptoEm: dia, janela: { de: dia, ate: periodo.fim },
                mensagem: 'O feriado já começou e você está apto. Se puder, doe: o estoque é o que mais cai agora.' }
            : { situacao: 'apto-depois', aptoEm: somarDias(dia, falta), janela: null,
                mensagem: 'Você fica apto em ' + formatarDia(somarDias(dia, falta)) + '.' };
    }
    const aptoEm = somarDias(dia, falta);
    if (falta === 0) {
        return { situacao: 'apto-agora', aptoEm: dia, janela: { de: dia, ate },
            mensagem: 'Você já está apto. Doe até ' + formatarDia(ate) + ', antes do feriado.' };
    }
    if (aptoEm <= ate) {
        return { situacao: 'apto-antes', aptoEm, janela: { de: aptoEm, ate },
            mensagem: 'Você fica apto em ' + formatarDia(aptoEm) + ', antes do feriado. Doe entre ' + formatarDia(aptoEm) + ' e ' + formatarDia(ate) + '.' };
    }
    return { situacao: 'apto-depois', aptoEm, janela: null,
        mensagem: 'Você só fica apto em ' + formatarDia(aptoEm) + ', depois do feriado. Que tal convidar um amigo para doar no seu lugar?' };
}

function formatarDia(dia) {
    return dia.slice(8, 10) + '/' + dia.slice(5, 7);
}

// Avisar por e-mail (aviso automatico)? So quem pediu, que fica apto antes do periodo, na janela de dias,
// e que ainda nao recebeu aviso deste periodo.
// doador: { quer_aviso_feriado, email, sexo, ultima_doacao };  jaAvisado: true/false
function precisaAvisoFeriado(doador, periodo, hoje, jaAvisado) {
    if (!doador || doador.quer_aviso_feriado !== true || !doador.email || jaAvisado) return false;
    if (periodo.risco === 'baixo' || periodo.emAndamento) return false;
    if (periodo.diasParaInicio > DIAS_DE_AVISO || periodo.diasParaInicio < 1) return false;
    const plano = planoDoDoador(doador, periodo, hoje);
    return plano.situacao === 'apto-agora' || plano.situacao === 'apto-antes';
}

// Contagens para o hospital (SO numeros, nunca a lista): quantos doadores da cidade, identificados ou nao,
// estao aptos agora e quantos estarao aptos ate o ultimo dia antes do periodo.
// doadores: [{ cidade, sexo, ultima_doacao }]
function contarParaHospital(doadores, cidadeHospital, periodo, hoje) {
    const dia = paraDia(hoje || new Date());
    const alvo = normalizarCidade(cidadeHospital);
    const daCidade = (doadores || []).filter((d) => alvo && normalizarCidade(d.cidade) === alvo);
    let aptosAgora = 0, aptosAteOFeriado = 0;
    for (const d of daCidade) {
        const falta = diasParaFicarApto(d, dia);
        if (falta === null) continue;
        if (falta === 0) aptosAgora++;
        if (!periodo.emAndamento && somarDias(dia, falta) <= periodo.ultimoDiaParaDoar) aptosAteOFeriado++;
    }
    return { naCidade: daCidade.length, aptosAgora, aptosAteOFeriado };
}

// Quem o hospital pode chamar: identificado (LGPD), com e-mail, da mesma cidade, apto ate o dia anterior
// ao periodo, e que ainda nao recebeu aviso deste periodo (de nenhuma origem).
// doadores: [{ id, cidade, visibilidade, email, sexo, ultima_doacao }];  avisados: Set de ids
function selecionarParaChamado(doadores, cidadeHospital, periodo, hoje, avisados) {
    const dia = paraDia(hoje || new Date());
    const alvo = normalizarCidade(cidadeHospital);
    const jaAvisados = avisados || new Set();
    const identificados = (doadores || []).filter((d) =>
        alvo && normalizarCidade(d.cidade) === alvo && d.visibilidade === 'identificado' && d.email);
    const aptos = identificados.filter((d) => {
        const plano = planoDoDoador(d, periodo, dia);
        return plano.situacao === 'apto-agora' || plano.situacao === 'apto-antes';
    });
    const convocados = aptos.filter((d) => !jaAvisados.has(d.id));
    return {
        convocados,
        resumo: { identificados: identificados.length, aptos: aptos.length, convocados: convocados.length,
            poupadosPorAvisoRecente: aptos.length - convocados.length }
    };
}

// Hospital pode abrir uma chamada para este periodo? Precisa estar no futuro, nao ser 'baixo' e estar a
// poucos dias (nao adianta chamar com 70 dias de antecedencia).
function podeChamar(periodo) {
    if (!periodo) return { ok: false, erro: 'Período não encontrado.' };
    if (periodo.risco === 'baixo') return { ok: false, erro: 'Este feriado é no meio da semana e não costuma derrubar as doações.' };
    if (periodo.emAndamento) return { ok: false, erro: 'O feriado já começou.' };
    if (periodo.diasParaInicio > 21) return { ok: false, erro: 'Ainda falta muito: chame a partir de 21 dias antes do feriado.' };
    return { ok: true };
}

function descreverChamado(resumo, periodo) {
    if (resumo.convocados > 0) {
        const pessoas = resumo.convocados === 1 ? '1 doador que pode doar' : resumo.convocados + ' doadores que podem doar';
        return '📅 Chamada enviada para ' + pessoas + ' antes de ' + periodo.nome + '.';
    }
    if (resumo.aptos > 0) return 'Os doadores aptos já receberam um aviso para este período. Ninguém foi chamado de novo.';
    return 'Nenhum doador identificado da sua cidade estará apto antes de ' + periodo.nome + '. A chamada não foi enviada.';
}

module.exports = {
    RISCOS, PORQUE, DIAS_DE_AVISO, DIAS_A_FRENTE, somarDias, diaDaSemana, pascoa, periodoDeFeriadoFixo, periodosDoAno,
    proximosPeriodos, planoDoDoador, precisaAvisoFeriado, contarParaHospital, selecionarParaChamado, podeChamar,
    descreverChamado, formatarDia
};
