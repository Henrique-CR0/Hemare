# 🩸 Hemare

**Conectando quem doa a quem precisa.**

O Hemare é uma plataforma web que conecta doadores de sangue a hemocentros e hospitais, incentivando a doação voluntária e regular por meio de informação, orientação e proximidade.

> Projeto acadêmico e de portfólio, desenvolvido com foco em impacto social real — baseado em dados e critérios oficiais do Ministério da Saúde, Fundação Hemope e Fundação Pró-Sangue.

---

## 💡 O problema

No Brasil, apenas **1,6% da população** doa sangue (a meta da OMS é 3%), e cerca de **38% são doadores de reposição** — pessoas que doam uma única vez por emergência e não retornam. O resultado são estoques cronicamente baixos, que se agravam em feriados e comprometem cirurgias e tratamentos. Cada doação pode salvar **até 4 vidas**.

O Hemare ataca três raízes desse problema: **desinformação**, **dificuldade de acesso** e **falta de fidelização**.

---

## ✨ Funcionalidades

- 🔐 **Autenticação segura** — cadastro e login com senha criptografada (bcrypt) e token JWT, com rotas protegidas no frontend e no backend
- 🩺 **Triagem de aptidão** — questionário que orienta se a pessoa pode doar, em 3 níveis (apto / atenção / impedimento), baseado em critérios oficiais — sempre orientando, nunca diagnosticando
- 🗺️ **Diretório de locais com mapa** — hemocentros de todo o Brasil, com busca por cidade e **ordenação por proximidade via geolocalização** (raio de km), exibidos em um mapa interativo
- 🧬 **Compatibilidade sanguínea** — regras testadas que determinam quem pode doar para quem (incluindo o tipo raríssimo Rh nulo, o "sangue dourado")
- 👤 **Perfil do doador** — tipo sanguíneo, cidade e dados, com privacidade por escolha
- 📋 **Conteúdo educativo** — orientações de preparação e uma seção de mitos e verdades

---

## 🛠️ Tecnologias

**Frontend**
- React (Vite)
- React Router (navegação)
- Leaflet + OpenStreetMap (mapa)

**Backend**
- Node.js + Express (API REST)
- PostgreSQL (banco de dados, hospedado na nuvem)
- JWT + bcrypt (autenticação e segurança)

**Comunicação:** API REST via JSON

---

## 🧠 Destaques técnicos

- **Regras de negócio isoladas e testadas** — a lógica de compatibilidade, elegibilidade, triagem e cálculo de distância (fórmula de Haversine) foi escrita como funções puras, com testes próprios, independentes da interface e do banco
- **Segurança em camadas** — senha nunca armazenada em texto puro; rotas privadas protegidas por middleware no backend e por guarda de rota no frontend
- **Arquitetura cliente-servidor** — o frontend nunca acessa o banco diretamente; toda a lógica passa pela API
- **Responsabilidade em dados de saúde** — o sistema orienta com base em fontes oficiais, mas encaminha a decisão final ao hemocentro, com avisos claros

---

## 📁 Estrutura do projeto
Hemare/
├── backend/
│ ├── servidor.js # servidor Express e rotas
│ ├── banco.js # conexão com o PostgreSQL
│ ├── regras/ # lógica de negócio (compatibilidade, triagem, distância)
│ ├── rotas/ # endpoints (auth, doador, locais)
│ ├── middleware/ # autenticação (JWT)
│ └── db/ # scripts de criação e povoamento das tabelas
└── frontend/
└── src/
├── paginas/ # telas (Início, Login, Triagem, Locais...)
├── componentes/ # Layout, mapa, rota protegida
└── regras/ # cópias das regras usadas no navegador

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js instalado e um banco PostgreSQL (ex.: gratuito no [Neon](https://neon.tech)).

**Backend:**
```bash
cd backend
npm install
# crie um arquivo .env com:
#   DATABASE_URL=sua_string_do_postgres
#   JWT_SECRET=uma_chave_secreta
node db/criar-tabelas.js   # cria as tabelas
node servidor.js           # inicia a API (porta 3000)
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                # inicia o site (porta 5173)
```

---

## 🗺️ Roadmap

- [x] Autenticação (cadastro, login, perfis)
- [x] Triagem de aptidão baseada em critérios oficiais
- [x] Diretório de locais com mapa e proximidade
- [x] Regras de compatibilidade e elegibilidade
- [ ] Painel do hospital + match entre necessidades e doadores
- [ ] Gamificação (emblemas, carteirinha digital, moldura compartilhável)
- [ ] Alertas de necessidade em tempo real

---

## 👤 Autor

**Henrique Carneiro** — [@Henrique-CR0](https://github.com/Henrique-CR0)

---

*Projeto desenvolvido para fins acadêmicos e de portfólio. As informações de saúde são orientativas e não substituem a avaliação de um profissional.*