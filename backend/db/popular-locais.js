// Hemare - Popula a tabela de locais com hemocentros oficiais do Brasil.
const pool = require('../banco');

const LOCAIS = [
    ['Fundação Hemope', 'Recife', 'PE', 'R. Joaquim Nabuco, 171 - Graças', '(81) 3182-4600', 'publico'],
    ['Fundação Pró-Sangue - Hemocentro SP', 'São Paulo', 'SP', 'Av. Dr. Enéas C. de Aguiar, 155 - Cerqueira César', '(11) 4573-7800', 'publico'],
    ['HEMORIO', 'Rio de Janeiro', 'RJ', 'R. Frei Caneca, 8 - Centro', '(21) 3916-8300', 'publico'],
    ['Fundação Hemominas', 'Belo Horizonte', 'MG', 'Alameda Ezequiel Dias, 321 - Santa Efigênia', '(31) 3768-7400', 'publico'],
    ['HEMOAM', 'Manaus', 'AM', 'Av. Constantino Nery, 4397 - Chapada', '(92) 3655-0100', 'publico'],
    ['HEMOBA', 'Salvador', 'BA', 'Ladeira do Hospital Geral, s/n - Brotas', '(71) 3116-5652', 'publico'],
    ['HEMOCE', 'Fortaleza', 'CE', 'Av. José Bastos, 3390 - Rodolfo Teófilo', '(85) 3101-2296', 'publico'],
    ['Hemocentro de Brasília - FHB', 'Brasília', 'DF', 'SMHN Quadra 03, Conj. A, Bl. 3 - Asa Norte', '(61) 3327-4413', 'publico'],
    ['HEMORGS', 'Porto Alegre', 'RS', 'Av. Bento Gonçalves, 3722 - Partenon', '(51) 3288-4069', 'publico'],
    ['HEMEPAR', 'Curitiba', 'PR', 'Trav. João Prosdocimo, 145 - Alto da XV', '(41) 3281-4000', 'publico'],
    ['HEMOSC', 'Florianópolis', 'SC', 'Av. Othon Gama D\'Eça, 756 - Centro', '(48) 3251-9711', 'publico'],
    ['HEMOAL', 'Maceió', 'AL', 'Av. Jorge de Lima, 58 - Trapiche da Barra', '(82) 3315-2107', 'publico'],
    ['HEMONORTE', 'Natal', 'RN', 'Av. Alexandrino de Alencar, 1800 - Tirol', '(84) 3232-6767', 'publico'],
    ['HEMOPI', 'Teresina', 'PI', 'R. 1º de Maio, 235 - Centro', '(86) 3221-8319', 'publico'],
    ['HEMOPA', 'Belém', 'PA', 'Trav. Padre Eutíquio, 2109 - Batista Campos', '(91) 3110-6300', 'publico'],
    ['HEMOSE', 'Aracaju', 'SE', 'Av. Tancredo Neves, s/n - Capucho', '(79) 3225-8500', 'publico'],
    ['HEMOMAR', 'São Luís', 'MA', 'R. 5 de Janeiro, s/n - Jordoa', '(98) 3218-7100', 'publico'],
    ['MT Hemocentro', 'Cuiabá', 'MT', 'R. 13 de Junho, 1055 - Porto', '(65) 3623-0044', 'publico'],
    ['HEMOSUL', 'Campo Grande', 'MS', 'Av. Fernando Corrêa da Costa, 1304 - Centro', '(67) 3312-1500', 'publico'],
    ['HEMOGO', 'Goiânia', 'GO', 'Av. Anhanguera, 5195 - Setor Coimbra', '(62) 3201-4560', 'publico']
];

async function popular() {
    try {
        // Evita duplicar: so insere se a tabela estiver vazia.
        const contagem = await pool.query('SELECT COUNT(*) FROM locais');
        if (Number(contagem.rows[0].count) > 0) {
            console.log('ℹ️ A tabela ja tem locais. Nada foi inserido (para evitar duplicar).');
            return;
        }

        for (const L of LOCAIS) {
            await pool.query(
                'INSERT INTO locais (nome, cidade, estado, endereco, telefone, tipo) VALUES ($1, $2, $3, $4, $5, $6)',
                L
            );
        }
        console.log('✅ ' + LOCAIS.length + ' locais inseridos!');
    } catch (erro) {
        console.log('❌ Erro:', erro.message);
    } finally {
        await pool.end();
    }
}

popular();