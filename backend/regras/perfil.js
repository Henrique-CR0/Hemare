// Hemare - Regras do perfil do doador: validacao dos dados, foto, completude e "o que o hospital ve".
//
// PRIVACIDADE: hospital so ve nome, telefone, tipo sanguineo e cidade, e so de quem escolheu ser identificado.
// Foto, CPF, data de nascimento, peso, genero, email e contato de emergencia NUNCA chegam a um hospital.
const { UFS } = require('./noticias');
const { dataValida } = require('./campanha');
const { paraDia, diasEntre } = require('./alerta');

const TIPOS_SANGUINEOS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'Rh nulo (sangue dourado)'];

// "Genero" e como a pessoa se identifica. "Sexo" (M/F) e outra coisa: so entra no calculo do intervalo
// entre doacoes (60 dias para homens, 90 para mulheres). Quem decide a aptidao e sempre o hemocentro.
const GENEROS = [
    ['mulher', 'Mulher'], ['homem', 'Homem'], ['mulher-trans', 'Mulher trans'], ['homem-trans', 'Homem trans'],
    ['nao-binario', 'Não binário'], ['outro', 'Outro'], ['nao-informar', 'Prefiro não informar']
].map(([valor, rotulo]) => ({ valor, rotulo }));

const TAMANHO_MAXIMO_FOTO = 90000; // caracteres do texto base64 (a foto chega reduzida: ~256x256)
const PREFIXO_FOTO = 'data:image/jpeg;base64,';

function limpar(texto) {
    return typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim() : '';
}

function somenteDigitos(texto) {
    return String(texto || '').replace(/\D/g, '');
}

