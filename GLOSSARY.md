# AI Software Factory & WhatsApp CRM

An integrated ecosystem that captures and qualifies business leads in a WhatsApp CRM, consolidates their Lead Briefing to synthesize a tailored Design Direction, and autonomously provisions customized web applications from a Gold Template.

## Language

### AI Software Factory & Orchestration

**Lead Briefing**:
A structured intake specification capturing a prospective business's name, contact details, reference links, and requested capabilities (`mensagem_lead`).
_Avoid_: Payload, prompt text, raw lead

**Niche Profile**:
The canonical brand archetype for a market segment (such as Odontologia, Barbearia, Estética, Gastronomia, or Pet), pairing hex color tokens, theme polarity, typography, and curated showcase media.
_Avoid_: Niche media, fallback colors, theme preset

**Design Direction**:
The client-specific visual specification derived from a Lead Briefing and Niche Profile before code generation, defining a 4–6 color token palette, display and body typography roles, layout concept, and a single focal design gesture free of generic AI template clichés.
_Avoid_: Design prompt, style config, theme json, UI prompt

**Project Queue Item**:
A tracked build lifecycle record in `fila_projetos` linking a CRM Contact to its Lead Briefing, tenant database credentials, status (`pendente`, `aguardando_agente`, `processando`, `concluido`, `erro`), and generated configuration.
_Avoid_: Job, task, build ticket

**Chat Agent Worker Loop**:
The execution pattern where the pair-programming Antigravity assistant directly acts as the active generation worker, receiving queued tenant briefs, authoring component code, and reporting progress live in the chat.
_Avoid_: Background daemon, phantom runner, blackbox CLI

**Gold Template**:
The canonical reference application in `gold_templates/template_base_app` cloned and customized to produce each client's application.
_Avoid_: Base project, starter kit, boilerplate

**Tenant Workspace**:
The isolated project directory under `workspace/<slug>` and optional single-tenant Supabase database provisioned for a specific client.
_Avoid_: Client folder, target folder, output dir

**Generation Lifecycle (The Three Passes)**:
- **Pass 1 (Design Direction)**: Intake and aesthetic synthesis from Lead Briefing and Niche Profile into `ClientConfig` (`ai_config.json`).
- **Pass 2 (Factory Provisioning)**: Deterministic code injection and workspace provisioning by `TenantWorkspace` and `code_injector_node`.
- **Pass 3 (Refinement Squad)**: Granular post-generation iterative enhancements executed by `dev_team.py` (`refine_tenant_workspace`) with code tools.

**LLM Gateway**:
The deep module (`ai_software_factory/llm_gateway.py`) encapsulating model selection, rate-limit retries, local LM Studio HTTP transport, markdown fence cleanup, and structured schema synthesis behind a unified interface.
_Avoid_: Raw LLM caller, ChatOpenAI wrapper

**Motion Choreography**:
Orchestrated, physics-based UI transitions and scroll-triggered reveals tailored to client brand identity.
_Avoid_: Flashy animations, page effects

### Scheduling & Client Applications

**Booking**:
A customer appointment for a specific date, time slot, and service (`agendamentos_base`), progressing through `Confirmado`, `Em andamento`, `Finalizado`, and `Cancelado`.
_Avoid_: Reservation, event, order

**Schedule Configuration**:
The operating rules of an establishment (`configuracao_agenda`), defining active weekdays, bookable time slots, and per-slot capacity (`vagas_padrao`).
_Avoid_: Calendar settings, business hours

### WhatsApp CRM (WACRM)

**CRM Contact**:
A business lead or customer record in WACRM (`contacts`), enriched with custom fields, tags, RAG brand reports, conversations, and sales pipeline deals.
_Avoid_: Client, user, account
