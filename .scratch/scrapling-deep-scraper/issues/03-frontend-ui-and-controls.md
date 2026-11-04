# 03: Gestão de URLs e Botão de Raspagem na Interface do Lead (wacrm)

**What to build:**
Criar a interface para gerenciar URLs de raspagem e exibir os dados capturados:
1. Em `wacrm/src/app/(dashboard)/contacts/[id]/page.tsx`, adicionar o card **"URLs para Raspagem Profunda"**:
   - Input para adicionar nova URL com validação de formato.
   - Lista de URLs com botão de remover e identificação do domínio.
   - Botão **"Raspar com Scrapling"** com spinner de loading e toast de sucesso/erro.
2. Criar card para exibir os dados raspados (`scraped_data`):
   - Cardápio / Catálogo de Serviços (lista de itens com nome, preço formatado e descrição).
   - Textos Institucionais (Sobre Nós / Diferenciais).
3. Atualizar o estado reativo do contato imediatamente após a raspagem sem precisar recarregar a página.
4. Testes com Vitest.

**Blocked by:** 02: Orquestração e Persistência no Backend Node.js (portal_fabrica/backend)

**Status:** closed

- [x] Seção "URLs para Raspagem Profunda" funcional com adição/remoção de links
- [x] Botão "Raspar com Scrapling" integrado com a API `/api/leads/:id/scrape-deep`
- [x] Exibição visual de itens de cardápio e textos institucionais
- [x] Testes no frontend passando
