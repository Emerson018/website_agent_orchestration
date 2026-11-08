---
status: superseded by ADR-0011
---

# Lead Dossier, Decision Gate, and Composable Backend Blueprint

Previously, the system attempted to autonomously build web applications immediately upon lead intake from web forms or CRM contacts, copying a rigid generic backend template originally designed exclusively for appointment scheduling. This created two major deficiencies: (1) machine resources were wasted generating unverified applications before a human operator could qualify the lead, and (2) non-scheduling businesses (such as restaurants, e-commerce, or service catalogs) received an ill-fitting generic backend structure.

We decided to decouple lead intake from application generation through an intelligence-first Lead Dossier and a human Decision Gate, paired with an on-demand Composable Backend Blueprint.

## Decision

1. **Lead Dossier & Official Google Places Integration**:
   - Web and CRM leads entering with a Google Maps URL (or address/name) trigger the extraction of a **Lead Dossier** using the official Google Places API (`GOOGLE_MAPS_API_KEY`).
   - The dossier aggregates structured intelligence: verified company name, formatted address, operating hours, aggregated star rating, review volume, photo assets, and categorized customer reviews.
   - An LLM sentiment analyzer categorizes reviews into customer praises, operational pain points (e.g., waiting lines, lack of digital menu, booking friction), and synthesizes an actionable WhatsApp sales pitch tailored to solve those specific pains.

2. **Decision Gate (No Autonomous Builds)**:
   - Automated site generation is disabled at the intake layer.
   - All incoming leads default to status `aguardando_decisao` in `fila_projetos` and the CRM.
   - A human operator inspects the Lead Dossier in the WACRM contact panel or Portal Fábrica and manually triggers one of three actions: `[🚀 Iniciar Geração do PWA]`, `[💡 Gerar Pitch Comercial com IA]`, or `[⛔ Desqualificar / Arquivar]`.

3. **Composable Backend Blueprint with Hardened Guardrails**:
   - The legacy monolithic template backend is deprecated in favor of a Composable Backend Blueprint.
   - Core infrastructure and security guardrails (Helmet, CORS policies, rate limiting, Zod schema validation, and database connection pooling) remain frozen, standardized, and audited.
   - Domain-specific database schemas (Prisma/SQL migrations) and business route endpoints are synthesized by the AI agent on-demand only after manual build approval, precisely matching the business model identified in the Lead Dossier.
   - The security and infrastructure guardrail layer must undergo a `/code-review` before deployment.

## Consequences

- **Zero Wasted Generation**: Infrastructure avoids burning LLM tokens and workspace storage on unqualified or incomplete leads.
- **High-Converting Outreach**: Sales operators receive actionable intelligence on the prospective client's actual customer complaints before initiating contact.
- **Tailored Business Backends**: Generated applications match the client's actual business model (e.g., delivery menus, service portfolios, or scheduling) while maintaining audited security guardrails.
