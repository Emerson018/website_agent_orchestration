# 03: Crawler do Site Oficial para Captura de Link de Cardápio Digital

**What to build:**
Como a Google Places API não fornece um campo nativo de URL de cardápio, o backend realiza uma inspeção leve no site oficial do estabelecimento (`websiteUri`), com timeout estrito de 3.5 segundos, buscando links internos ou de terceiros voltados a cardápio ou pedidos online (`/cardapio`, `/menu`, `pedir`, iFood, Goomer, Anota.ai, OlaClick, etc.). O link encontrado é salvo em `dossie.link_cardapio` (ou `null` caso ausente). Na UI do CRM, se houver link de cardápio, um botão de atalho direto "Ver Cardápio" é exibido no topo do dossiê ao lado dos links de site e Maps.

**Blocked by:** 01: Sincronização de Identidade Verificada, Site Oficial e Tratamento Dual de Telefones

**Status:** completed

- [x] Função `extractMenuLink(websiteUrl)` implementada com timeout de 3.5s e suporte a expressões regulares para rotas de menu e domínios de cardápio digital (iFood, Goomer, Anota.ai, OlaClick, Cardápio Web, InstaDelivery, etc.).
- [x] Fallback gracioso: erros de conexão, timeout ou ausência de link resultam em `null` sem quebrar o enriquecimento do lead.
- [x] Resultado armazenado em `dossie.link_cardapio`.
- [x] Componente `LeadDossierCard` e página `/contacts/[id]` exibem botão de ação "Cardápio" com ícone externo quando o link existir.
- [x] Teste automatizado com mock de HTML contendo link de cardápio confirma a extração correta.