// CPF com os dois digitos verificadores.
function cpfValido(texto) {
    const cpf = somenteDigitos(texto);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let d1 = (soma * 10) % 11; if (d1 === 10) d1 = 0;
    if (d1 !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    let d2 = (soma * 10) % 11; if (d2 === 10) d2 = 0;
    return d2 === Number(cpf[10]);
}

function formatarCpf(texto) {
    const d = somenteDigitos(texto);
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// "123.456.789-09" -> "***.456.789-**": da para reconhecer o proprio CPF sem expor o numero.
function mascararCpf(texto) {
    const d = somenteDigitos(texto);
    return d.length === 11 ? '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**' : null;
}

function formatarTelefone(texto) {
    const d = somenteDigitos(texto);
    if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return d;
}

// Idade em anos completos em 'hoje'.
function idadeEm(dataNascimento, hoje) {
    const nasc = paraDia(dataNascimento);
    const dia = paraDia(hoje || new Date());
    let idade = Number(dia.slice(0, 4)) - Number(nasc.slice(0, 4));
    if (dia.slice(5) < nasc.slice(5)) idade--;
    return idade;
}

function validarNome(texto, rotulo, obrigatorio) {
    const nome = limpar(texto);
    if (!nome) return obrigatorio ? { erro: 'Informe ' + rotulo + '.' } : { valor: null };
    if (nome.length < 2 || nome.length > 120) return { erro: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) + ' deve ter de 2 a 120 caracteres.' };
    if (/[0-9]/.test(nome) || !/^[\p{L}][\p{L} '.-]*$/u.test(nome)) {
        return { erro: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) + ' só pode ter letras, espaços, hífen, apóstrofo e ponto.' };
    }
    return { valor: nome };
}

// Confere o formulario do perfil. Campos vazios opcionais viram null; cpf ausente (undefined) significa "nao mudou".
// hoje: 'AAAA-MM-DD' (opcional, para testar). Devolve { erro } ou { perfil }.
function validarPerfil(corpo, hoje) {
    const c = corpo || {};
    const dia = paraDia(hoje || new Date());

    const nome = validarNome(c.nome, 'seu nome', true);
    if (nome.erro) return { erro: nome.erro };
    const nomeSocial = validarNome(c.nomeSocial, 'o nome social', false);
    if (nomeSocial.erro) return { erro: nomeSocial.erro };

    if (!TIPOS_SANGUINEOS.includes(c.tipoSanguineo)) return { erro: 'Escolha o tipo sanguíneo.' };
    if (c.sexo !== 'M' && c.sexo !== 'F') return { erro: 'Escolha o sexo usado no intervalo entre doações (M ou F).' };

    const cidade = limpar(c.cidade);
    if (cidade.length < 2 || cidade.length > 100) return { erro: 'Informe sua cidade.' };

    let estado = null;
    if (c.estado) {
        estado = String(c.estado).trim().toUpperCase();
        if (!UFS.some((e) => e.sigla === estado)) return { erro: 'Estado inválido.' };
    }

    let genero = null;
    if (c.genero) {
        if (!GENEROS.some((g) => g.valor === c.genero)) return { erro: 'Escolha uma opção de gênero da lista.' };
        genero = c.genero;
    }

    let dataNascimento = null;
    if (c.dataNascimento) {
        if (!dataValida(c.dataNascimento)) return { erro: 'Data de nascimento inválida.' };
        const idade = idadeEm(c.dataNascimento, dia);
        if (diasEntre(dia, c.dataNascimento) > 0 || idade > 110) return { erro: 'Confira a data de nascimento.' };
        dataNascimento = c.dataNascimento;
    }

    let pesoKg = null;
    if (c.pesoKg !== undefined && c.pesoKg !== null && c.pesoKg !== '') {
        pesoKg = Number(c.pesoKg);
        if (!Number.isInteger(pesoKg) || pesoKg < 20 || pesoKg > 300) return { erro: 'O peso deve ser um número inteiro de kg (20 a 300).' };
    }

    let telefone = null;
    if (c.telefone) {
        const d = somenteDigitos(c.telefone);
        if (d.length < 10 || d.length > 11) return { erro: 'Telefone inválido: use DDD + número.' };
        telefone = formatarTelefone(d);
    }

    let cpf; // undefined = nao mudou
    if (c.cpf !== undefined && c.cpf !== null && c.cpf !== '') {
        if (!cpfValido(c.cpf)) return { erro: 'CPF inválido. Confira os números.' };
        cpf = formatarCpf(c.cpf);
    }

    const visibilidade = c.visibilidade === 'identificado' ? 'identificado' : 'anonimo';
    if (visibilidade === 'identificado' && !telefone) {
        return { erro: 'Para aparecer aos hospitais, informe um telefone de contato.' };
    }

    // Contato de emergencia: nome e telefone juntos ou nenhum. So aparece na carteirinha da pessoa.
    const emNome = validarNome(c.contatoEmergenciaNome, 'o nome do contato de emergência', false);
    if (emNome.erro) return { erro: emNome.erro };
    let emTelefone = null;
    if (c.contatoEmergenciaTelefone) {
        const d = somenteDigitos(c.contatoEmergenciaTelefone);
        if (d.length < 10 || d.length > 11) return { erro: 'Telefone do contato de emergência inválido.' };
        emTelefone = formatarTelefone(d);
    }
    if ((emNome.valor === null) !== (emTelefone === null)) {
        return { erro: 'Para o contato de emergência, informe nome e telefone (ou deixe os dois vazios).' };
    }

    return {
        perfil: {
            nome: nome.valor, nomeSocial: nomeSocial.valor, tipoSanguineo: c.tipoSanguineo, sexo: c.sexo, genero,
            cidade, estado, dataNascimento, pesoKg, telefone, cpf, visibilidade,
            contatoEmergenciaNome: emNome.valor, contatoEmergenciaTelefone: emTelefone
        }
    };
}

// Foto: so JPEG pequeno em texto (o navegador reduz para ~256x256 e, de quebra, apaga os metadados da camera,
// como localizacao). Confere o tipo pelos primeiros bytes, nao pelo que o texto diz ser.
// valor: undefined = nao mudou; null/'' = remover; texto = nova foto. Devolve { erro } ou { foto } (foto undefined = nao mudou).
function validarFoto(valor) {
    if (valor === undefined) return { foto: undefined };
    if (valor === null || valor === '') return { foto: null };
    if (typeof valor !== 'string' || !valor.startsWith(PREFIXO_FOTO)) return { erro: 'A foto deve ser uma imagem JPEG.' };
    if (valor.length > TAMANHO_MAXIMO_FOTO) return { erro: 'A foto ficou grande demais. Escolha outra imagem.' };
    const base64 = valor.slice(PREFIXO_FOTO.length);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { erro: 'A foto não está em um formato válido.' };
    const bytes = Buffer.from(base64.slice(0, 8), 'base64');
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        return { erro: 'O arquivo enviado não é uma imagem JPEG.' };
    }
    return { foto: valor };
}

