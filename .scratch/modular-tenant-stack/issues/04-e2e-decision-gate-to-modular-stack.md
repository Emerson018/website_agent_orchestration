# 04: End-to-End Decision Gate to Live Modular Stack Orchestration

**What to build:**
Wire the WACRM and Portal Fábrica Decision Gate `[🚀 Iniciar Geração do PWA]` action directly into the Modular Tenant Stack provisioning pipeline. When a human operator approves an enriched lead whose Google Maps dossier has been analyzed, the backend dispatches the project build, allocates isolated ports for frontend and backend, provisions the two-tier workspace, synthesizes the tailored business backend and frontend modules, and streams live progress back to the CRM and Portal interfaces.

**Blocked by:** 03: Dynamic Frontend PWA Module Adapter

**Status:** closed

- [x] Decision Gate trigger (`POST /api/projetos/:id/processar`) invokes the Modular Tenant Stack pipeline passing the full Lead Dossier.
- [x] Tenant backend and frontend are provisioned, configured with environment credentials, and assigned unique runtime ports.
- [x] Build lifecycle progression (`aguardando_decisao` -> `processando` -> `concluido`) is tracked and displayed live in WACRM and Portal Fábrica.
- [x] End-to-end integration test verifies: lead intake -> Google Maps dossier enrichment -> manual operator approval -> successful provisioning of runnable tenant frontend and backend with passing health checks.
