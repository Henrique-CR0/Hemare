# 🩸 Hemare

**Conectando quem doa a quem precisa.**

O Hemare é uma plataforma web completa que conecta doadores de sangue a hemocentros e hospitais, combinando informação, compatibilidade, previsão e acessibilidade para tornar a doação de sangue mais frequente, segura e acessível a todos.

> Desenvolvido com rigor técnico e responsabilidade social, baseado em dados e critérios oficiais do Ministério da Saúde, Fundação Hemope, Fundação Pró-Sangue e no padrão de acessibilidade digital do Governo Federal (eMAG).

---

## 💡 O problema

No Brasil, apenas **1,6% da população** doa sangue (a meta da OMS é 3%), e cerca de **38% são doadores de reposição** — pessoas que doam uma única vez por emergência e não retornam. Isso mantém os estoques cronicamente baixos, agravados em feriados, comprometendo cirurgias e tratamentos. Cada doação pode salvar **até 4 vidas**.

O Hemare ataca três raízes do problema: **desinformação**, **dificuldade de acesso** e **falta de antecipação** por parte de quem gerencia o estoque.

---

## ✨ Funcionalidades

### Para o doador
- 🔁 **Login automático** — quem já entrou volta direto para a sua área ao abrir o site; a sessão é conferida com o servidor e renovada em silêncio enquanto a pessoa usa; se acabar (venceu, a senha foi trocada em outro aparelho, conta excluída) o site leva ao login com um aviso. "Manter conectado por 7 dias" é opcional
- 🔐 Cadastro e login seguros — senha criptografada (bcrypt), token JWT, validação de email, medidor de força de senha e **recuperação de senha por email real**
- 👤 Perfil completo — tipo sanguíneo (incluindo o raríssimo Rh nulo), gênero, cidade, nome social, CPF e telefone validados
- 🔒 **Privacidade por consentimento (LGPD)** — o doador escolhe ser anônimo ou identificado; hospitais só veem contato de quem autoriza
- 🩺 **Triagem de aptidão** — questionário que orienta se a pessoa pode doar, em 3 níveis, com limites oficiais de idade e peso e alertas em tempo real
- 🗺️ **Onde doar** — hemocentros de todo o Brasil em mapa interativo, com busca por cidade e ordenação por proximidade (geolocalização)
- 👤 **Meu perfil** — página só do doador para editar nome, **nome social**, gênero, nascimento, telefone, cidade/estado, peso, tipo sanguíneo e **foto** (recortada e reduzida no próprio navegador, o que também apaga os metadados da câmera). Tem indicador de perfil completo, **"como o hospital te vê agora"** (prévia ao vivo, gerada pela mesma regra que o match usa), **carteirinha digital** de doador para baixar (com contato de emergência opcional, montada no aparelho) e os direitos da LGPD: **baixar meus dados** e **excluir minha conta** (apaga os dados pessoais; as doações confirmadas ficam anônimas na cadeia de confiança)
- 💎 **Rede de sangue raro** — doadores de fenótipos raros (Rh nulo, Bombay, Vel negativo, Jk(a-b-), Kell nulo) entram na rede por vontade própria e escolhem até onde podem ir (cidade, estado ou país). O fenótipo começa **declarado** e só vira **confirmado** quando um hospital confere o laudo pessoalmente, por um código curto. Numa emergência real o hospital **não recebe a lista**: descreve o caso, vê só **quantos** doadores existem e o Hemare chama os compatíveis e aptos; o hospital só passa a ver nome e telefone de quem responde "posso ajudar". Cada doador recebe no máximo um chamado por semana, todo pedido fica registrado e expira em 72 horas
- ♿ **Ficha PcD** — pessoas com deficiência podem doar sangue, e a norma federal (Portaria GM/MS nº 11.685/2026) não trata a deficiência em si como impedimento: o que conta é a causa, os remédios e a capacidade de entender e consentir. No **Meu perfil** a pessoa declara (com consentimento) o tipo de deficiência e o que ajuda no atendimento, e abre uma **ficha de orientação** que cruza as respostas com a norma: o que impede, o que depende de prazo ou relatório, o que levar ao hemocentro e o que combinar antes (Libras, mobilidade, acompanhante). As respostas da ficha não são guardadas, nenhum hospital vê a condição e ela some ao desmarcar ou excluir a conta
- 📅 **Agendar doação** — o doador escolhe um hospital aprovado, o dia e o horário; só aparecem horários em que ele **já estará apto** (intervalo de 60/90 dias e limite de 4 ou 3 doações por ano). Recebe confirmação por e-mail e um lembrete antes do horário, e pode **reagendar** ou **cancelar**. Cada vaga tem capacidade e nunca passa dela, nem com muita gente agendando ao mesmo tempo
- 🩸 **Minhas doações** — histórico do doador: quantas doações, até quantas vidas, quando fica apto de novo, quantas doações ainda cabem no ano, doações por ano e uma linha do tempo com doações (com o selo da cadeia de confiança) e agendamentos, no estilo da carteira do app federal Hemovida
- 🔒 **Portão de acesso** — o visitante vê o site público (mapa, notícias, previsão, estoque, guia e mitos), mas a triagem "Posso doar?", a lista de pacientes para apadrinhar e a ficha PcD exigem conta: em vez de um login seco, ele vê um **portão** explicando o que a conta libera, por que ela é necessária (dado de saúde é sensível na LGPD) e o que continua aberto; depois de entrar ou se cadastrar, **volta para a tela que queria** (`?destino=`, só caminhos do próprio site). O login e o cadastro mostram o que cada tipo de acesso permite. A decisão e a pesquisa estão em `docs/ACESSO.md`, e um teste confere que a lista de rotas públicas é exatamente a combinada
- 🧭 **Cada conta vê só o que é dela** — doador, hospital e administrador têm menus diferentes (o hospital não vê triagem, Onde doar, Apadrinhe nem os conteúdos para doadores; o doador não vê nada de hospital). Quem abre uma tela de outro tipo volta para a sua área. No servidor, cada rota confere o tipo da conta (`exigirDoador`, `exigirHospital`, `exigirHospitalAprovado`, `exigirAdmin`), e um teste tenta entrar com o tipo errado em **todas** as rotas lidas do código, então uma rota nova sem porteiro faz o `npm test` falhar
- 🗂️ **Abas na conta** — o doador tem **Minha área** (agendar, minhas doações, conquistas, apadrinhamento...) e **Meu perfil**, separado em *Dados e privacidade*, *Saúde e doação* (rede de sangue raro e ficha PcD), *Carteirinha* e *Conta e segurança*. O hospital tem **Minha área** (painel dividido em *Estoque e necessidades*, *Agenda*, *Campanhas e pacientes* e *Sangue raro*) e **Perfil do hospital** (dados da instituição, verificação e segurança da conta). A aba escolhida fica no endereço (`?aba=`), então o link leva direto para ela
- 🏅 **Conquistas** — níveis, emblemas e contador de vidas salvas a cada doação confirmada, com aviso de quando poderá doar de novo, comemoração de emblema novo e botão para compartilhar (WhatsApp e redes)
- 🔔 **Lembrete de retorno** — quem pedir recebe um email quando o intervalo entre doações acaba (um por ciclo, opt-in), para voltar a doar
- 🤝 **Traga um amigo** — cada doador tem um link de convite (`/cadastro?ref=CÓDIGO`) para copiar ou mandar pelo WhatsApp; o convite só conta quando o amigo faz a **primeira doação confirmada por um hospital** (contas falsas não rendem nada), e rende os emblemas *Recrutador* (1 amigo) e *Multiplicador* (3 amigos). O doador vê só números, nunca o nome de quem convidou
- 🩸 **Quem doa por mim (campanhas de reposição)** — quando alguém é internado e o hospital pede reposição de sangue, a família deixa de pedir doador por mensagem solta: o hospital abre uma campanha com **link público**, meta de bolsas e prazo; cada amigo **promete uma data** (só datas em que estará apto pelo intervalo entre doações) e a doação só entra na meta quando o **hospital confirma**, já registrada na cadeia de confiança. O paciente aparece só por apelido, e o hospital vê nome e telefone apenas de quem prometeu naquela campanha. Quem doa ganha o emblema *Solidário* e um convite para continuar doando
- 💝 **Apadrinhamento de pacientes** — quem precisa de transfusões regulares (anemia falciforme, talassemia...) é cadastrado pelo hospital com um **apelido** (nunca o nome), tipo sanguíneo e frequência; doadores compatíveis viram padrinhos (até 3 pacientes por pessoa), acompanham a meta e ganham o emblema *Padrinho*. O hospital chama por email só os padrinhos **aptos hoje** (no máximo uma vez por semana por paciente) e nunca vê quem são
- 📰 **Feed de notícias (estilo Google Notícias)** — a aba *Notícias* mostra, sempre atualizadas, as reportagens sobre **doação de sangue, estoques e urgências, campanhas, órgãos/medula/leite e saúde**: destaques em grade com foto, lista logo abaixo, "há 2 horas", busca, filtro por assunto e por estado e "ver mais". O servidor lê de hora em hora os **feeds RSS** de fontes públicas e de hemocentros (Agência Brasil, Agência Câmara e Senado, Fiocruz, hemocentro da USP de Ribeirão Preto, Agência Minas), descarta o que não interessa, junta repetidas e guarda só **título, trecho curto, imagem de divulgação e link da matéria original**, sempre com o nome da fonte; o clique abre no site de quem publicou. Por que não o Google Notícias? O feed dele proíbe uso fora de leitor pessoal. Veículos comerciais (g1) ficam **desligados** até alguém conferir os termos. O administrador vê quais fontes responderam, coleta na hora e esconde notícias. Pesquisa, fontes e como acrescentar uma: `docs/NOTICIAS.md`
- 🏙️ **Placar das cidades** — página pública com as cidades que mais doam, só com números agregados (cidades com menos de 3 doadores não aparecem, por privacidade)
- 📚 Conteúdo educativo — guia completo da doação, 16 mitos e verdades e os direitos do doador (folga na CLT, etc.)

