# Status Report do Desenvolvimento

> **Posição em 30/10/2026**, sobre a `main` (PRs até o #30). Os **números** abaixo são gerados do código por `npm run status` (pasta `backend`); o resto é análise escrita por uma pessoa e deve ser relida a cada rodada. O administrador vê este relatório, mais o uso real ao vivo, em **/admin/status** no site. Como o relatório foi montado e as fontes da pesquisa estão na seção 8.

## 1. Resumo em 30 segundos

**Saúde geral: 🟢 verde com dois pontos amarelos.** O produto está completo para uma **demonstração e um piloto fechado** (doador, hospital e administrador usam o fluxo inteiro, com testes que passam e a API documentada). **Antes de abrir ao público** faltam duas coisas de segurança e operação (token no navegador e envio de e-mail com domínio próprio), e há dois PRs antigos parados que precisam de decisão.

| Área | Situação | Em uma frase |
|---|:-:|---|
| Funcionalidades | 🟢 | Tudo o que estava no roadmap do README está pronto e mesclado, menos a expansão de fontes de notícias. |
| Qualidade e testes | 🟢 | Testes de regras, de estrutura e de ponta a ponta no repositório, rodando a cada PR no GitHub Actions. |
| Segurança e privacidade | 🟡 | Senha, sessão, papéis e LGPD bem resolvidos; falta tirar o token do `localStorage` e verificar o e-mail no cadastro. |
| Operação e infraestrutura | 🟡 | Tarefas agendadas rodam dentro da API e o envio de e-mail usa o remetente de teste do Resend (ver riscos R1 e R2). |
| Conteúdo e dados | 🟡 | Locais cobrem só hemocentros públicos de capitais; o feed de notícias depende de quem publica RSS. |
| Documentação | 🟢 | API gerada do código, revisão arquitetural, acesso por tipo de conta, notícias e este relatório. |

## 2. Números

<!-- numeros:inicio -->
_Gerado por `npm run status` em 30/10/2026. Não edite este bloco à mão._

| Indicador | Valor |
|---|---|
| Testes automáticos | **1.325 verificações** em 34 arquivos, **todas passando** ✅ |
| Rotas da API | 90 (em 17 arquivos), todas documentadas em `docs/API.md` |
| Arquivos de regras de negócio puras (sem banco, testáveis em milissegundos) | 22 |
| Telas (páginas do site) | 26 |
| Scripts de banco na ordem de `npm run migrar` | 28 |
| Linhas de código | backend 7.565 · frontend 7.536 · testes 3.781 |
| Histórico | 91 commits desde 28/07/2026 |
| Pull requests | 28 mesclados de 30; abertos: #22, #11 |
<!-- numeros:fim -->

## 3. O que foi entregue

| Fase | PRs | O que o usuário ganhou |
|---|---|---|
| **Base e primeiras funções** (até 29/09) | #1 a #9, #12 a #17 | Codespaces e configuração; menu responsivo e VLibras; **gamificação** (níveis, emblemas, placar das cidades); **verificação de hospitais** pelo administrador; **alerta de emergência** que chama só quem pode ajudar; **lembrete de retorno**; **Traga um amigo**; **apadrinhamento** de pacientes; **campanhas "Quem doa por mim"**; correção do mapa; primeiro canal de notícias por estado. |
| **Saúde, regras e perfil** (até 05/10) | #10, #18, #19, #20, #21 | Triagem com os limites oficiais de idade e peso; **perfil do doador** (foto, carteirinha digital, direitos da LGPD); **rede de sangue raro** que protege os doadores; **ficha PcD**; triagem e mitos atualizados com a Portaria 11.685/2026 e as regras do Hemope. |
| **Produto, qualidade e acesso** (30/10) | #23 a #30 | **Agendamento** de doação e histórico "Minhas doações"; **login automático**, sessões que se encerram, limite de tentativas; **testes no repositório**, CI, API documentada e `npm run migrar`; abas **Minha área / Meu perfil**; **cada conta vê só o que é dela** (servidor e menus); **portão de acesso** (triagem, apadrinhamento e ficha PcD só com conta, voltando para onde a pessoa queria ir); **feed de notícias** estilo Google Notícias. |

## 4. Em aberto: pull requests parados

| PR | O que é | Situação | Decisão que falta |
|---|---|---|---|
| [#11](https://github.com/Henrique-CR0/Hemare/pull/11) | Comprovante de doação com QR code verificável (15 arquivos) | Aberto desde 29/09, **em conflito com a `main`** | Retomar: ele fecha o buraco de fraude em que um hospital pode confirmar qualquer doador (ver R4). |
| [#22](https://github.com/Henrique-CR0/Hemare/pull/22) | Calendário do sangue: previsão de queda por feriado (18 arquivos) | Aberto desde 05/10, **em conflito**; o teste de ponta a ponta dele ainda não está no repositório | Atualizar com a `main`, trazer o teste e mesclar (precisa rodar `node db/criar-feriados.js` e entrar em `db/ordem.js`). |

Os dois ficaram para trás porque a `main` andou muito (modelo de acesso, sessões, testes). Quanto mais esperam, mais caro o conflito.

## 5. Riscos e bloqueios

Probabilidade e impacto: **A** alta, **M** média, **B** baixa. A coluna "Ação" é o que reduz o risco.

| # | Risco | Prob. | Impacto | Ação | Esforço |
|---|---|:-:|:-:|---|:-:|
| R1 | **E-mail com remetente de teste.** As tarefas e rotas enviam como `onboarding@resend.dev`. Pelo que sei da documentação do Resend, esse remetente só entrega ao e-mail do dono da conta; antes de um piloto real é preciso **confirmar** e verificar um domínio próprio. Afeta recuperação de senha, alertas e lembretes. | A | A | Registrar um domínio, verificá-lo no Resend e trocar o `from` num lugar só. | P |
| R2 | **Tarefas dentro da API** (`setInterval`). Com duas instâncias, cada uma envia e coleta; em hospedagem gratuita que "dorme", a coleta de notícias e os lembretes param. | M | M | Agendador externo (cron do host ou GitHub Actions `schedule`) ou trava no banco (A8 da revisão arquitetural). | P |
| R3 | **Token de login em `localStorage`**: qualquer falha de XSS o rouba. | B | A | Cookie `httpOnly` + `SameSite` + proteção CSRF (A7). **Recomendado antes de abrir ao público.** | M |
| R4 | **Hospital pode confirmar a doação de qualquer doador** (sem prova de que ele esteve lá). Mancha o placar, a cadeia de confiança e os emblemas. | M | M | Retomar o #11 (comprovante com QR lido no balcão). | M |
| R5 | **Direitos autorais das notícias.** O Brasil não tem exceção clara para agregadores. | B | M | Só título, trecho curto e link; fontes públicas primeiro; g1 desligado; botão "Esconder"; pedir autorização por escrito se o projeto virar comercial (`docs/NOTICIAS.md`). | P |
| R6 | **Dado de saúde (LGPD)** em triagem e ficha PcD. | B | A | Já mitigado: só com conta, respostas não ficam guardadas, o hospital só vê números. Manter a regra em toda função nova. | contínuo |
| R7 | **Sem teste de tela (cliques).** Os testes cobrem regras e API; uma tela quebrada passa. | M | M | Playwright com 3 fluxos: entrar, agendar, hospital confirma (B5). | M |
| R8 | **Dados de locais curtos**: só hemocentros públicos de capitais; o mapa pode parecer vazio no interior. | A | B | Importar do CNES/DATASUS (B3). | G |
| R9 | **Volume do feed de notícias** de dezenas de itens por semana. | A | B | Mais fontes que publiquem RSS; ligar o g1 só depois de conferir os termos. | P |
| R10 | **Pacote do site de 556 KB** (o mapa vai junto para quem só abre o login). | A | B | `React.lazy` nas telas pesadas (M6). | P |

Esforço: P horas · M dias · G semanas. A lista completa de achados (alta, média e baixa) está em `docs/ARQUITETURA.md`.

## 6. Próximos passos (em ordem sugerida)

| # | O que | Por quê agora | Esforço |
|---|---|---|:-:|
| 1 | Verificar um **domínio no Resend** e trocar o remetente (R1) | Sem isso, nenhum piloto real recebe e-mail. | P |
| 2 | Atualizar e mesclar o **#22** (calendário do sangue) | Pronto e testado; só falta o conflito e o teste no repositório. | P |
| 3 | Retomar o **#11** (comprovante com QR) | Fecha a fraude de confirmação e dá um recurso concreto ao doador. | M |
| 4 | **Token em cookie `httpOnly`** + verificação de e-mail no cadastro (R3) | Último grande ponto de segurança antes de abrir ao público. | M |
| 5 | **Agendador externo** para lembretes e coleta de notícias (R2) | O feed e os lembretes passam a funcionar mesmo com a API "dormindo". | P |
| 6 | **Teste de tela** com Playwright e pacote menor (R7, R10) | Evita regressão visual e acelera a primeira abertura. | M |
| 7 | **Importar locais do CNES** (R8) | O mapa deixa de ser só de capitais. | G |
| 8 | Ideias de produto ainda sem dono: jornada da primeira doação, lista de espera de horários, painel do gestor, PWA, desafios entre equipes | Só depois de fechar segurança e e-mail. | M cada |

## 7. Decisões pedidas

1. **Quem é o público do piloto** (um hemocentro? uma cidade?) e **em que data**: define se o item 4 (segurança) entra antes ou depois.
2. **Pode registrar um domínio?** Desbloqueia o item 1.
3. **#11 e #22**: retomar os dois ou descartar algum?
4. **Notícias comerciais (g1)**: conferir os termos do RSS deles (ou pedir autorização) para ligar? Hoje ficam desligadas.

## 8. Como este relatório é feito

**O que a pesquisa recomenda.** Guias de relatório de status de projeto (inclusive de software) concordam em poucas regras: [responder as mesmas perguntas toda vez](https://plane.so/blog/project-status-report-how-to-write-one-and-what-to-include) (como está o progresso, o que mudou, que riscos existem e o que vem a seguir); [mostrar a saúde geral logo no início](https://resources.rework.com/pt/libraries/project-management/project-status-report) e manter cada seção enxuta; [dar responsável e data para os próximos passos](https://www.atlassian.com/br/agile/project-management/status-report); [ser conciso e não só negativo, trazendo ações](https://tensix.com/status-reports-in-project-management/); e [não virar rotina sem consequência](https://reclaim.ai/glossary/status-report). Em equipes ágeis, [os indicadores saem do próprio ciclo de desenvolvimento](https://www.infoq.com/br/news/2013/06/relatorios-status-agile), sem trabalho extra. Nenhuma das fontes que achei define um padrão único para as cores de saúde (verde/amarelo/vermelho): usei a convenção comum, em que 🟢 é "no rumo", 🟡 "atenção, com plano" e 🔴 "bloqueado".

**Como o Hemare aplica isso:**
- **Saúde no início** (seção 1) e uma tabela por área.
- **Números gerados do código** (`npm run status`): testes, rotas, telas, linhas, commits e PRs. Ninguém digita contagem.
- **Riscos com probabilidade, impacto e ação**; **próximos passos em ordem**, cada um com o porquê e o esforço; **decisões** que dependem de uma pessoa, na seção 7.
- **Frequência sugerida:** ao fechar um bloco de PRs (como hoje) ou, no mínimo, uma vez por mês. Para atualizar: `cd backend && npm run status`, depois reler as seções 1, 4, 5, 6 e 7.

**Limites deste relatório.** As cores de saúde e as probabilidades dos riscos são **julgamento**, não medição. O Hemare não tem usuários reais ainda, então não há métricas de uso (cadastros, doações agendadas, visitas): quando houver, entram na seção 2. A observação sobre o remetente do Resend (R1) vem do meu conhecimento da documentação do serviço e **deve ser confirmada** na conta de vocês.
