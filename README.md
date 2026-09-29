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
- 🔐 Cadastro e login seguros — senha criptografada (bcrypt), token JWT, validação de email, medidor de força de senha e **recuperação de senha por email real**
- 👤 Perfil completo — tipo sanguíneo (incluindo o raríssimo Rh nulo), gênero, cidade, nome social, CPF e telefone validados
- 🔒 **Privacidade por consentimento (LGPD)** — o doador escolhe ser anônimo ou identificado; hospitais só veem contato de quem autoriza
- 🩺 **Triagem de aptidão** — questionário que orienta se a pessoa pode doar, em 3 níveis, com limites oficiais de idade e peso e alertas em tempo real
- 🗺️ **Onde doar** — hemocentros de todo o Brasil em mapa interativo, com busca por cidade e ordenação por proximidade (geolocalização)
- 🏅 **Conquistas** — níveis, emblemas e contador de vidas salvas a cada doação confirmada, com aviso de quando poderá doar de novo, comemoração de emblema novo e botão para compartilhar (WhatsApp e redes)
- 🔔 **Lembrete de retorno** — quem pedir recebe um email quando o intervalo entre doações acaba (um por ciclo, opt-in), para voltar a doar
- 🤝 **Traga um amigo** — cada doador tem um link de convite (`/cadastro?ref=CÓDIGO`) para copiar ou mandar pelo WhatsApp; o convite só conta quando o amigo faz a **primeira doação confirmada por um hospital** (contas falsas não rendem nada), e rende os emblemas *Recrutador* (1 amigo) e *Multiplicador* (3 amigos). O doador vê só números, nunca o nome de quem convidou
- 💝 **Apadrinhamento de pacientes** — quem precisa de transfusões regulares (anemia falciforme, talassemia...) é cadastrado pelo hospital com um **apelido** (nunca o nome), tipo sanguíneo e frequência; doadores compatíveis viram padrinhos (até 3 pacientes por pessoa), acompanham a meta e ganham o emblema *Padrinho*. O hospital chama por email só os padrinhos **aptos hoje** (no máximo uma vez por semana por paciente) e nunca vê quem são
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
- 🔮 **Radar preditivo de aptidão** — estima quantos doadores de cada tipo ficarão aptos a doar nos próximos 7 e 30 dias, antecipando a escassez antes que ela aconteça

### Acessibilidade (padrão eMAG / Governo Federal)
- 🤟 **VLibras** — tradutor oficial de Libras integrado a todas as páginas
- 🌗 **Alto contraste** — modo de alto contraste com preferência salva
- 🔤 **Ajuste de fonte** — aumento/diminuição do tamanho de toda a interface
- ⌨️ **Atalhos de teclado** (ALT+1, 2, 5, 6, 7) e link de salto para o conteúdo principal

---

## 🧠 Destaques técnicos

- **Regras de negócio isoladas e testadas** — compatibilidade sanguínea, elegibilidade, triagem, gamificação, convite de amigos, apadrinhamento, alerta inteligente, lembrete de retorno e cálculo de distância (fórmula de Haversine) são funções puras, com testes próprios, independentes de interface e banco
- **Segurança em camadas** — bcrypt para senhas, JWT com middleware no backend e guarda de rota no frontend, tokens de recuperação de senha com expiração e uso único, permissões por papel (doador, hospital aprovado, administrador) conferidas no backend
- **Minimização de dados (LGPD)** — o match do hospital nunca expõe nome, CPF ou contato de doadores que não consentiram; o apadrinhamento não guarda nome de paciente (só apelido e uma condição de lista fixa, com autorização registrada)
- **Arquitetura cliente-servidor** — o frontend nunca acessa o banco diretamente; toda a lógica passa por uma API REST
- **Email transacional real** (recuperação de senha e alertas de emergência) via Resend
- **Análise preditiva simples e explicável** — o radar de aptidão cruza dados já existentes (última doação + regra de elegibilidade) para gerar previsão, sem depender de serviços externos de IA

---

## 🛠️ Tecnologias

**Frontend:** React (Vite), React Router, Leaflet + OpenStreetMap (mapa), VLibras
**Backend:** Node.js + Express (API REST), PostgreSQL (nuvem), JWT + bcrypt, Resend (email)

---

## 📁 Estrutura do projeto

Hemare/
├── backend/
│ ├── servidor.js # servidor Express e rotas
│ ├── banco.js # conexão com o PostgreSQL
│ ├── regras/ # lógica de negócio (compatibilidade, elegibilidade, triagem, distância)
│ ├── rotas/ # endpoints (auth, doador, hospital, admin, locais, recuperação, radar)
│ ├── middleware/ # autenticação (JWT) e permissões por papel
│ └── db/ # scripts de criação e povoamento das tabelas
└── frontend/
└── src/
├── paginas/ # telas (Início, Login, Triagem, Locais, Painel, Radar...)
├── componentes/ # Layout (com acessibilidade), mapa, rota protegida
└── regras/ # cópias das regras usadas no navegador

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
node db/criar-tabelas.js       # cria as tabelas principais
node db/criar-hospital.js      # tabelas de hospital
node db/criar-locais.js        # tabela de locais + popular-locais.js
node db/criar-recuperacao.js   # tabela de recuperação de senha
node db/criar-estoque.js       # tabela de estoque
node db/criar-doacoes.js       # tabela de doações confirmadas
node db/ajustar-verificacao.js # verificação de hospitais (novos começam pendentes)
node db/ajustar-alertas.js     # data do último alerta de cada doador (alerta inteligente)
node db/ajustar-lembretes.js   # lembrete de retorno (opt-in do doador)
node db/ajustar-indicacao.js   # código de convite e quem convidou (Traga um amigo)
node db/criar-apadrinhamento.js # tabelas do apadrinhamento de pacientes
node db/tornar-admin.js seu@email.com  # torna uma conta já cadastrada administrador
node servidor.js               # inicia a API (porta 3000)
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
- [x] Apadrinhamento de pacientes com necessidade recorrente de doação

---

## 👤 Autor

**Henrique Carneiro** — [@Henrique-CR0](https://github.com/Henrique-CR0)

---

*As informações de saúde apresentadas são orientativas e não substituem a avaliação de um profissional. Projeto em desenvolvimento contínuo.*