### Para o hospital / hemocentro
- 🏥 Cadastro completo — CNPJ e CNES validados, endereço com busca automática por CEP
- 🛡️ **Verificação por administrador** — todo hospital novo começa pendente; um administrador confere CNPJ e CNES e aprova ou recusa (com motivo enviado por email). Só hospitais aprovados veem contatos de doadores, confirmam doações, disparam alertas e aparecem no termômetro público
- 📢 Publicação de **necessidades** de sangue por tipo e nível de urgência
- 🎯 **Match automático** — a regra de compatibilidade sanguínea encontra os doadores certos, respeitando a privacidade de cada um
- 🌡️ **Termômetro de estoque** — o hospital classifica seu estoque por tipo (estável/alerta/crítico/emergência); uma página **pública** exibe onde há falta de sangue no momento
- 🚨 **Alerta de emergência inteligente** — necessidades críticas ou de emergência chamam por email só quem pode ajudar de verdade: doadores compatíveis, que consentiram ser contatados, **aptos a doar hoje** e **da mesma cidade** do hospital — e cada doador recebe no máximo um alerta a cada 3 dias, para não cansar quem doa
- ✅ **Confirmação de doação** — registra doações reais, atualizando o histórico do doador (base para gamificação e previsão)
- 📅 **Agenda de doações** — o hospital abre horários em lote (dias da semana, primeiro e último horário, intervalo, capacidade), ajusta a capacidade, vê quem agendou (só nome, tipo sanguíneo e horário) e marca quem **compareceu** (a doação entra na cadeia de confiança) ou **faltou**
- 🔮 **Radar preditivo de aptidão** — estima quantos doadores de cada tipo ficarão aptos a doar nos próximos 7 e 30 dias, antecipando a escassez antes que ela aconteça

