// Testes das regras do perfil do doador. Rode: node regras/testar-perfil.js
const {
    cpfValido, formatarCpf, mascararCpf, formatarTelefone, idadeEm, validarPerfil, validarFoto,
    completude, visaoDoHospital, descreverVisaoDoHospital, TAMANHO_MAXIMO_FOTO
} = require('./perfil');

let falhas = 0;
function verificar(descricao, obtido, esperado) {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log((ok ? '✅ ' : '❌ ') + descricao + (ok ? '' : '  (obtido: ' + JSON.stringify(obtido) + ', esperado: ' + JSON.stringify(esperado) + ')'));
}

const HOJE = '2026-10-02';
const base = { nome: 'Maria da Silva', tipoSanguineo: 'O-', sexo: 'F', cidade: 'Recife' };

console.log('--- CPF e telefone ---');
verificar('CPF valido', cpfValido('529.982.247-25'), true);
verificar('CPF valido so com numeros', cpfValido('52998224725'), true);
verificar('CPF com digito errado', cpfValido('529.982.247-26'), false);
verificar('CPF repetido (111...)', cpfValido('111.111.111-11'), false);
verificar('CPF curto', cpfValido('123'), false);
verificar('formata CPF', formatarCpf('52998224725'), '529.982.247-25');
verificar('mascara CPF', mascararCpf('529.982.247-25'), '***.982.247-**');
verificar('mascara CPF invalido: null', mascararCpf('123'), null);
verificar('formata celular', formatarTelefone('81999990001'), '(81) 99999-0001');
verificar('formata fixo', formatarTelefone('8133334444'), '(81) 3333-4444');

console.log('--- Idade ---');
verificar('antes do aniversario', idadeEm('2000-12-31', HOJE), 25);
verificar('no dia do aniversario', idadeEm('2000-10-02', HOJE), 26);
verificar('depois do aniversario', idadeEm('2000-01-15', HOJE), 26);
verificar('aceita Date vindo do banco', idadeEm(new Date(2000, 0, 15), HOJE), 26);

