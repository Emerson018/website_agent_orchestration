# 01: Refatoração das Avaliações (Últimas 5 Estrelas, Dores <= 3 Estrelas & Remoção de Elogios Recorrentes)

**What to build:**
Refatorar a extração e exibição das avaliações do Google Maps no Dossiê do Lead:
1. No backend (`places_service.js`), ordenar as avaliações recebidas da Google Places API por data (`publishTime`) de forma decrescente (mais recentes primeiro).
2. Filtrar estritamente as avaliações com nota 5 (`rating === 5`), limitando a até 4 avaliações mais recentes em `dossie.avaliacoes_positivas`.
3. Filtrar as avaliações de desafios/dores de atendimento onde a nota seja menor ou igual a 3 (`rating <= 3`), limitando a até 2 avaliações mais recentes em `dossie.dores_destaque`.
4. Se não houver nenhuma avaliação com nota <= 3, definir fallback amigável: `texto: "Sem nenhuma avaliação negativa."`.
5. No frontend (`wacrm/src/app/(dashboard)/contacts/[id]/page.tsx` e `lead-dossier-card.tsx`), remover a seção duplicada "Elogios Recorrentes", renomear o título para "Últimas avaliações com 5 estrelas" e exibir a mensagem "Sem nenhuma avaliação negativa." quando não houver dores relatadas.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Avaliações ordenadas cronologicamente por `publishTime` decrescente
- [x] `avaliacoes_positivas` contém até 4 avaliações com `rating === 5`
- [x] `dores_destaque` contém até 2 avaliações com `rating <= 3`
- [x] Fallback `"Sem nenhuma avaliação negativa."` ativo quando não houver avaliações <= 3
- [x] Bloco de "Elogios Recorrentes" removido da UI
- [x] Título alterado para "Últimas avaliações com 5 estrelas"
