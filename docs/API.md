# API do Hemare

> Gerado automaticamente a partir do código (`npm run docs`, na pasta `backend`). **Não edite à mão**: escreva um comentário `//` na linha de cima da rota e gere de novo. O mesmo conteúdo, em formato OpenAPI 3, está em [`openapi.json`](openapi.json) (abra no [Swagger Editor](https://editor.swagger.io)).

**91 rotas** em 19 grupos.

## Como usar

- **Base**: `http://localhost:3000` (ou o endereço do seu backend). Corpo e resposta em **JSON** (`Content-Type: application/json`), limite de 200 KB.
- **Entrar**: `POST /auth/login` devolve `token`. Nas rotas que não são públicas, envie `Authorization: Bearer <token>`.
- **Sessão**: o token vale 1 dia (7 com `lembrar: true`). `GET /auth/eu` confere a sessão e `POST /auth/renovar` troca por um novo.
- **Erros** sempre em JSON: `{ "erro": "mensagem para a pessoa" }`.

| Código | Quando |
|---|---|
| 200 / 201 / 204 | deu certo / criou (com `Location` quando há um recurso novo) / deu certo e não há corpo |
| 400 | dado inválido ou faltando |
| 401 | sem token, token inválido ou expirado, ou sessão encerrada |
| 403 | logado, mas o papel não permite (ou hospital ainda não aprovado) |
| 404 | não existe (ou não é seu: a API não revela a existência) |
| 409 | conflito (já existe, horário lotado, estado que não permite a mudança) |
| 413 | corpo grande demais |
| 429 | muitas tentativas; veja o cabeçalho `Retry-After` |
| 500 | erro inesperado (em produção, sem detalhes internos) |

**Acesso**: *público* (sem login) · *logado* (qualquer conta) · *doador* · *hospital* · *hospital aprovado* (cadastro verificado por um administrador) · *admin*. O papel é conferido no servidor (porteiros `autenticar`, `exigirAdmin` e `exigirHospitalAprovado`, ou uma checagem do tipo da conta dentro da rota).

## CRUD por recurso

C = criar (`POST`) · R = ler (`GET`) · U = atualizar (`PUT`/`PATCH`) · D = apagar (`DELETE`). Lacuna nem sempre é defeito: doações confirmadas, por exemplo, nunca se alteram de propósito (cadeia de confiança).

| Grupo | C | R | U | D | Rotas |
|---|:-:|:-:|:-:|:-:|--:|
| Administrador (`/admin`) | ✅ | ✅ | — | — | 4 |
| Agenda do hospital (`/agenda`) | ✅ | ✅ | ✅ | ✅ | 8 |
| Agendamentos do doador (`/agendamentos`) | ✅ | ✅ | ✅ | ✅ | 5 |
| Apadrinhamento (`/apadrinhamento`) | ✅ | ✅ | — | ✅ | 8 |
| Conta e sessão (`/auth`) | ✅ | ✅ | ✅ | — | 7 |
| Campanhas de reposição (`/campanha`) | ✅ | ✅ | — | ✅ | 8 |
| Previsão do sangue (`/clima`) | — | ✅ | — | — | 1 |
| Doador (`/doador`) | ✅ | ✅ | — | — | 5 |
| Minhas doações (`/historico`) | — | ✅ | — | — | 1 |
| Hospital (`/hospital`) | ✅ | ✅ | ✅ | ✅ | 12 |
| Locais de doação (`/locais`) | — | ✅ | — | — | 1 |
| Canal de notícias (`/noticias`) | ✅ | ✅ | ✅ | ✅ | 8 |
| Ficha PcD (`/pcd`) | ✅ | ✅ | ✅ | — | 4 |
| Perfil do doador (LGPD) (`/perfil`) | ✅ | ✅ | ✅ | — | 4 |
| Radar preditivo (`/radar`) | — | ✅ | — | — | 1 |
| Raiz (`/`) | — | ✅ | — | — | 1 |
| Rede de sangue raro (`/raros`) | ✅ | ✅ | ✅ | — | 10 |
| Recuperação de senha (`/recuperacao`) | ✅ | — | — | — | 2 |
| Saúde (`/saude`) | — | ✅ | — | — | 1 |

## Rotas

### Administrador

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/admin/hospitais` | admin | LISTAR hospitais para verificacao (?status=pendente\|aprovado\|recusado\|todos). |
| `POST` | `/admin/hospitais/:id/aprovar` | admin | APROVAR um hospital. |
| `POST` | `/admin/hospitais/:id/recusar` | admin | RECUSAR (ou revogar a aprovacao de) um hospital, com motivo obrigatorio. |
| `GET` | `/admin/status` | admin | STATUS do desenvolvimento: o relatorio (docs/STATUS.md) e o uso real do sistema (so numeros agregados). |

### Agenda do hospital

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/agenda/agendamentos` | hospital aprovado | HOSPITAL: quem agendou para um dia (?data=AAAA-MM-DD, padrao hoje): so nome, tipo sanguineo e horario. |
| `PATCH` | `/agenda/agendamentos/:id` | hospital aprovado | HOSPITAL: marca "compareceu" (so no dia; a doacao entra na cadeia de confianca), "faltou" ou "cancelado". |
| `GET` | `/agenda/hospitais` | doador | HOSPITAIS aprovados que tem horario livre para agendar (com o proximo horario). |
| `GET` | `/agenda/hospitais/:id/vagas` | doador | HORARIOS livres de um hospital, agrupados por dia. |
| `GET` | `/agenda/vagas` | hospital aprovado | HOSPITAL: seus horarios abertos, com quantas vagas ja foram reservadas (?de=&ate=). |
| `POST` | `/agenda/vagas` | hospital aprovado | HOSPITAL: abre horarios em lote (periodo, dias da semana, horarios e capacidade). |
| `PATCH` | `/agenda/vagas/:id` | hospital aprovado | HOSPITAL: muda a capacidade de um horario (nunca abaixo de quem ja agendou). |
| `DELETE` | `/agenda/vagas/:id` | hospital aprovado | HOSPITAL: apaga um horario vazio e sem historico (204). |

### Agendamentos do doador

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/agendamentos` | doador | DOADOR: seus agendamentos (?status=agendado\|compareceu\|faltou\|cancelado). |
| `POST` | `/agendamentos` | doador | DOADOR: agenda um horario (vagaId). Responde 201 com Location; 409 se lotou ou se ja tem agendamento ativo. |
| `GET` | `/agendamentos/:id` | doador | DOADOR: um agendamento seu (404 se for de outra pessoa). |
| `PATCH` | `/agendamentos/:id` | doador | DOADOR: reagenda para outro horario (vagaId); o antigo so e liberado quando o novo e confirmado. |
| `DELETE` | `/agendamentos/:id` | doador | DOADOR: cancela o agendamento e libera a vaga (204). |

### Apadrinhamento

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/apadrinhamento` | doador | PUBLICO: pacientes que estao procurando padrinhos (so de hospitais aprovados). |
| `POST` | `/apadrinhamento` | hospital aprovado | HOSPITAL: cadastra um paciente que precisa de padrinhos. |
| `POST` | `/apadrinhamento/:id/apadrinhar` | doador | DOADOR: vira padrinho de um paciente. |
| `DELETE` | `/apadrinhamento/:id/apadrinhar` | doador | DOADOR: deixa de ser padrinho (a qualquer momento, sem explicacao). |
| `POST` | `/apadrinhamento/:id/chamar` | hospital aprovado | HOSPITAL: chama por email os padrinhos deste paciente que ja podem doar (no maximo 1 vez por semana). |
| `POST` | `/apadrinhamento/:id/encerrar` | hospital aprovado | HOSPITAL: encerra o pedido (o paciente sai da lista publica). |
| `GET` | `/apadrinhamento/meus-afilhados` | doador | DOADOR: pacientes que ele apadrinha e se ja pode doar. |
| `GET` | `/apadrinhamento/meus-casos` | hospital aprovado | HOSPITAL: seus pacientes ativos, com quantos padrinhos e se ja pode chamar de novo. |

### Conta e sessão

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `POST` | `/auth/cadastro` | público | CADASTRO: cria apenas a conta (usuario). O perfil de doador e preenchido depois do login. |
| `GET` | `/auth/eu` | logado | Quem esta logado (e a conta ainda existe). O site chama ao abrir: e o "login automatico". |
| `PATCH` | `/auth/eu` | logado | Muda o nome da conta (o e-mail nao muda por aqui: exigiria confirmar o novo endereco). |
| `POST` | `/auth/login` | público | LOGIN: confere email e senha; se baterem, devolve um token JWT. |
| `POST` | `/auth/renovar` | logado | Sessao deslizante: troca o token por outro novo (com a mesma "vida") enquanto a pessoa usa o site. |
| `POST` | `/auth/sair-de-todos` | logado | "Sair de todos os aparelhos": encerra todas as sessoes, inclusive esta. |
| `PUT` | `/auth/senha` | logado | Trocar a senha: pede a atual, valida a nova e encerra as outras sessoes (esta continua, com um token novo). |

### Campanhas de reposição

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `POST` | `/campanha` | hospital aprovado | HOSPITAL: abre uma campanha para um paciente internado. |
| `GET` | `/campanha/:codigo` | público | PUBLICO: pagina da campanha (quem recebe o link ve isto, sem precisar de conta). |
| `POST` | `/campanha/:codigo/confirmar` | hospital aprovado | HOSPITAL: confirma a doacao de quem prometeu (entra na cadeia de confianca e conta para a campanha). |
| `POST` | `/campanha/:codigo/encerrar` | hospital aprovado | HOSPITAL: encerra a campanha (a pagina publica passa a mostrar "encerrada"). |
| `POST` | `/campanha/:codigo/prometer` | doador | DOADOR: promete doar em uma data (o hospital passa a ver seu nome e telefone so para esta campanha). |
| `DELETE` | `/campanha/:codigo/prometer` | doador | DOADOR: desiste da promessa (so enquanto o hospital nao confirmou a doacao). |
| `GET` | `/campanha/minhas` | hospital aprovado | HOSPITAL: suas campanhas ativas, com quem prometeu doar (nome e telefone, que o doador autorizou ao prometer). |
| `GET` | `/campanha/minhas-promessas` | doador | DOADOR: campanhas em que prometeu doar. |

### Previsão do sangue

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/clima` | público | PREVISAO DO SANGUE: o "clima" de cada cidade pelo pior nivel de estoque dos hospitais aprovados. |

### Doador

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/doador/conquistas` | doador | CONQUISTAS: nivel, emblemas e quando o doador logado pode doar de novo (gamificacao). |
| `GET` | `/doador/indicacao` | doador | TRAGA UM AMIGO: codigo de convite do doador (criado na primeira vez) e quantos amigos vieram. So devolve numeros: nunca o nome de quem foi convidado. |
| `POST` | `/doador/lembrete` | doador | LEMBRETE DE RETORNO: o doador liga ou desliga o email "voce ja pode doar de novo" (opt-in). |
| `POST` | `/doador/perfil` | doador | COMPLETAR PERFIL: salva os dados do doador logado. |
| `GET` | `/doador/placar` | público | PUBLICO: placar das cidades que mais doam (so numeros agregados, sem dados pessoais). |

### Minhas doações

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/historico` | doador | DOADOR: "Minhas doacoes": total, vidas, quando fica apto, limite do ano e linha do tempo com selo da cadeia. |

### Hospital

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/hospital/cadeia/verificar` | público | PUBLICO: verifica a integridade de toda a cadeia de doacoes (auditoria). |
| `POST` | `/hospital/confirmar-doacao` | hospital aprovado | CONFIRMAR DOACAO: registra a doacao com hash encadeado (cadeia de confianca / auditabilidade). |
| `GET` | `/hospital/estoque` | hospital | LISTAR o estoque do hospital logado. |
| `POST` | `/hospital/estoque` | hospital aprovado | DEFINIR/ATUALIZAR o nivel de estoque de um tipo sanguineo (hospital logado). |
| `GET` | `/hospital/estoque-publico` | público | PUBLICO: lista o estoque de todos os hospitais (para o termometro publico). |
| `GET` | `/hospital/match/:necessidadeId` | hospital aprovado | MATCH: dado o id de uma necessidade, acha os doadores compativeis. So o hospital aprovado DONO da necessidade ve os doadores (e o contato de quem consentiu). |
| `GET` | `/hospital/meus-dados` | hospital | DADOS do hospital logado (nome, e-mail, CNPJ, CNES, endereco e status de verificacao): sao do proprio hospital. |
| `POST` | `/hospital/necessidade` | hospital aprovado | PUBLICAR uma necessidade (o hospital pede um tipo sanguineo). |
| `GET` | `/hospital/necessidades` | hospital | LISTAR as necessidades do hospital logado. |
| `PATCH` | `/hospital/necessidades/:id` | hospital aprovado | ATUALIZAR uma necessidade: fechar como "atendida" ou "cancelada", reabrir ou mudar a urgencia. Fechada, ela deixa de contar como urgencia no canal de noticias. |
| `DELETE` | `/hospital/necessidades/:id` | hospital aprovado | APAGAR uma necessidade do proprio hospital (de vez). Para so tirar do ar, prefira marcar como "cancelada". |
| `POST` | `/hospital/perfil` | hospital | COMPLETAR/ATUALIZAR PERFIL do hospital (dados completos). |

### Locais de doação

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/locais` | público | LISTAR locais. Aceita ?cidade=Recife para filtrar. |

### Canal de notícias

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/noticias` | público | PUBLICO: panorama dos 27 estados, do mais grave para o mais tranquilo. |
| `POST` | `/noticias` | admin | ADMIN: cadastra um aviso. |
| `PUT` | `/noticias/:id` | admin | ADMIN: corrige um aviso (substitui os campos, como no cadastro). |
| `DELETE` | `/noticias/:id` | admin | ADMIN: remove um aviso. |
| `GET` | `/noticias/feed` | público | PUBLICO: feed de noticias (estilo Google Noticias), mais novas primeiro. Filtros: ?categoria=doacao\|estoque\|campanhas\|orgaos\|saude ?uf=PE ?q=texto ?pagina=2 |
| `PUT` | `/noticias/feed/:id/ocultar` | admin | ADMIN: esconde (ou volta a mostrar) uma noticia do feed. Ela continua guardada, entao a coleta nao a traz de volta. |
| `GET` | `/noticias/feed/coleta` | admin | ADMIN: resultado da ultima coleta (quais fontes responderam, quantas notícias novas). |
| `POST` | `/noticias/feed/coletar` | admin | ADMIN: coleta os feeds agora (sem esperar a hora cheia) e mostra o resultado de cada fonte. |

### Ficha PcD

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/pcd/eu` | doador | DOADOR: a propria declaracao de pessoa com deficiencia (so a pessoa ve; nunca um hospital). |
| `PUT` | `/pcd/eu` | doador | DOADOR: declara (com consentimento) ou deixa de declarar a condicao de PcD e o que ajuda no atendimento. |
| `POST` | `/pcd/ficha` | doador | DOADOR: ficha de orientacao para a triagem de PcD. Calcula na hora e nao guarda nada. |
| `GET` | `/pcd/guia` | doador | DOADOR: as perguntas e opcoes da ficha de PcD (so para quem tem conta: e uma ficha sobre saude). |

### Perfil do doador (LGPD)

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/perfil` | doador | VER o proprio perfil. |
| `PUT` | `/perfil` | doador | EDITAR o perfil (nome, dados pessoais, foto, privacidade). |
| `POST` | `/perfil/excluir` | doador | EXCLUIR a conta (direito de eliminacao da LGPD). Pede a senha. Os dados pessoais sao apagados; as doacoes ja confirmadas ficam SEM nenhum dado pessoal, porque fazem parte da cadeia de confianca e nao podem sumir. |
| `GET` | `/perfil/exportar` | doador | BAIXAR os proprios dados (direito de acesso da LGPD): um arquivo JSON com tudo que o Hemare guarda da pessoa. |

### Radar preditivo

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/radar/aptidao` | hospital ou admin | RADAR PREDITIVO: quantos doadores de cada tipo estao aptos agora, em ate 7 dias e em ate 30 dias (so numeros). |

### Raiz

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/` | público | Rota de teste: quando alguem acessar a raiz, responde uma mensagem. |

### Rede de sangue raro

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/raros/codigo/:codigo` | hospital aprovado | Conferir o laudo pessoalmente: o doador mostra o codigo; o hospital ve so o primeiro nome e o fenotipo declarado. |
| `POST` | `/raros/codigo/:codigo/confirmar` | hospital aprovado | HOSPITAL: confirma o fenotipo do doador depois de conferir o laudo pessoalmente. |
| `POST` | `/raros/convocacoes/:pedidoId/responder` | doador | Responder a um chamado: "posso ajudar" libera nome e telefone so para o hospital deste pedido. |
| `GET` | `/raros/eu` | doador | DOADOR: sua participacao na rede de sangue raro, o codigo para o hospital conferir o laudo e os chamados abertos. |
| `PUT` | `/raros/eu` | doador | Entrar, mudar ou sair da rede. |
| `GET` | `/raros/pedidos` | hospital aprovado | Pedidos do hospital. Nome e telefone so aparecem de quem respondeu "disponivel", e so enquanto o pedido esta aberto. |
| `POST` | `/raros/pedidos` | hospital aprovado | Abre o pedido e chama os doadores compativeis. |
| `POST` | `/raros/pedidos/:id/confirmar-doacao` | hospital aprovado | Confirma a doacao de quem respondeu "posso ajudar" (entra na cadeia de confianca). |
| `POST` | `/raros/pedidos/:id/encerrar` | hospital aprovado | HOSPITAL: encerra o pedido de emergencia (os contatos voltam a ficar protegidos). |
| `GET` | `/raros/previa` | hospital aprovado | Previa: so numeros (nunca quem sao). Ajuda o hospital a decidir antes de chamar. |

### Recuperação de senha

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `POST` | `/recuperacao/pedir` | público | PEDIR RECUPERACAO: gera um codigo, salva e envia por email. |
| `POST` | `/recuperacao/redefinir` | público | REDEFINIR: confere o codigo e troca a senha. |

### Saúde

| Método | Caminho | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/saude` | público | Saude da API (para monitoramento e para conferir que o servidor esta de pe). |
