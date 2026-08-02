// Hemare - Regra de triagem: analisa as respostas e devolve uma ORIENTACAO (nao um diagnostico).
// Niveis: 'verde' (parece apto), 'amarelo' (atencao/confirme), 'vermelho' (impedimento a verificar).

function avaliarTriagem(r) {
    // Listas que vamos preencher com os motivos encontrados.
    const impedimentos = []; // definitivos -> vermelho
    const atencoes = [];     // temporarios ou "confirme" -> amarelo

    // --- Impedimentos definitivos (viram vermelho) ---
    if (r.temHIV) { impedimentos.push('Você marcou HIV/AIDS.'); }
    if (r.temHepatiteB || r.temHepatiteC) { impedimentos.push('Você marcou Hepatite B ou C.'); }
    if (r.temHTLV) { impedimentos.push('Você marcou HTLV.'); }
    if (r.temChagas) { impedimentos.push('Você marcou Doença de Chagas.'); }
    if (r.usaDrogasInjetaveis) { impedimentos.push('Você marcou uso de drogas injetáveis.'); }
    if (r.hepatiteAposOnzeAnos) { impedimentos.push('Você marcou hepatite após os 11 anos de idade.'); }

    // --- Requisitos basicos (viram atencao se nao cumpridos) ---
    if (r.peso !== undefined && r.peso < 50) {
        atencoes.push('Seu peso está abaixo de 50 kg, que é o mínimo para doar.');
    }
    if (r.idade !== undefined && (r.idade < 16 || r.idade > 69)) {
        atencoes.push('A idade para doar é de 16 a 69 anos.');
    }
    if (r.dormiuBem === false) {
        atencoes.push('É importante ter dormido bem antes de doar.');
    }
    if (r.alimentado === false) {
        atencoes.push('Não vá em jejum: é preciso estar alimentado.');
    }

    // --- Impedimentos temporarios (viram atencao) ---
    if (r.tatuagemRecente) {
        atencoes.push('Tatuagem/micropigmentação nos últimos 12 meses pede um tempo de espera.');
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

    // --- Decide o nivel final (vermelho tem prioridade) ---
    if (impedimentos.length > 0) {
        return {
            nivel: 'vermelho',
            titulo: 'Há um ponto importante a verificar',
            motivos: impedimentos
        };
    }
    if (atencoes.length > 0) {
        return {
            nivel: 'amarelo',
            titulo: 'Atenção: confirme alguns pontos no hemocentro',
            motivos: atencoes
        };
    }
    return {
        nivel: 'verde',
        titulo: 'Tudo indica que você pode doar!',
        motivos: []
    };
}

export { avaliarTriagem };