console.log('--- Validacao do perfil ---');
verificar('so o essencial: aceita', validarPerfil(base, HOJE).perfil.nome, 'Maria da Silva');
verificar('opcionais viram null', validarPerfil(base, HOJE).perfil.nomeSocial, null);
verificar('cpf ausente = nao mudou (undefined)', validarPerfil(base, HOJE).perfil.cpf, undefined);
verificar('sem nome: recusa', typeof validarPerfil({ ...base, nome: '' }, HOJE).erro, 'string');
verificar('nome com numero: recusa', typeof validarPerfil({ ...base, nome: 'Maria 2' }, HOJE).erro, 'string');
verificar('nome com HTML: recusa', typeof validarPerfil({ ...base, nome: '<b>Maria</b>' }, HOJE).erro, 'string');
verificar('nome com acento e apostrofo', validarPerfil({ ...base, nome: "João D'Ávila-Neto" }, HOJE).perfil.nome, "João D'Ávila-Neto");
verificar('espacos extras sao limpos', validarPerfil({ ...base, nome: '  Maria   da  Silva ' }, HOJE).perfil.nome, 'Maria da Silva');
verificar('nome social invalido: recusa', typeof validarPerfil({ ...base, nomeSocial: 'Ana 99' }, HOJE).erro, 'string');
verificar('tipo sanguineo invalido', typeof validarPerfil({ ...base, tipoSanguineo: 'Z+' }, HOJE).erro, 'string');
verificar('Rh nulo aceito', validarPerfil({ ...base, tipoSanguineo: 'Rh nulo (sangue dourado)' }, HOJE).perfil.tipoSanguineo, 'Rh nulo (sangue dourado)');
verificar('sexo invalido', typeof validarPerfil({ ...base, sexo: 'X' }, HOJE).erro, 'string');
verificar('cidade vazia', typeof validarPerfil({ ...base, cidade: ' ' }, HOJE).erro, 'string');
verificar('estado em minuscula', validarPerfil({ ...base, estado: 'pe' }, HOJE).perfil.estado, 'PE');
verificar('estado invalido', typeof validarPerfil({ ...base, estado: 'ZZ' }, HOJE).erro, 'string');
verificar('genero da lista', validarPerfil({ ...base, genero: 'nao-binario' }, HOJE).perfil.genero, 'nao-binario');
verificar('genero fora da lista', typeof validarPerfil({ ...base, genero: 'xyz' }, HOJE).erro, 'string');
verificar('nascimento valido', validarPerfil({ ...base, dataNascimento: '1990-05-20' }, HOJE).perfil.dataNascimento, '1990-05-20');
verificar('nascimento no futuro', typeof validarPerfil({ ...base, dataNascimento: '2027-01-01' }, HOJE).erro, 'string');
verificar('nascimento impossivel (31/02)', typeof validarPerfil({ ...base, dataNascimento: '1990-02-31' }, HOJE).erro, 'string');
verificar('nascimento ha mais de 110 anos', typeof validarPerfil({ ...base, dataNascimento: '1900-01-01' }, HOJE).erro, 'string');
verificar('peso valido', validarPerfil({ ...base, pesoKg: '72' }, HOJE).perfil.pesoKg, 72);
verificar('peso nao inteiro', typeof validarPerfil({ ...base, pesoKg: 72.5 }, HOJE).erro, 'string');
verificar('peso absurdo', typeof validarPerfil({ ...base, pesoKg: 900 }, HOJE).erro, 'string');
verificar('telefone formatado', validarPerfil({ ...base, telefone: '81999990001' }, HOJE).perfil.telefone, '(81) 99999-0001');
verificar('telefone curto', typeof validarPerfil({ ...base, telefone: '12345' }, HOJE).erro, 'string');
verificar('cpf valido vira formatado', validarPerfil({ ...base, cpf: '52998224725' }, HOJE).perfil.cpf, '529.982.247-25');
verificar('cpf invalido: recusa', typeof validarPerfil({ ...base, cpf: '111.111.111-11' }, HOJE).erro, 'string');
verificar('identificado sem telefone: recusa', typeof validarPerfil({ ...base, visibilidade: 'identificado' }, HOJE).erro, 'string');
verificar('identificado com telefone: ok', validarPerfil({ ...base, visibilidade: 'identificado', telefone: '81999990001' }, HOJE).perfil.visibilidade, 'identificado');
verificar('visibilidade desconhecida vira anonimo', validarPerfil({ ...base, visibilidade: 'qualquer' }, HOJE).perfil.visibilidade, 'anonimo');
verificar('contato de emergencia completo', [validarPerfil({ ...base, contatoEmergenciaNome: 'João', contatoEmergenciaTelefone: '81988887777' }, HOJE).perfil.contatoEmergenciaNome,
    validarPerfil({ ...base, contatoEmergenciaNome: 'João', contatoEmergenciaTelefone: '81988887777' }, HOJE).perfil.contatoEmergenciaTelefone], ['João', '(81) 98888-7777']);
verificar('contato so com nome: recusa', typeof validarPerfil({ ...base, contatoEmergenciaNome: 'João' }, HOJE).erro, 'string');
verificar('contato so com telefone: recusa', typeof validarPerfil({ ...base, contatoEmergenciaTelefone: '81988887777' }, HOJE).erro, 'string');
verificar('corpo vazio nao quebra', typeof validarPerfil(undefined, HOJE).erro, 'string');

