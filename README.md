# 🩸 Hemare

**Conectando quem doa a quem precisa.**

O Hemare é uma plataforma web que conecta doadores de sangue a hemocentros e hospitais, incentivando a doação voluntária e regular por meio de informação, orientação, compatibilidade e proximidade.

> Projeto desenvolvido com foco em impacto social real, baseado em dados e critérios oficiais do Ministério da Saúde, Fundação Hemope e Fundação Pró-Sangue.

---

## 💡 O problema

No Brasil, apenas **1,6% da população** doa sangue (a meta da OMS é 3%), e cerca de **38% são doadores de reposição** — pessoas que doam uma vez por emergência e não retornam. Isso mantém os estoques cronicamente baixos, agravados em feriados, comprometendo cirurgias e tratamentos. Cada doação pode salvar **até 4 vidas**.

O Hemare ataca três raízes do problema: **desinformação**, **dificuldade de acesso** e **falta de fidelização**.

---

## ✨ Funcionalidades

**Para o doador**
- 🔐 Cadastro e login seguros (senha criptografada + JWT), com validação de email, medidor de força de senha e **recuperação de senha por email**
- 👤 Perfil completo: tipo sanguíneo (incl. o raríssimo Rh nulo), gênero, cidade, nome social e CPF (com validação)
- 🩺 **Triagem de aptidão** — questionário que orienta se a pessoa pode doar, em 3 níveis (apto / atenção / impedimento), com limites oficiais de idade e peso
- 🗺️ **Onde doar** — hemocentros de todo o Brasil em um mapa interativo, com busca por cidade e **ordenação por proximidade (geolocalização)**
- 📚 Conteúdo educativo: guia completo da doação, 16 mitos e verdades, e os direitos do doador (folga na CLT, etc.)

**Para o hospital / hemocentro**
- 🏥 Cadastro com selo de verificação
- 📢 Publicação de **necessidades** de sangue (com nível de urgência)
- 🎯 **Match automático** — o sistema encontra os doadores compatíveis com o tipo sanguíneo necessário, respeitando a privacidade de cada doador

---

## 🧠 Destaques técnicos

- **Regras de negócio isoladas e testadas** — compatibilidade sanguínea, elegibilidade, triagem e cálculo de distância (fórmula de Haversine) foram escritas como funções puras, com testes próprios, independentes da interface e do banco
- **Segurança em camadas** — senha nunca em texto puro (bcrypt); rotas privadas protegidas por middleware JWT no backend e guarda de rota no frontend; recuperação de senha com código temporário e de uso único
- **Arquitetura cliente-servidor** — o frontend nunca acessa o banco diretamente; toda a lógica passa por uma API REST
- **Envio de email transacional** (recuperação de senha) via Resend
- **Responsabilidade em dados de saúde** — o sistema orienta com base em fontes oficiais, mas encaminha a decisão final ao hemocentro, com avisos claros; privacidade do doador por escolha

---

## 🛠️ Tecnologias

**Frontend:** React (Vite), React Router, Leaflet + OpenStreetMap (mapa)
**Backend:** Node.js + Express (API REST), PostgreSQL (nuvem), JWT + bcrypt, Resend (email)

---

## 📁 Estrutura do projeto

Hemare/
├── backend/
│ ├── servidor.js # servidor Express e rotas
│ ├── banco.js # conexão com o PostgreSQL
│ ├── regras/ # lógica de negócio (compatibilidade, triagem, distância)
│ ├── rotas/ # endpoints (auth, doador, hospital, locais, recuperação)
│ ├── middleware/ # autenticação (JWT)
│ └── db/ # scripts de criação e povoamento das tabelas
└── frontend/
└── src/
├── paginas/ # telas (Início, Login, Triagem, Locais, Painel...)
├── componentes/ # Layout, mapa, rota protegida
└── regras/ # cópias das regras usadas no navegador


---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js e um banco PostgreSQL (ex.: gratuito no [Neon](https://neon.tech)).

**Backend:**
```bash
cd backend
npm install
# crie um arquivo .env com:
#   DATABASE_URL=sua_string_do_postgres
#   JWT_SECRET=uma_chave_secreta
#   RESEND_API_KEY=sua_chave_do_resend
node db/criar-tabelas.js    # cria as tabelas principais
node servidor.js            # inicia a API (porta 3000)
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                 # inicia o site (porta 5173)
```

---

## 🗺️ Roadmap

- [x] Autenticação completa (cadastro, login, recuperação de senha por email)
- [x] Perfil do doador e triagem de aptidão
- [x] Diretório de locais com mapa e proximidade
- [x] Compatibilidade sanguínea e match hospital ↔ doador
- [x] Conteúdo educativo (guia, mitos, direitos)
- [ ] Termômetro de estoque de sangue em tempo real
- [ ] Programa de reconhecimento ao doador (emblemas, carteirinha digital)
- [ ] Alertas de urgência em tempo real (WebSocket)
- [ ] Verificação de hospitais por administrador
- [ ] Agendamento inteligente de doação

---

## 👤 Autor

**Henrique Carneiro** — [@Henrique-CR0](https://github.com/Henrique-CR0)

---

*As informações de saúde apresentadas são orientativas e não substituem a avaliação de um profissional. Projeto em desenvolvimento.*