### Acessibilidade (padrão eMAG / Governo Federal)
- 🤟 **VLibras** — tradutor oficial de Libras integrado a todas as páginas
- 🌗 **Alto contraste** — modo de alto contraste com preferência salva
- 🔤 **Ajuste de fonte** — aumento/diminuição do tamanho de toda a interface
- ⌨️ **Atalhos de teclado** (ALT+1, 2, 5, 6, 7) e link de salto para o conteúdo principal

---

## 🧠 Destaques técnicos

- **Regras de negócio isoladas e testadas** — compatibilidade sanguínea, elegibilidade, triagem, gamificação, convite de amigos, apadrinhamento, campanha de reposição, notícias por estado, alerta inteligente, lembrete de retorno e cálculo de distância (fórmula de Haversine) são funções puras, com testes próprios, independentes de interface e banco
- **Qualidade conferida por máquina** — a cada PR o GitHub Actions roda os testes (regras, estrutura e ponta a ponta com Postgres simulado), o lint e o build; a documentação da API é gerada do código e um teste falha se ela ficar desatualizada; outro teste monta um banco vazio só com `db/ordem.js` e usa o sistema; e há conferências de arquitetura (nenhuma rota de escrita pública sem querer, nenhuma consulta SQL montada com texto do usuário, cópia da triagem igual no navegador e no servidor). Veja `docs/ARQUITETURA.md`
- **Sessão e login** — e-mail sem diferença de maiúsculas, senha validada (8 a 72 bytes, sem as senhas mais comuns), limite de tentativas por conta (8 erros em 15 min travam o login) sem revelar se o e-mail existe nem pelo tempo de resposta, código de recuperação sorteado com `crypto` e com limite de tentativas, trocar a senha ou "sair de todos os aparelhos" encerra as outras sessões de verdade (os JWT antigos deixam de valer), erros sempre em JSON e cabeçalhos de segurança
- **Segurança em camadas** — bcrypt para senhas, JWT com middleware no backend e guarda de rota no frontend, tokens de recuperação de senha com expiração e uso único, permissões por papel (doador, hospital aprovado, administrador) conferidas no backend
- **Minimização de dados (LGPD)** — o match do hospital nunca expõe nome, CPF ou contato de doadores que não consentiram (e mostra o nome social quando existe); o apadrinhamento não guarda nome de paciente (só apelido e uma condição de lista fixa, com autorização registrada)
- **Arquitetura cliente-servidor** — o frontend nunca acessa o banco diretamente; toda a lógica passa por uma API REST
- **Email transacional real** (recuperação de senha e alertas de emergência) via Resend
- **Análise preditiva simples e explicável** — o radar de aptidão cruza dados já existentes (última doação + regra de elegibilidade) para gerar previsão, sem depender de serviços externos de IA

