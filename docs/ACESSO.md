# Quem pode ver e fazer o quê (autenticação de acesso)

> Decisão de produto + pesquisa, de 30/10/2026. A lista de rotas públicas abaixo é **conferida por teste** (`backend/testes/estrutura/estrutura.js`): se alguém abrir ou fechar uma rota sem decidir, o `npm test` falha. O servidor é quem protege de verdade; o site só organiza a tela.

## 1. A regra em uma frase

**Mostrar o valor antes de pedir o cadastro, e pedir conta só onde há dado de saúde, ação ou dado de outra pessoa.** Informação geral e agregada fica aberta; qualquer coisa que pergunta sobre a saúde de alguém, grava algo ou lista pessoas fica atrás de uma conta do tipo certo.

## 2. Matriz de acesso

| Recurso | Sem conta (visitante) | Doador | Hospital | Admin |
|---|:-:|:-:|:-:|:-:|
| Início, Onde doar, Termômetro de estoque, Notícias, Previsão do sangue | ✅ | ✅ | estoque, notícias, previsão | notícias, previsão |
| Guia da doação, Mitos e verdades, Seus direitos, Placar das cidades | ✅ | ✅ | — | — |
| Página pública de uma campanha (link compartilhado pela família) | ✅ | ✅ | ✅ | ✅ |
| **Triagem "Posso doar?"** | 🔒 *portão de acesso* | ✅ | — | — |
| **Ficha PcD** (guia e cálculo) | 🔒 (API: 401) | ✅ | — | — |
| **Apadrinhar** (lista de pacientes por apelido) | 🔒 *portão de acesso* (API: 401) | ✅ | gerencia os seus | — |
| Agendar, Minhas doações, Meu perfil, Conquistas | 🔒 (login) | ✅ | — | — |
| Estoque, necessidades, agenda, campanhas, sangue raro, Perfil do hospital | 🔒 | — | ✅ (aprovado) | — |
| Aprovar hospitais, coleta e moderação do feed de notícias, **Status do desenvolvimento** (relatório + números de uso) | 🔒 | — | — | ✅ |
| Radar de aptidão | 🔒 | — | ✅ | ✅ |

🔒 = exige conta. "Portão de acesso" = em vez de um login seco, o visitante vê o que a conta libera, por que ela é necessária e o que continua aberto; depois de entrar ou se cadastrar, **volta para a tela que queria** (`?destino=`).

## 3. Rotas públicas da API (a lista inteira)

| Rota | Por que é pública |
|---|---|
| `GET /`, `GET /saude` | verificar que a API está de pé |
| `GET /locais` | mapa de hemocentros (informação pública) |
| `GET /noticias`, `GET /noticias/feed`, `GET /clima`, `GET /doador/placar`, `GET /hospital/estoque-publico` | só números agregados e notícias com título, trecho curto e link da fonte |
| `GET /campanha/:codigo` | a família compartilha o link; só apelido do paciente, sem nome nem diagnóstico |
| `GET /hospital/cadeia/verificar` | auditoria pública da cadeia de confiança: qualquer pessoa confere que as doações não foram alteradas (devolve só números de registro e se cada um é válido, sem dado de ninguém) |
| `POST /auth/cadastro`, `POST /auth/login`, `POST /recuperacao/pedir`, `POST /recuperacao/redefinir` | entrar e criar conta (com limite de tentativas) |

**Mudou nesta rodada** (era público, agora exige conta de doador): `GET /apadrinhamento`, `GET /pcd/guia` e `POST /pcd/ficha`.

## 4. Por que assim (pesquisa e análise)

- **Dado de saúde é dado pessoal sensível** (LGPD, art. 5º, II e art. 11) e pede consentimento específico e destacado, finalidade clara e o mínimo necessário. A triagem e a ficha de PcD perguntam sobre remédios, doenças e procedimentos: por isso só aparecem para quem criou conta e aceitou usar o Hemare. As respostas não são guardadas.
- **Pacientes que procuram padrinhos** aparecem só por apelido, mas mesmo assim a lista não precisa estar aberta ao mundo: minimizar a exposição é mais seguro e quem tem interesse em ajudar já tem conta de doador.
- **O mesmo vale para o servidor**: esconder um botão não protege nada. Por isso cada rota confere o tipo da conta e o teste `papeis.js` tenta o tipo errado em todas elas.
- **Cadastro com atrito demais afasta quem poderia doar.** A literatura de conteúdo restrito em produtos digitais aponta o mesmo caminho: *"portão suave"* (mostrar uma prévia e o motivo antes de pedir dados), manter parte do conteúdo aberta para gerar confiança e alcance, e formulários de cadastro curtos. Por isso o conteúdo educativo, o mapa e as notícias seguem abertos, e o cadastro de doador pede só nome, e-mail e senha (o resto vem depois, no perfil).
- **O app federal Hemovida** (Ministério da Saúde, 2023) também exige entrada com conta (integrada ao ConecteSUS) para a carteira e o histórico do doador, enquanto os hemocentros divulgam os critérios gerais de doação abertamente. O Hemare segue a mesma divisão: critérios gerais abertos, avaliação pessoal com conta.

**Limite honesto:** a regra da triagem ("16 a 69 anos, 50 kg...") é pública (portaria do Ministério) e o código dela vai no navegador; o portão **organiza o fluxo e a coleta com consentimento**, não esconde segredo. O que é realmente protegido (agenda, perfil, pacientes, ficha PcD) está no servidor.

## 5. Como mudar uma regra

1. **Tela**: `frontend/src/App.jsx` (qual porteiro) e `frontend/src/regras/menu.js` (o que aparece no menu; `exigeConta: true` põe o cadeado). Os textos do portão estão em `frontend/src/regras/portoes.js`.
2. **Servidor**: o porteiro na rota (`exigirDoador`, `exigirHospital`, `exigirHospitalAprovado`, `exigirHospitalOuAdmin`, `exigirAdmin`).
3. **Lista pública**: atualize `PUBLICAS_ESPERADAS` em `backend/testes/estrutura/estrutura.js` e a tabela da seção 3. `npm run docs` regenera `docs/API.md`.
