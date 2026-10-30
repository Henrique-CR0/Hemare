# Feed de notícias (estilo Google Notícias)

> Decisão de produto + pesquisa, de 30/10/2026. A aba **Notícias** mostra reportagens sobre doação de sangue, estoques, campanhas, órgãos/medula/leite e saúde, atualizadas de hora em hora, com o jeito do Google Notícias: destaques em grade com foto, lista logo abaixo, "há 2 horas", busca e filtros. Isto **não é parecer jurídico**: é o que a pesquisa encontrou e a decisão de cautela tomada a partir dela.

## 1. Como funciona

```
RSS de cada fonte ──▶ coletor (a cada 1 h) ──▶ filtra, classifica, junta repetidas ──▶ tabela noticias_feed ──▶ GET /noticias/feed ──▶ aba Notícias
```

| Peça | Arquivo |
|---|---|
| Lista de fontes (com licença e tipo de cada uma) | `backend/regras/fontes.js` |
| Leitura de RSS/Atom/RDF, limpeza de HTML, categorias, estado, repetidas (puro, sem rede) | `backend/regras/feed.js` |
| Coletor (baixa, aplica as regras, guarda o que é novo, apaga o que tem mais de 90 dias) | `backend/servicos/coletorNoticias.js` |
| Tarefa automática (ao ligar e de hora em hora) | `backend/tarefas/coletarNoticias.js` |
| Tabela | `backend/db/criar-noticias-feed.js` (`npm run migrar` já inclui) |
| API pública | `GET /noticias/feed?categoria=&uf=&q=&pagina=` |
| API do administrador | `POST /noticias/feed/coletar`, `GET /noticias/feed/coleta`, `PUT /noticias/feed/:id/ocultar` |
| Tela | `frontend/src/paginas/Noticias.jsx`, `componentes/FeedNoticias.jsx`, `componentes/ColetaNoticias.jsx` (painel do admin) |

**Categorias:** 🩸 Doação de sangue · 🚨 Estoques e urgência · 📣 Campanhas · 💚 Órgãos, medula e leite · ⚕️ Saúde. A regra é por palavras (sem acento), por exemplo: *"estoque/baixo/pede/urgente" + "sangue" → Estoques e urgência*; *"hemocentro" sozinho → Saúde* (a não ser que peça doadores). Feeds de saúde e de hemocentro entram inteiros; feeds de **notícias gerais só entram se falarem do nosso assunto** (assim "campanha eleitoral" não vira campanha de saúde).

**Estado:** vem da fonte (ex.: hemocentro de SP) ou do texto, **só se citar um estado** (nunca "para" como se fosse o Pará).

**Repetidas:** o mesmo link, ou o mesmo título vindo de fontes diferentes, entra uma vez só. Notícia com mais de 30 dias, sem data confiável ou com link estranho (`javascript:`) não entra. Data no futuro vira "agora".

## 2. Por que NÃO o Google Notícias (nem GDELT, nem Bing)

