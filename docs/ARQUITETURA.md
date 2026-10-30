# Revisão arquitetural do Hemare

> Revisão feita em 30/10/2026, sobre o código da `main` mais os PRs #23 (agendamento) e #24 (sessão). Leia junto com [`API.md`](API.md) (gerada do código). O que já foi corrigido nesta rodada está marcado com ✅; o resto vira roteiro, em ordem de prioridade.

## 1. Como o sistema é hoje

```
 Navegador (React 19 + Vite + React Router)
   ├─ paginas/ e componentes/   telas
   ├─ regras/                   cópias de regras puras (triagem) e textos de data
   ├─ sessao.js                 login automático, renovação e saída segura
   └─ config.js                 descobre a URL da API (localhost, Codespaces ou VITE_API_URL)
        │  HTTPS + JSON + "Authorization: Bearer <JWT>"
        ▼
 API (Node 22 + Express 5)  ── servidor.js: CORS, cabeçalhos, JSON, 404 e erros
   ├─ middleware/   autenticar (JWT + sessão encerrável), exigirPapel (admin, hospital aprovado), erros500
   ├─ rotas/        17 arquivos, 86 rotas: validam o pedido, falam com o banco, montam a resposta
   ├─ regras/       20 arquivos de REGRAS PURAS (sem banco, sem Express), cada um com o seu teste
   ├─ servicos/     registrarDoacao (cadeia de confiança), sessoes, e-mails
   ├─ tarefas/      lembretes por e-mail rodando dentro do servidor (setInterval)
   └─ db/           scripts de banco, na ordem de db/ordem.js (npm run migrar)
        │  pg (Pool)
        ▼
 PostgreSQL (Neon)             Resend (e-mail)
```

**O que está bem desenhado (manter):**

1. **Regras de negócio puras e testadas.** Nenhum dos 20 arquivos de `regras/` toca no banco. Elegibilidade, triagem, agendamento, cadeia de confiança, privacidade (`visaoDoHospital`) são funções com entrada e saída, testáveis em milissegundos. É o ponto mais forte do projeto.
2. **Privacidade como regra de código, não de boa vontade.** O que o hospital vê de um doador passa por UMA função; a rede de sangue raro e o calendário de feriados só devolvem números; excluir a conta anonimiza e preserva a cadeia. Isso está coberto por teste.
3. **Cadeia de confiança** (hash encadeado das doações) com um único serviço (`registrarDoacao`) usado por todos os caminhos (confirmação normal, campanha, rede rara, agenda).
4. **Migrações idempotentes** (`IF NOT EXISTS`): rodar de novo nunca estraga.
5. **Acessibilidade** (eMAG, VLibras, contraste, teclado) de primeira classe, não um extra.

## 2. Achados e o que foi feito

Severidade: **alta** (risco real hoje), **média** (dívida que cobra juros), **baixa** (melhoria). Esforço: P (horas), M (dias), G (semanas).

### Alta

