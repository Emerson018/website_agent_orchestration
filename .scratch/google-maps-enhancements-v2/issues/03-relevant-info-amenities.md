# 03: Extração e Exibição de Informações Relevantes & Comodidades

**What to build:**
Extrair atributos operacionais detalhados da Google Places API (New) e exibi-los no WACRM:
1. No backend (`places_service.js`), adicionar à máscara da Places API:
   - `places.editorialSummary`
   - `places.priceLevel`
   - `places.accessibilityOptions`
   - `places.paymentOptions`
   - `places.parkingOptions`
   - `places.outdoorSeating`
   - `places.allowsDogs`
   - `places.restroom`
   - `places.goodForChildren`
   - `places.goodForGroups`
2. Sintetizar em `dossie.informacoes_relevantes`:
   - `resumo_editorial`: string
   - `faixa_preco`: string (ex: "Econômico", "Moderado", "Sofisticado")
   - `comodidades`: array de badges (ex: ["Acessível para cadeirantes", "Aceita cartões de crédito/débito", "Aceita pagamentos por aproximação (NFC)", "Estacionamento gratuito", "Pet Friendly", "Mesas ao ar livre"])
3. No frontend (`page.tsx` e `lead-dossier-card.tsx`), criar a seção **"Informações Relevantes & Comodidades"** exibindo o resumo editorial (se houver) e os badges de comodidades.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Places API consulta campos de resumo editorial e comodidades
- [x] Backend normaliza comodidades em badges legíveis
- [x] UI exibe card "Informações Relevantes & Comodidades"
- [x] Fallback gracioso quando atributos não existirem