// Quanto do perfil esta preenchido e o que falta (com o peso de cada item).
function completude(perfil) {
    const p = perfil || {};
    const itens = [
        { campo: 'nome', peso: 5, rotulo: 'Nome', ok: !!p.nome },
        { campo: 'foto', peso: 10, rotulo: 'Adicionar uma foto', ok: !!p.foto },
        { campo: 'tipoSanguineo', peso: 15, rotulo: 'Informar o tipo sanguíneo', ok: !!p.tipoSanguineo },
        { campo: 'sexo', peso: 10, rotulo: 'Informar o sexo do intervalo entre doações', ok: !!p.sexo },
        { campo: 'cidade', peso: 10, rotulo: 'Informar a cidade', ok: !!p.cidade },
        { campo: 'estado', peso: 5, rotulo: 'Informar o estado', ok: !!p.estado },
        { campo: 'dataNascimento', peso: 10, rotulo: 'Informar a data de nascimento', ok: !!p.dataNascimento },
        { campo: 'telefone', peso: 10, rotulo: 'Informar um telefone', ok: !!p.telefone },
        { campo: 'cpf', peso: 10, rotulo: 'Informar o CPF', ok: !!p.temCpf },
        { campo: 'genero', peso: 5, rotulo: 'Informar o gênero', ok: !!p.genero },
        { campo: 'pesoKg', peso: 5, rotulo: 'Informar o peso', ok: !!p.pesoKg },
        { campo: 'contatoEmergencia', peso: 5, rotulo: 'Cadastrar um contato de emergência', ok: !!(p.contatoEmergenciaNome && p.contatoEmergenciaTelefone) }
    ];
    const total = itens.reduce((s, i) => s + i.peso, 0);
    const feito = itens.filter((i) => i.ok).reduce((s, i) => s + i.peso, 0);
    const faltando = itens.filter((i) => !i.ok).sort((a, b) => b.peso - a.peso).map(({ campo, rotulo, peso }) => ({ campo, rotulo, peso }));
    return { porcentagem: Math.round((feito / total) * 100), faltando };
}

// O que o hospital enxerga de um doador. A rota do match usa EXATAMENTE esta funcao, entao a
// "visao do hospital" mostrada no perfil nunca diverge do que acontece de verdade.
// doador: { id, nome, nome_social, tipo_sanguineo, cidade, visibilidade, telefone }
// O hospital ve o NOME SOCIAL quando a pessoa tem um (direito garantido no atendimento do SUS).
function visaoDoHospital(doador) {
    const identificado = doador.visibilidade === 'identificado';
    return {
        doador_id: identificado ? doador.id : null,
        nome: identificado ? (doador.nome_social || doador.nome) : 'Doador anônimo',
        tipo_sanguineo: doador.tipo_sanguineo,
        cidade: doador.cidade,
        telefone: identificado ? (doador.telefone || 'Não informado') : null,
        identificado
    };
}

// Lista para a tela: o que o hospital ve agora e o que nunca ve.
function descreverVisaoDoHospital(doador) {
    const v = visaoDoHospital(doador);
    const ve = [
        { rotulo: 'Nome', valor: v.nome },
        { rotulo: 'Telefone', valor: v.telefone === null ? 'Protegido 🔒' : v.telefone },
        { rotulo: 'Tipo sanguíneo', valor: v.tipo_sanguineo },
        { rotulo: 'Cidade', valor: v.cidade || '—' }
    ];
    const naoVe = ['Foto', 'CPF', 'Data de nascimento', 'Peso', 'Gênero', 'Condição de PcD', 'E-mail', 'Contato de emergência', 'Histórico de doações'];
    return { identificado: v.identificado, ve, naoVe };
}

module.exports = {
    TIPOS_SANGUINEOS, GENEROS, TAMANHO_MAXIMO_FOTO, cpfValido, formatarCpf, mascararCpf, formatarTelefone, idadeEm,
    validarPerfil, validarFoto, completude, visaoDoHospital, descreverVisaoDoHospital
};