| # | Achado | O que fazer | Esforço | Situação |
|---|---|---|---|---|
| A1 | **Passo a passo de banco novo estava incompleto.** O README listava os scripts `criar-*` mas esquecia `ajustar-doadores`, `ajustar-contato`, `ajustar-hospitais`, `ajustar-cnes`, `ajustar-cadeia`, `ajustar-coluna` e `atualizar-coordenadas`. Num banco novo faltariam CPF, telefone, CNPJ, CNES, hash das doações e as coordenadas do mapa. | Lista única e ordenada em `db/ordem.js`, `npm run migrar` (anota o que já rodou), e um teste que monta um banco **vazio** só com essa lista e usa o sistema. | P | ✅ |
| A2 | **Login sem proteção contra tentativas em série**, e-mail diferenciando maiúsculas, resposta mais rápida quando o e-mail não existe. | Limite por conta, e-mail em minúsculas, comparação de senha sempre executada. | P | ✅ (PR #24) |
| A3 | **Código de recuperação de senha adivinhável**: `Math.random`, 6 dígitos, sem limite de tentativas dentro dos 15 minutos. | `crypto.randomInt`, 5 erros travam, 5 pedidos por hora. | P | ✅ (PR #24) |
| A4 | **Token roubado seguia válido** depois de trocar a senha ou excluir a conta (até 1 dia). | `usuarios.sessao_valida_apos` + conferência no `autenticar`. | M | ✅ (PR #24) |
| A5 | **A cadeia de confiança podia "abrir um galho"**: duas confirmações simultâneas liam o mesmo último hash. A verificação passaria a acusar quebra sem ter fraude. | Trava de transação (`pg_advisory_xact_lock`) em `registrarDoacao`. | P | ✅ (não dá para provar no pg-mem: ele roda uma consulta por vez; no Postgres a trava serializa) |
| A6 | **Respostas 500 devolviam a mensagem do banco** ("duplicate key ... constraint ..."), que entrega nomes de tabela e coluna. Há cerca de 70 pontos assim. | Em produção a resposta vira uma frase genérica e o detalhe vai para o log (um único middleware). | P | ✅ |
| A7 | **JWT em `localStorage`.** Qualquer XSS lê o token. | Cookie `httpOnly` + `SameSite=Lax` + CSRF token nas rotas que escrevem; exige frontend e API sob o mesmo "site" (domínio) ou CORS com credenciais. | M | ⬜ Recomendado antes de abrir ao público |
| A8 | **Tarefas agendadas dentro do processo da API** (`setInterval`). Com duas instâncias, cada uma envia os e-mails. Hoje o banco evita repetição (uma flag por envio), mas é corrida, não garantia. | Disparar por agendador externo (cron do host, GitHub Actions `schedule`) chamando `node tarefas/x.js`, ou `pg_advisory_lock` no início da rodada. | P | ⬜ |

### Média

| # | Achado | O que fazer | Esforço | Situação |
|---|---|---|---|---|
| M1 | **Sem CI.** Os testes existiam só na máquina de quem escrevia. | `npm test` dentro do repositório e workflow do GitHub Actions rodando testes, lint e build a cada PR. | P | ✅ |
| M2 | **Documentação da API inexistente** (86 rotas). | Gerada do código: `docs/API.md` + `docs/openapi.json`; um teste falha se ficar desatualizada. | P | ✅ |
| M3 | **SQL espalhado nas rotas** (183 consultas em 17 arquivos de rotas). Regras de negócio estão separadas, mas o acesso a dados não: a mesma consulta aparece em mais de um arquivo. | Camada `repositorios/` (um arquivo por recurso) só com SQL; as rotas passam a chamar funções. Começar pelos recursos mais mexidos: doador, hospital, doação. | G | ⬜ |
| M4 | **Helpers repetidos**: `opcional()` em 3 rotas, `paraDia`/`somarDias` em 3 regras, regra de triagem copiada no frontend. | Mover para `regras/datas.js` e `servicos/consulta.js`. A cópia da triagem agora é conferida por teste; o ideal é o frontend importar do mesmo arquivo (workspace npm). | M | 🟡 cópia conferida por teste |
| M5 | **Frontend com 83 `fetch` soltos** repetindo cabeçalho, token e tratamento de erro. | Um cliente `api.js` (`api.get('/x')`) que cuida de URL, token, JSON e erros. O interceptador de `sessao.js` já resolve o 401 sem tocar nas telas. | M | 🟡 |
| M6 | **Pacote único de 556 KB** (aviso do build): Leaflet (mapa) vai junto para quem só quer a tela de login. | `React.lazy` nas rotas pesadas (`Locais`, painéis) e `manualChunks` para Leaflet. | P | ⬜ |
| M7 | **Listagens sem paginação** (`/hospital/necessidades`, `/noticias`, `/agenda/vagas`...). Crescem sem limite. | `?limite=` e `?pagina=` com padrão de 50 e teto de 200. | M | ⬜ |
| M8 | **Sem versão na API.** Mudar um formato quebra quem já usa. | Prefixo `/v1` (e manter as rotas antigas por um tempo). Vale quando houver um cliente além do site. | P | ⬜ |
| M9 | **Limite de tentativas em memória.** Reinicia com o servidor e não é compartilhado entre instâncias. | Redis (ou tabela) quando houver mais de uma instância. | M | ⬜ |

### Baixa

| # | Achado | O que fazer |
|---|---|---|
| B1 | Log só com `console.log`. | `pino` com id de requisição e níveis; alerta em 5xx. |
| B2 | Sem validação central de entrada (cada rota valida na mão, em `regras/`, o que está certo; só falta um padrão). | Manter o padrão `validarX(corpo) → { erro } \| { dados }` em toda rota nova (já é o caso das últimas). |
| B3 | `popular-locais` só cobre hemocentros públicos de capitais. | Importar do CNES/DATASUS (a pesquisa de 29/09 mostrou que os dados existem). |
| B4 | Dependências sem varredura. | `npm audit` e Dependabot no repositório. |
| B5 | Sem teste de interface (cliques) automatizado. | Playwright cobrindo 3 fluxos: entrar, agendar, hospital confirmar. |

## 3. Revisão da API REST

Pontos a favor: substantivos no plural nos recursos novos (`/agendamentos`), códigos de status coerentes (201 + `Location`, 204, 409 para conflito, 404 em vez de 403 para o que não é seu), erro sempre `{ "erro": "..." }`.

Inconsistências herdadas (não quebrei nada; ficam como lista de "quando for versionar"):

| Hoje | Problema | Forma REST |
|---|---|---|
| `POST /auth/cadastro`, `POST /auth/login` | verbo no caminho, português | `POST /usuarios`, `POST /sessoes` |
| `POST /perfil/excluir` | excluir com `POST` | `DELETE /perfil` (com a senha no corpo) |
| `POST /doador/lembrete` `{ ativo }` | alterna uma preferência com `POST` | `PUT /doador/preferencias/lembrete` |
| `POST /hospital/necessidade` e `GET /hospital/necessidades` | singular e plural para o mesmo recurso | `/hospital/necessidades` (ainda funciona o antigo) |
| `POST /hospital/confirmar-doacao` | verbo no caminho | `POST /doacoes` `{ doadorId }` |
| `POST /apadrinhamento/:id/apadrinhar` / `DELETE` | verbo repetido | `PUT`/`DELETE /apadrinhamento/:id/padrinhos/eu` |
| `POST /admin/hospitais/:id/aprovar` e `/recusar` | ação como verbo | `PATCH /admin/hospitais/:id` `{ status }` |
| `GET /hospital/estoque-publico` vs `/estoque` | duas rotas para o mesmo dado | uma rota, com a visão certa por quem pede |

Regra para o que for novo: **recurso no plural, verbo HTTP faz a ação, estado novo vai no corpo** (`PATCH /x/:id { status }`), `201` + `Location` ao criar, `204` ao apagar.

## 4. Revisão de login e sessão (estado depois do PR #24)

| Tema | Como ficou |
|---|---|
| Senha | `bcrypt` (custo 10), 8 a 72 bytes, sem as mais comuns, nem igual ao e-mail ou nome. |
| Tentativas | 8 erros em 15 min travam o login da conta (429 + `Retry-After`). |
| Enumeração de contas | mesma mensagem e mesmo tempo para e-mail que existe ou não; recuperação responde igual. |
| Token | JWT (HS256) de 1 dia; 7 dias com "manter conectado". Renovado em silêncio depois da metade da vida. |
| Encerrar | trocar senha, redefinir senha, excluir conta ou "sair de todos" invalidam tokens antigos (cache de 30 s por processo). |
| Login automático | `sessao.js`: confere em `GET /auth/eu` ao abrir, a cada 5 min e ao voltar à aba; 401 em qualquer chamada limpa a sessão e leva ao login com aviso. |
| Papéis | conferidos no servidor em **toda** rota não pública (`exigirDoador`, `exigirHospital`, `exigirHospitalAprovado`, `exigirHospitalOuAdmin`, `exigirAdmin`; só `/auth/*` fica para qualquer conta). O teste `testes/e2e/papeis.js` tenta o tipo errado em todas as rotas lidas do código (129 tentativas) e exige 403. O frontend monta o menu por tipo de conta (`regras/menu.js`) e redireciona quem abre tela de outro tipo, só por organização. |
| Pendências | token em `localStorage` (A7), contagem de tentativas em memória (M9), troca de e-mail da conta, verificação de e-mail no cadastro, autenticação em dois fatores para administradores. |

## 5. CRUD: onde há lacunas

A matriz completa, gerada do código, está em [`API.md`](API.md#crud-por-recurso). Lacunas **intencionais**: doações (imutáveis, cadeia de confiança), pedidos de sangue raro (registrados para auditoria). Lacunas **a decidir**:

| Recurso | Falta | Por quê |
|---|---|---|
| Locais de doação | criar, editar e apagar | hoje só um script popula; o administrador não consegue corrigir um telefone |
| Estoque | apagar um tipo | `POST` faz "inserir ou atualizar"; não há como remover |
| Campanhas e pacientes apadrinhados | editar | só dá para encerrar e abrir outra |
| Conta | trocar e-mail; excluir conta de hospital | exige confirmar o novo endereço; hospital não tem fluxo de LGPD |
| Notícias | edição na tela do administrador | a API já tem `PUT /noticias/:id` (PR #24); falta o botão |

(✅ Já resolvidos nesta rodada: necessidades de sangue, que nunca fechavam, agora podem ser atendidas, canceladas, reabertas e apagadas.)

## 6. Como saber que não quebrou

- `npm test` (pasta `backend`): regras, estrutura e ponta a ponta, tudo sem banco real nem internet.
- Os **testes de estrutura** conferem sozinhos: migrações completas e na ordem, toda rota montada, nenhuma rota de escrita pública sem querer, nenhuma consulta SQL montada com texto do usuário, nenhum `Math.random` em rotas, cópia da triagem igual, documentação da API em dia.
- O teste `do-zero` monta um banco vazio só com `db/ordem.js` e usa o sistema: se alguém criar uma migração e esquecer de listá-la, ele (e o teste de estrutura) falham.
