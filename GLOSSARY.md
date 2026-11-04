# AI Software Factory & WhatsApp CRM

An integrated ecosystem that captures and qualifies business leads in a WhatsApp CRM, consolidates their Lead Briefing to synthesize a tailored Design Direction, and autonomously provisions customized web applications from a Gold Template.

## Language

### AI Software Factory & Orchestration

**Lead Briefing**:
A structured intake specification capturing a prospective business's contact name, company name, email, phone number, and optional website URL (`mensagem_lead`), ingested directly into CRM Contacts and Deals without polluting the WhatsApp chat inbox with synthetic conversations.
_Avoid_: Payload, prompt text, raw lead, inbox message lead

**Lead Dossier**:
An enriched business intelligence profile synthesized from Google Places API and public web sources, detailing verified business name, official website, menu link (if available), service modalities (delivery, dine-in, takeout), operating hours, star rating, verified establishment phone number, positive review highlights, a curated 6-photo gallery with menu/atmosphere classification, and niche classification.
_Avoid_: Scraping dump, raw places json, info sheet

**Modalidade de Atendimento (Service Modalities)**:
The operational fulfillment channels supported by an establishment, extracted from Google Places API attributes (delivery, dine-in, takeout) and classified into structured flags (permite_entrega, permite_consumo_local, permite_retirada) and high-level status (modalidade) to steer both CRM lead insights and niche frontend/backend architecture generation.
_Avoid_: Delivery status, shipping options, service flags

**Classificação de Mídia do Dossiê (Dossier Media Classification)**:
The multimodal categorization applied to the verified photo gallery (restricted to 6 photos), tagging each visual asset as either cardapio (menu, price lists, dish catalogs) or foto_normal (atmosphere, facade, team, food), enabling focused UI presentation in the CRM and targeted asset injection in web generation.
_Avoid_: Photo tagging, raw image list, album tags

**Telefone do Estabelecimento Verificado (Verified Business Phone)**:
The official commercial landline or mobile contact number retrieved from Google Places API (dossie.telefone_estabelecimento), explicitly preserved alongside and decoupled from the lead's personal WhatsApp contact phone (contacts.phone) to prevent communication routing corruption while highlighting data discrepancies in the CRM.
_Avoid_: Phone override, company phone, fallback number

**Informações Relevantes & Comodidades (Establishment Amenities & Relevant Info)**:
Structured physical and operational traits retrieved from Google Places API (editorialSummary, accessibilityOptions, paymentOptions, parkingOptions, outdoorSeating, allowsDogs), providing a rich operational digest of accessibility, accepted tender, parking availability, and ambient features without manual research.
_Avoid_: Generic tags, metadata dump, feature list

**Resultados da Web (Web Results)**:
The consolidated list of verified external digital presence links (Instagram, Facebook, iFood, TripAdvisor, LinkedIn, etc.) synthesized by crawling the client's official site, ingesting briefing links, and querying public digital presence channels, providing direct access to the brand's broader footprint across the internet.
_Avoid_: External backlinks, random search links, unverified URLs

**Raspagem Profunda com Scrapling (Deep Web Scraping)**:
The extraction pipeline in the AI Software Factory utilizing Scrapling to harvest categorized menu catalogs, pricing, institutional narratives, and raw Markdown from client-designated URLs, featuring an adaptive fail-safe mechanism that seamlessly falls back to lightweight HTTP parsing if headless browser binaries are unavailable in constrained production environments.
_Avoid_: Brute-force scraping, rigid crawler, unhandled headless dependency

**Dados Raspados do Estabelecimento (Scraped Business Intelligence)**:
The structured payload stored in `contacts.additional_data.scraped_data`, comprising categorized menu items/services, institutional copy, and clean Markdown feedable directly into the Master Prompt Studio and autonomous PWA generators.
_Avoid_: Raw html dump, unparsed text, temp cache

**Avaliações 5 Estrelas e Desafios de Atendimento (5-Star Reviews & Operational Pain Points)**:
The strict chronological review partitioning in the Lead Dossier separating up to 4 latest 5-star customer reviews (for genuine social proof and brand advocacy) and up to 2 latest constructive/negative reviews (rating <= 3, or fallback to 'Sem nenhuma avaliação negativa.') to equip the operator with actionable hooks for sales pitches and friction resolution.
_Avoid_: Random reviews, all praise, unfiltered testimonials

**Decision Gate**:
The mandatory human evaluation checkpoint in the CRM and Factory Portal where an operator inspects the Lead Dossier to choose between initiating PWA generation, generating an AI sales pitch, or disqualifying the lead.
_Avoid_: Auto-builder, silent pipeline, background generator

