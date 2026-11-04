# 04: Coleta e Exibição de "Resultados da Web" (Presença Digital)

**What to build:**
Extrair e consolidar a presença digital externa do estabelecimento para o Lead Dossier:
1. No backend (`places_service.js`), implementar função `extractWebResults(websiteUrl, additionalLinks, candidateQuery)`:
   - Inspeciona o HTML do site oficial (Instagram, Facebook, LinkedIn, TikTok, YouTube, iFood, TripAdvisor, ReclameAqui, etc.).
   - Consolida com links já fornecidos no briefing do lead (`contactRecord.additional_data.links`).
   - Retorna array estruturado `dossie.resultados_web`: `[{ titulo: string, url: string, tipo: string }]`.
2. No frontend (`page.tsx` e `lead-dossier-card.tsx`), renderizar a seção **"Resultados da Web"** com badges/links clicáveis com ícones reconhecidos.

**Blocked by:** 03 (ou pode rodar após estruturação dos dados do dossiê)

**Status:** closed

- [x] Coletor de links sociais e presença externa funcional
- [x] Mesclagem sem duplicatas com links do briefing
- [x] `dossie.resultados_web` salvo no Supabase
- [x] UI exibe os links como "Resultados da Web" com ícones e links externos seguros (`target="_blank" rel="noreferrer"`)