console.log('--- Foto ---');
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/';
verificar('nao mudou (undefined)', validarFoto(undefined), { foto: undefined });
verificar('remover (null)', validarFoto(null), { foto: null });
verificar('remover (vazio)', validarFoto(''), { foto: null });
verificar('JPEG valido', validarFoto(JPEG).foto, JPEG);
verificar('PNG recusado', typeof validarFoto('data:image/png;base64,iVBORw0KGgo=').erro, 'string');
verificar('SVG recusado (poderia ter script)', typeof validarFoto('data:image/svg+xml;base64,PHN2Zz4=').erro, 'string');
verificar('texto qualquer recusado', typeof validarFoto('http://exemplo.com/foto.jpg').erro, 'string');
verificar('nao-texto recusado', typeof validarFoto({ a: 1 }).erro, 'string');
verificar('diz ser JPEG mas nao e (bytes errados)', typeof validarFoto('data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUg==').erro, 'string');
verificar('base64 com caracteres estranhos', typeof validarFoto('data:image/jpeg;base64,/9j/<script>').erro, 'string');
verificar('grande demais', typeof validarFoto('data:image/jpeg;base64,/9j/' + 'A'.repeat(TAMANHO_MAXIMO_FOTO)).erro, 'string');

console.log('--- Completude ---');
verificar('vazio: so o nome conta (5%)', completude({ nome: 'Ana' }).porcentagem, 5);
const completo = {
    nome: 'Ana', foto: 'x', tipoSanguineo: 'O-', sexo: 'F', cidade: 'Recife', estado: 'PE', dataNascimento: '1990-01-01',
    telefone: '(81) 99999-0001', temCpf: true, genero: 'mulher', pesoKg: 60, contatoEmergenciaNome: 'João', contatoEmergenciaTelefone: '(81) 98888-7777'
};
verificar('tudo preenchido: 100% e nada falta', [completude(completo).porcentagem, completude(completo).faltando.length], [100, 0]);
verificar('sem foto: 90%', completude({ ...completo, foto: null }).porcentagem, 90);
verificar('sugestao mais valiosa primeiro', completude({ ...completo, foto: null, pesoKg: null, tipoSanguineo: '' }).faltando.map((f) => f.campo), ['tipoSanguineo', 'foto', 'pesoKg']);
verificar('contato incompleto nao conta', completude({ ...completo, contatoEmergenciaTelefone: null }).faltando.map((f) => f.campo), ['contatoEmergencia']);
verificar('sem argumentos nao quebra', completude().porcentagem, 0);

console.log('--- O que o hospital ve ---');
const doador = { id: 7, nome: 'Maria da Silva', tipo_sanguineo: 'O-', cidade: 'Recife', visibilidade: 'identificado', telefone: '(81) 99999-0001' };
verificar('identificado: nome, id e telefone', visaoDoHospital(doador), {
    doador_id: 7, nome: 'Maria da Silva', tipo_sanguineo: 'O-', cidade: 'Recife', telefone: '(81) 99999-0001', identificado: true
});
verificar('anonimo: sem nome, id e telefone', visaoDoHospital({ ...doador, visibilidade: 'anonimo' }), {
    doador_id: null, nome: 'Doador anônimo', tipo_sanguineo: 'O-', cidade: 'Recife', telefone: null, identificado: false
});
verificar('identificado com nome social: o hospital ve o nome social', visaoDoHospital({ ...doador, nome_social: 'Mariana' }).nome, 'Mariana');
verificar('anonimo com nome social: continua anonimo', visaoDoHospital({ ...doador, nome_social: 'Mariana', visibilidade: 'anonimo' }).nome, 'Doador anônimo');
verificar('identificado sem telefone: "Não informado"', visaoDoHospital({ ...doador, telefone: null }).telefone, 'Não informado');
const desc = descreverVisaoDoHospital({ ...doador, visibilidade: 'anonimo' });
verificar('anonimo: telefone aparece como protegido', desc.ve.find((i) => i.rotulo === 'Telefone').valor, 'Protegido 🔒');
verificar('foto e CPF nunca aparecem para o hospital', ['Foto', 'CPF', 'E-mail'].every((r) => desc.naoVe.includes(r)), true);
verificar('o que o hospital ve nunca inclui CPF nem foto', desc.ve.some((i) => /cpf|foto/i.test(i.rotulo)), false);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exit(falhas === 0 ? 0 : 1);