**Composable Backend Blueprint**:
A standardized, hardened application skeleton featuring pre-configured security guardrails (Helmet, strict CORS, rate limiting, and Zod input validation) into which tailored database schemas and business endpoints are synthesized on-demand per client niche.
_Avoid_: Generic fixed backend, template clone, rigid monolithic API

**Niche Profile**:
The canonical brand archetype for a market segment (such as Odontologia, Barbearia, Estética, Gastronomia, or Pet), pairing hex color tokens, theme polarity, typography, and curated showcase media.
_Avoid_: Niche media, fallback colors, theme preset

**Design Direction**:
The client-specific visual specification derived from a Lead Briefing and Niche Profile before code generation, defining a 4–6 color token palette, display and body typography roles, layout concept, and a single focal design gesture free of generic AI template clichés.
_Avoid_: Design prompt, style config, theme json, UI prompt

**Project Queue Item**:
A tracked build lifecycle record in `fila_projetos` linking a CRM Contact to its Lead Briefing, tenant database credentials, status (`aguardando_decisao`, `pendente`, `aguardando_agente`, `processando`, `concluido`, `erro`), and generated configuration.
_Avoid_: Job, task, build ticket

**Chat Agent Worker Loop**:
The execution pattern where the pair-programming Antigravity assistant directly acts as the active generation worker, receiving queued tenant briefs, authoring component code, and reporting progress live in the chat.
_Avoid_: Background daemon, phantom runner, blackbox CLI

**Modular Tenant Stack**:
The modern two-tier tenant architecture (`workspace/<slug>/`) provisioning an isolated Composable Backend Blueprint (`backend/` with audited security guardrails and on-demand synthesized niche routes) alongside a clean, dynamic Frontend PWA (`frontend/` mounting niche-tailored modules selected from the Lead Dossier).
_Avoid_: Monolithic template, hardcoded scheduling app, generic cloned site

**Niche-Driven Module Selection**:
The deterministic assignment of frontend pages and backend endpoints (such as Menu/Orders for gastronomy, Bookings/Services for appointments, Catalog/Cart for retail) driven by the Lead Dossier's verified Google Maps niche classification.
_Avoid_: Forced appointment booking, one-size-fits-all pages

**Lead Profile Page**:
The dedicated full-screen view (/contacts/[id]) in WACRM that replaces the narrow sidebar drawer, presenting an immersive dashboard of the business: high-resolution photo gallery, review sentiment analysis, operating hours, geolocation, and AI-powered intelligence.
_Avoid_: Contact drawer, sidebar sheet, modal popover

**Multimodal Business Diagnosis**:
An AI-driven analysis endpoint powered by Gemini Multimodal Vision and semantic NLP that evaluates both Google Maps imagery (interior ambiance, facade, products/services) and text data to synthesize exactly what the company is, its brand personality, target audience, and unique value proposition.
_Avoid_: Basic text summary, raw niche label, static category

**Master Prompt Generator**:
The automated engine that transforms a Lead Dossier and Multimodal Business Diagnosis into a hyper-personalized, production-grade master prompt containing real client assets, design guidelines, tone, and component specifications, engineered for the operator to copy and execute in any frontier AI.
_Avoid_: Auto-builder script, hardcoded template, generic system prompt

**Operator-Driven Generation**:
The bespoke workflow where the human operator reviews the Lead Profile Page and Multimodal Diagnosis, copies the synthesized Master Prompt, and directs an external frontier AI to generate a zero-template website tailored from scratch.
_Avoid_: Blind auto-generation, one-click blackbox builder

**Gold Template (Legacy)**:
The superseded monolithic application template in `gold_templates/template_base_app` that hardcoded appointment scheduling pages across all client domains.
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
A business lead or customer record in WACRM (`contacts`), enriched with contact name (`name`), company name (`company`), email, phone, website (`website`), custom fields, tags, RAG brand reports, and sales pipeline deals.
_Avoid_: Client, user, account

**Contact Name**:
The individual stakeholder or interlocutor representing the lead (`contacts.name`).
_Avoid_: User name, project name

**Company Name**:
The commercial enterprise, establishment, or brand represented by the lead (`contacts.company`), used as the deal title and project namespace.
_Avoid_: Contact name, lead owner

**Website Field**:
The first-class optional public web URL of the business (`contacts.website`), persisted directly in the CRM contact record.
_Avoid_: Link json, metadata url
