# 04: Injeção dos Dados Raspados no Master Prompt Studio & Geração de Sites

**What to build:**
Integrar o conteúdo raspado pelo Scrapling na síntese do Master Prompt e na Fábrica de Software:
1. No gerador de diagnósticos (`multimodal_diagnosis_service.js`), incorporar os blocos de cardápio/produtos e textos institucionais de `scraped_data` no prompt mestre.
2. Garantir que a tabela real de produtos e serviços do cliente seja formatada com clareza para o LLM.
3. Testes validando que o prompt final inclui a seção de produtos e textos raspados quando disponíveis.

**Blocked by:** 03: Gestão de URLs e Botão de Raspagem na Interface do Lead (wacrm)

**Status:** closed

- [x] Master Prompt incorpora catálogo de produtos/cardápio raspado
- [x] Master Prompt incorpora redação institucional do site do cliente
- [x] Testes passando
