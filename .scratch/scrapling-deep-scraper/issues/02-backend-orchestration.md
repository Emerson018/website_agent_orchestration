# 02: Orquestração e Persistência no Backend Node.js (portal_fabrica/backend)

**What to build:**
Conectar o backend Express (`portal_fabrica/backend/server.js`) ao microsserviço Python de raspagem e persistir em `contacts.additional_data.scraped_data`:
1. Criar o endpoint `POST /api/leads/:id/scrape-deep` em `server.js`.
2. Carregar as URLs do lead (`additional_data.scraping_urls` ou `additional_data.links` ou URLs enviadas no body).
3. Despachar para `http://localhost:8000/api/scrape/deep` com timeout de 30s.
4. Salvar os dados extraídos no Supabase em `contacts.additional_data.scraped_data` (e `fila_projetos` se houver projeto ativo).
5. Retornar resposta padronizada `{ success: true, scraped_data: ... }`.
6. Cobrir com testes em Node.js (`*.test.mjs`).

**Blocked by:** 01: Módulo de Raspagem em Python com Fallback Resiliente de Produção (ai_software_factory)

**Status:** closed

- [x] Endpoint `POST /api/leads/:id/scrape-deep` implementado em server.js
- [x] Comunicação resiliente com o FastAPI na porta 8000
- [x] Persistência de `scraped_data` no Supabase em `contacts.additional_data`
- [x] Teste automatizado passando no backend
