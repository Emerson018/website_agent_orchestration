---
status: accepted
---

# Modular Tenant Stack Provisioner and Legacy Template Deprecation

Previously, the AI Software Factory provisioned all client applications by copying a single monolithic Gold Template (`gold_templates/template_base_app`). This legacy template only contained a frontend application and hardcoded SQL scripts for appointment bookings (`agendamentos_base` and `configuracao_agenda`), with hardcoded burger shop data in `api.js`. When prospective leads such as restaurants, retail stores, or professional offices were provisioned, the system forced them into a booking calendar interface without a dedicated backend.

We decided to deprecate `template_base_app` and transition tenant provisioning to a two-tier **Modular Tenant Stack** driven by the Lead Dossier's Google Maps niche classification.

## Decision

1. **Two-Tier Tenant Workspace Structure**:
   - Every generated tenant workspace under `workspace/<slug>/` is structured with two discrete, decoupled layers: `frontend/` and `backend/`.
   - The tenant backend is provisioned from `gold_templates/composable_backend_blueprint/` with audited, frozen security guardrails (Helmet, CORS whitelist, rate limiting, and Zod request validation).
   - The factory synthesizes niche-specific domain routes (e.g., `routes/cardapio.js`, `routes/pedidos.js`, or `routes/servicos.js`) and corresponding database migrations on-demand.

2. **Niche-Driven Module Selection from Lead Dossier**:
   - The factory uses the verified `nicho_detectado` from the Google Maps Lead Dossier to determine which business modules are provisioned:
     - **Gastronomia / Restaurantes**: Digital Menu (`/cardapio`) + WhatsApp Direct Orders (`/pedidos`).
     - **Serviços / Saúde / Estética**: Service Portfolio (`/servicos`) + Smart Scheduling (`/agendar`).
     - **Comércio / Varejo**: Product Catalog (`/produtos`) + Interactive Cart (`/carrinho`).
   - The mandatory booking form is removed from non-scheduling niches.

3. **Workspace Provisioner Refactor**:
   - `ai_software_factory/workspace_provisioner.py` is updated to replace `clone_gold_template()` with `provision_modular_tenant_stack()`, which copies the composable backend blueprint into `workspace/<slug>/backend` and sets up the clean modular frontend in `workspace/<slug>/frontend`.

## Consequences

- **True Product-Market Fit**: Clients in gastronomy, retail, and services receive tailored applications matching their real business models discovered on Google Maps.
- **Enterprise Security by Default**: Every client backend runs isolated behind audited security guardrails, rate limiting, and strict schema validation.
- **Clean Extensibility**: Developers and AI agents can add new niche modules without breaking existing tenant installations.
