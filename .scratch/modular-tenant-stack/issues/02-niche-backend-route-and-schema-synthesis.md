# 02: Niche-Driven Backend Route and Schema Synthesis

**What to build:**
Upgrade the AI factory generation pipeline to inspect the `nicho_detectado` from the Google Maps Lead Dossier and dynamically synthesize business domain route handlers and database migration scripts tailored to the client's actual operations. Instead of hardcoding appointment tables across all businesses, the factory generates domain-specific routes inside `workspace/<slug>/backend/routes/`: Digital Menu and WhatsApp Orders for gastronomy (`cardapio.js`, `pedidos.js`), Service Portfolio and Scheduling for appointments (`servicos.js`, `agendamentos.js`), or Product Catalog and Cart for retail (`produtos.js`, `carrinho.js`). All synthesized routes strictly enforce input validation using Zod schemas via `validateRequest()`.

**Blocked by:** 01: Workspace Provisioner Refactor for Two-Tier Tenant Stack

**Status:** closed

- [x] Factory generation prompts and nodes in `agents.py` and `dev_team.py` read `nicho_detectado` from the Lead Dossier.
- [x] Business routes matching the client niche are synthesized into `workspace/<slug>/backend/routes/`.
- [x] Every synthesized endpoint validates incoming request bodies with explicit Zod schemas using `validateRequest({ body: ... })`.
- [x] Corresponding database schema migrations are generated and sanitized in `workspace/<slug>/database/`.
- [x] Integration tests verify that synthesized routes respond correctly with 200/201 on valid input and 400 on malformed payloads.
