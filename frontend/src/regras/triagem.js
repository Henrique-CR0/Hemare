// Hemare - Regra de triagem: analisa as respostas e devolve uma ORIENTACAO (nao um diagnostico).
// Niveis: 'verde' (parece apto), 'amarelo' (atencao/confirme), 'vermelho' (impedimento a verificar).

function avaliarTriagem(r) {
    const impedimentos = []; // definitivos -> vermelho
    const atencoes = [];     // temporarios ou "confirme" -> amarelo

    // --- Impedimentos definitivos (viram vermelho) ---
    if (r.temHIV) { impedimentos.push('Você marcou HIV/AIDS.'); }
    if (r.temHepatiteB || r.temHepatiteC) { impedimentos.push('Você marcou Hepatite B ou C.'); }
    if (r.temHTLV) { impedimentos.push('Você marcou HTLV.'); }
    if (r.temChagas) { impedimentos.push('Você marcou Doença de Chagas.'); }
    if (r.usaDrogasInjetaveis) { impedimentos.push('Você marcou uso de drogas injetáveis.'); }
    if (r.hepatiteAposOnzeAnos) { impedimentos.push('Você marcou hepatite após os 11 anos de idade.'); }

    // --- Limites oficiais de peso e idade ---
    // Fora deles a pessoa NAO pode doar (impedimento), nao e so um ponto de atencao.
    if (r.peso !== undefined && r.peso > 0 && r.peso < 50) {
        impedimentos.push('Seu peso está abaixo de 50 kg, que é o mínimo para doar.');
    }
    if (r.idade !== undefined && r.idade > 0 && r.idade < 16) {
        impedimentos.push('A idade mínima para doar é 16 anos.');
    }
    // Dentro da faixa, mas com condicoes (viram atencao).
    if (r.idade >= 16 && r.idade <= 17) {
        atencoes.push('Menores de 18 anos precisam do consentimento formal dos pais ou responsáveis.');
    }
    if (r.idade >= 61 && r.idade <= 69) {
        atencoes.push('Se esta for a sua primeira doação, o limite é 60 anos. Quem já doa de repetição pode continuar até os 69.');
    }
    if (r.idade >= 70) {
        atencoes.push('Acima de 70 anos, só continua doando quem já é doador regular e passa pela avaliação da triagem clínica. Alguns hemocentros, como o Hemope, pedem ao menos uma doação nos últimos 12 meses e intervalo de 6 meses entre as doações.');
    }
    if (r.dormiuBem === false) {
        atencoes.push('É importante ter dormido bem antes de doar.');
    }
    if (r.alimentado === false) {
        atencoes.push('Não vá em jejum: é preciso estar alimentado.');
    }

    // --- Impedimentos temporarios (viram atencao) ---
    if (r.tatuagemRecente) {
        atencoes.push('Tatuagem, piercing, maquiagem definitiva ou botox/preenchimento pedem 4 meses de espera (eram 12). O prazo cai para 7 dias se o local tiver alvará sanitário e você levar o comprovante. Piercing na boca ou na região genital: 4 meses depois de retirar.');
    }
    if (r.endoscopiaRecente) {
        atencoes.push('Endoscopia ou colonoscopia pedem 4 meses de espera (eram 6).');
    }
    if (r.gripeResfriado) {
        atencoes.push('Gripe ou resfriado recente pede aguardar alguns dias.');
    }
    if (r.bebidaAlcoolica) {
        atencoes.push('Bebida alcoólica nas últimas 12 horas impede a doação hoje.');
    }
    if (r.gravidezOuPosParto) {
        atencoes.push('Gravidez ou pós-parto recente pede um período de espera.');
    }

    // --- Pontos de atencao (confirmar no hemocentro) ---
    if (r.temDiabetes) {
        atencoes.push('Diabetes: se controlada, geralmente não impede — confirme na triagem.');
    }
    if (r.temHipertensao) {
        atencoes.push('Hipertensão: se controlada, geralmente não impede — confirme na triagem.');
    }
    if (r.usaMedicacaoContinua) {
        atencoes.push('Você usa medicação contínua/controlada. Muitos remédios não impedem a doação, mas alguns pedem um tempo de espera. NUNCA pare um remédio por conta própria para doar — entre em contato com o hemocentro onde vai doar para confirmar.');
    }

    // --- Decide o nivel final (vermelho tem prioridade) ---
    if (impedimentos.length > 0) {
        return { nivel: 'vermelho', titulo: 'Há um ponto importante a verificar', motivos: impedimentos };
    }
    if (atencoes.length > 0) {
        return { nivel: 'amarelo', titulo: 'Atenção: confirme alguns pontos no hemocentro', motivos: atencoes };
    }
    return { nivel: 'verde', titulo: 'Tudo indica que você pode doar!', motivos: [] };
}

export { avaliarTriagem };