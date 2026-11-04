# 04: Galeria Curada de 6 Fotos com Classificação Multimodal (Cardápio vs Geral)

**What to build:**
O sistema limita a extração de fotos a estritamente 6 imagens do Google Places. Essas 6 fotos são submetidas a uma classificação rápida em lote via Gemini Flash Vision para etiquetar cada foto como `cardapio` (foto de pratos com preços, menus impressos, folhas de cardápio) ou `foto_normal` (ambiente, fachada, decoração, equipe). A classificação roda de forma resiliente com timeout de 3.5 segundos: em caso de falha, timeout ou cota esgotada, todas as fotos são marcadas como `foto_normal` com `ia_status: 'nao_classificado'` sem travar a requisição. Na interface do CRM, a galeria exibe um selo `[Cardápio]` sobre as imagens correspondentes e disponibiliza filtros rápidos ("Todas (6)", "Cardápio", "Ambiente").

**Blocked by:** 01: Sincronização de Identidade Verificada, Site Oficial e Tratamento Dual de Telefones

**Status:** completed

- [x] Truncamento estrito de fotos em `slice(0, 6)` na resposta da Places API.
- [x] Serviço de IA no backend (`classifyPhotosWithGemini`) que envia as 6 URLs/referências de fotos em lote único com timeout de 3.5s.
- [x] Fallback resiliente: caso a IA falhe ou atinja timeout, todas as fotos recebem `tipo: 'foto_normal'` e o dossiê segue com sucesso.
- [x] Cada foto no array `dossie.fotos` possui `id`, `photo_url`, `tipo` ("cardapio" ou "foto_normal") e `attribution`.
- [x] Galeria de fotos na UI do CRM exibe tag `[Cardápio]` e botões de filtro rápido ("Todas", "Cardápio", "Ambiente/Geral").
- [x] Teste automatizado valida a resiliência do fallback quando a visão computacional não responde.
