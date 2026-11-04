# 01: Módulo de Raspagem em Python com Fallback Resiliente de Produção (ai_software_factory)

**What to build:**
Implementar o serviço de raspagem profunda em Python utilizando a biblioteca Scrapling dentro de `ai_software_factory`:
1. Instalar `scrapling` no ambiente Python.
2. Criar `ai_software_factory/scraper_service.py` com a função `scrape_urls_deep(urls: list[str])`.
3. Adicionar lógica de fallback inteligente para produção:
   - Tenta inicialmente o `StealthFetcher` (renderização com headless browser para sites dinâmicos / proteções);
   - Se o ambiente de produção não tiver o Chromium/Playwright disponível ou lançar exceção, chaveia automaticamente para o `Fetcher` leve (requisições HTTP rápidas com `Adaptor` do Scrapling).
4. Extrair seletivamente:
   - Catálogo de cardápio / serviços: itens, preços, descrições e fotos de produtos.
   - Textos institucionais: Sobre Nós, serviços, horários e dados de contato.
   - Markdown consolidado limpo para LLMs.
5. Criar o endpoint `POST /api/scrape/deep` em `ai_software_factory/main.py`.
6. Cobrir com testes em Python (`pytest`).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Biblioteca Scrapling configurada em ai_software_factory
- [x] Módulo `scraper_service.py` implementado com extração de cardápios e institucional
- [x] Fallback automático para modo HTTP se o navegador headless falhar
- [x] Endpoint `POST /api/scrape/deep` registrado no FastAPI
- [x] Testes passando em Python