---

## 🛠️ Tecnologias

**Frontend:** React (Vite), React Router, Leaflet + OpenStreetMap (mapa), VLibras
**Backend:** Node.js + Express (API REST), PostgreSQL (nuvem), JWT + bcrypt, Resend (email)

---

## 📁 Estrutura do projeto

```
Hemare/
├── backend/
│   ├── servidor.js        # servidor Express: CORS, cabeçalhos, rotas, 404 e erros em JSON
│   ├── banco.js           # conexão com o PostgreSQL
│   ├── regras/            # lógica de negócio PURA (sem banco), cada uma com o seu testar-*.js
│   ├── rotas/             # endpoints (86 rotas; lista em docs/API.md)
│   ├── servicos/          # registrarDoacao (cadeia de confiança), sessões, e-mails
│   ├── middleware/        # autenticação (JWT + sessão encerrável), papéis, erros 500
│   ├── tarefas/           # lembretes por e-mail
│   ├── db/                # scripts do banco; a ordem certa está em db/ordem.js (npm run migrar)
│   ├── scripts/           # gerador da documentação da API
│   └── testes/            # ambiente de teste (pg-mem), ponta a ponta e estrutura (npm test)
├── frontend/src/
│   ├── paginas/           # telas
│   ├── componentes/       # Layout (acessibilidade), mapa, rota protegida, painéis
│   ├── regras/            # cópias das regras usadas no navegador e textos de data
│   └── sessao.js          # login automático, renovação e saída segura
├── docs/
│   ├── API.md             # todas as rotas e o CRUD de cada recurso (gerado do código)
│   ├── openapi.json       # a mesma API em OpenAPI 3 (abra no Swagger Editor)
│   ├── ARQUITETURA.md     # revisão arquitetural, REST, login e roteiro de melhorias
│   ├── NOTICIAS.md        # feed de notícias: pesquisa, fontes, licenças e como acrescentar uma
│   └── STATUS.md          # status report do desenvolvimento: saúde, números, riscos e próximos passos (npm run status)
└── .github/workflows/     # CI: testes, lint e build a cada PR
```

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js e um banco PostgreSQL (ex.: gratuito no [Neon](https://neon.tech)), e uma conta gratuita no [Resend](https://resend.com) para envio de email.

**Backend:**
```bash
cd backend
npm install
# crie um arquivo .env com:
#   DATABASE_URL=sua_string_do_postgres
#   JWT_SECRET=uma_chave_secreta
#   RESEND_API_KEY=sua_chave_do_resend
#   FRONTEND_URL=https://seu-site   (opcional: libera só esse site no CORS e põe links nos e-mails)
#   COLETAR_NOTICIAS=nao            (opcional: desliga a coleta automática do feed de notícias)
#   NOTICIAS_FONTES_OPCIONAIS=g1-saude,g1   (opcional: liga fontes comerciais, só depois de conferir os termos delas)
# O servidor NÃO liga sem JWT_SECRET (mínimo de 8 caracteres).
npm run migrar                 # monta o banco inteiro, na ordem certa (só o que ainda não foi feito)
node db/tornar-admin.js seu@email.com  # torna uma conta já cadastrada administrador
npm start                      # inicia a API (porta 3000)
```

**Banco novo ou já existente?** `npm run migrar` guarda numa tabela (`migracoes_aplicadas`) o que já rodou. Se você já montou o banco na mão, rode **uma vez** `npm run migrar -- --marcar-aplicadas` para anotar tudo como feito, e daí em diante só os scripts novos rodam. `npm run migrar -- --listar` mostra a lista e o que falta. A lista completa fica em `backend/db/ordem.js`. Versões antigas deste README esqueciam alguns scripts (`ajustar-doadores`, `ajustar-hospitais`, `ajustar-cadeia`...), e um teste agora monta um banco vazio só com essa lista para garantir que nada falte.

**Testes (sem banco real e sem internet):**
```bash
cd backend
npm test                       # tudo: regras + estrutura + ponta a ponta (Postgres simulado com pg-mem)
npm run test:regras            # só as regras de negócio (rápido)
npm run test:e2e               # só os testes de ponta a ponta (login, agenda, perfil, rede rara, banco do zero...)
node testes/rodar.js estrutura # só as conferências automáticas de estrutura (migrações, rotas, documentação, segurança)
npm run docs                   # gera docs/API.md e docs/openapi.json a partir das rotas
npm run servir-teste           # API de demonstração com dados de exemplo (contas em backend/testes/servir.js)
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                    # inicia o site (porta 5173)
```

**Endereço do backend:** o frontend descobre sozinho onde está a API (arquivo `frontend/src/config.js`):
- rodando no computador → `http://localhost:3000`
- no GitHub Codespaces → o mesmo endereço do site, trocando a porta `5173` por `3000` (deixe a porta 3000 como **Public** na aba *Ports*)
- para usar outro endereço, crie `frontend/.env.local` com `VITE_API_URL=https://seu-backend`

---

## 🗺️ Roadmap

- [x] Autenticação completa (cadastro, login, recuperação de senha por email)
- [x] Perfil do doador com privacidade por consentimento (LGPD)
- [x] Triagem de aptidão baseada em critérios oficiais
- [x] Diretório de locais com mapa e proximidade
- [x] Cadastro de hospital com CNPJ/CNES e selo de verificação
- [x] Match por compatibilidade sanguínea
- [x] Termômetro de estoque (interno e público)
- [x] Alertas de emergência por email
- [x] Confirmação de doação pelo hospital
- [x] Radar preditivo de aptidão
- [x] Acessibilidade completa (VLibras, alto contraste, fonte, atalhos)
- [x] Gamificação — emblemas e níveis por número de doações confirmadas
- [x] Verificação de hospitais por administrador
- [x] Programa "Traga um amigo" (link de convite e emblemas de recrutador)
- [x] Campanhas de reposição com link, meta e promessas de doação ("Quem doa por mim")
- [x] Canal de notícias por estado, com panorama dos 27 estados e sinais dos hospitais
- [x] Feed de notícias atualizado de hora em hora (RSS de fontes públicas), no estilo Google Notícias
- [x] Status report do desenvolvimento (`docs/STATUS.md`), com números gerados do código por `npm run status`
- [ ] Mais fontes: hemocentros estaduais que publiquem RSS (a lista está em `backend/regras/fontes.js`)
- [x] Perfil completo do doador com foto, carteirinha digital e direitos da LGPD
- [x] Rede de sangue raro com confirmação de laudo e chamados que protegem os dados do doador
- [x] Ficha PcD: orientação de triagem para pessoas com deficiência, baseada na norma federal
- [x] Agendamento de doação e histórico "Minhas doações"
- [x] Testes de ponta a ponta no repositório (`npm test`)
- [x] Login automático, sessões encerráveis, limite de tentativas e troca de senha
- [x] Documentação da API (OpenAPI + tabela de CRUD), revisão arquitetural, CI e `npm run migrar`
- [x] CRUD completo de necessidades (fechar, reabrir, apagar) e edição de avisos do canal de notícias
- [x] Apadrinhamento de pacientes com necessidade recorrente de doação

---

## 👤 Autor

**Henrique Carneiro** — [@Henrique-CR0](https://github.com/Henrique-CR0)

---

*As informações de saúde apresentadas são orientativas e não substituem a avaliação de um profissional. Projeto em desenvolvimento contínuo.*