| Opção | O que a pesquisa achou | Decisão |
|---|---|---|
| **Feed RSS do Google Notícias** | Cada feed traz o aviso de que existe "para um leitor de feeds **pessoal**, de uso **não comercial**" e que qualquer outro uso é proibido ([resumo](https://www.wprssaggregator.com/google-news-rss-feed/); um [projeto no GitHub](https://github.com/Nishfleet/0509/issues/5067) removeu o adaptador por isso). Não existe API oficial do Google Notícias. | ❌ não usar em site público |
| **GDELT** | Respondeu `429` (limite de pedidos) nos testes e os termos limitam o uso. | ❌ |
| **Bing News RSS** | Responde, mas não é um produto oficial para republicar. | ❌ |
| **GNews e similares** (API paga/gratuita) | A camada gratuita tem ~100 pedidos/dia, notícias com atraso e termos pouco claros para uso comercial. | ⏸️ opção futura se for contratada |
| **RSS que o próprio veículo publica** | É para isso que o feed existe: ser lido por outros programas. Cada veículo tem seus termos. | ✅ **escolhido** |

## 3. Cuidado com direitos autorais

- O Brasil não tem uma exceção específica para agregadores. A exceção de reprodução da imprensa (Lei 9.610/98, art. 46, I, *a*) é lida de forma restrita, e o STJ entendeu em 2023 (REsp 2.008.122/SP) que o *clipping* não é atividade de imprensa ([comentário](https://rbdcivil.ibdcivil.org.br/rbdc/article/view/991)).
- Por isso o Hemare mostra **só**: título, **trecho curto (até 240 caracteres)**, a **imagem de divulgação que o próprio feed oferece**, o **nome da fonte** e o **link da matéria original**. Nunca o texto completo. O clique abre no site da fonte, que ganha a visita.
- **Fontes públicas primeiro:** Agência Câmara e Agência Senado permitem reprodução citando a fonte ([Câmara](https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/noticias-e-fotografias), [Senado](https://www12.senado.leg.br/noticias/politica-de-uso)); a Agência Brasil (EBC) pede crédito, e o uso comercial passa pelo licenciamento da EBC; Fiocruz, USP e o governo de Minas são instituições públicas. Nenhuma delas tem uma licença de RSS específica publicada que pudemos confirmar: se o Hemare passar a ter fins comerciais, vale pedir autorização por escrito.
- **Veículos comerciais (g1) ficam desligados.** Não conseguimos confirmar os termos do RSS deles. Para ligar, depois de conferir ou de obter autorização: `NOTICIAS_FONTES_OPCIONAIS=g1-saude,g1` no `.env` do backend.
- Quem tiver o conteúdo mostrado aqui e quiser que saia: o administrador esconde a notícia (`Esconder` na própria tela) ou tira a fonte de `fontes.js`.

## 4. Fontes testadas em 30/10/2026

| Fonte | Resultado | Situação |
|---|---|---|
| Agência Brasil, editoria Saúde | RSS, 10 itens, com foto | ✅ ativa |
| Agência Brasil, últimas | RSS, 10 itens | ✅ ativa (só entra o que for do nosso assunto) |
| Agência Câmara | RSS, 20 itens | ✅ ativa (idem) |
| Agência Senado | RSS, 15 itens | ✅ ativa (idem) |
| Agência Fiocruz de Notícias | RSS, 10 itens (o resumo do feed é só campo técnico, então só título e link) | ✅ ativa |
| Hemocentro de Ribeirão Preto (USP) | RSS, 10 itens, sem foto | ✅ ativa, estado SP |
| Agência Minas (governo de MG) | RSS, 50 itens, com foto | ✅ ativa (só nosso assunto), estado MG |
| g1 saúde / g1 | RSS, 100 itens cada, quase todos com foto | ⏸️ desligada (termos) |
| gov.br/saude | o "RSS" lista **pastas por ano** (título "2014"), não notícias | ❌ inutilizável |
| Hemope, Hemominas, Hemorio, FHB, Hemoba, Hemoam, Hemosc, Hemepar, Hemoes, Saúde RJ/PR/RS | sem feed, 404, 403, 500 ou erro de certificado | ❌ ver "Como melhorar" |

## 5. Como acrescentar uma fonte

1. Ache o endereço do feed (procure `rss`, `feed` ou `atom` no site, ou o ícone de RSS) e **leia os termos de uso do site**.
2. Acrescente um item em `FONTES`, em `backend/regras/fontes.js`: `id`, `nome`, `url` (https), `tipo` (`sangue`, `saude` ou `geral`), `uf` (se for de um estado), `licenca` (uma frase) e `ativa`.
3. Rode `node tarefas/coletarNoticias.js` (na pasta `backend`) e veja se entram notícias. `npm test` confere que a lista é válida (ids únicos, só https, licença preenchida).

**Como melhorar:** os hemocentros estaduais que não têm feed (Hemope, Hemominas...) podem ser incluídos assim que publicarem um RSS, ou por parceria (eles mesmos mandam o aviso para o Hemare). O painel do administrador já tem o cadastro manual de avisos por estado.

## 6. Privacidade

- **O Hemare não manda nenhum dado de usuário às fontes.** Só o servidor pede os feeds, com um `User-Agent` que diz quem somos (`HemareBot`), um pedido por feed de hora em hora, tempo limite de 12 s e tamanho máximo de 3 MB.
- **A foto é carregada pelo navegador de quem lê**, direto do servidor da fonte (como no Google Notícias). Isso mostra o endereço de IP do visitante ao veículo. Mitigação: `referrerPolicy="no-referrer"` (a fonte não sabe de qual página veio) e só imagens `https`. Se isso virar um problema, a saída é o Hemare guardar uma miniatura própria (exige regra de licença e armazenamento).
- A rota `GET /noticias/feed` é pública de propósito (só texto de matérias públicas) e está na lista de rotas públicas conferida por teste (`docs/ACESSO.md`).

## 7. Limites honestos

- Só existe notícia se alguém publicar um RSS. Hoje o volume é de dezenas de itens por semana, não centenas: o Google Notícias olha milhares de sites.
- As categorias são por palavras, não por inteligência artificial: algumas notícias vão para a categoria "errada" ou ficam de fora. Em caso de erro, o administrador esconde a notícia.
- O servidor guarda as notícias por 90 dias e mostra as de até 30. O feed só se enche enquanto o servidor estiver ligado (o plano gratuito de hospedagem que "dorme" coleta menos).
