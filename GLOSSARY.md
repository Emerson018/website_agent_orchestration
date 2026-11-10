# AI Software Factory & WhatsApp CRM

An integrated ecosystem that captures and qualifies business leads in a WhatsApp CRM, enriches them into a Lead Dossier and Multimodal Business Diagnosis, and ends by synthesizing a Master Prompt that the operator runs in an external frontier AI to build the client's website.

## Language

### AI Software Factory & Orchestration

**Lead Briefing**:
A structured intake specification capturing a prospective business's contact name, company name, email, phone number, and optional website URL (`mensagem_lead`), ingested directly into CRM Contacts and Deals without polluting the WhatsApp chat inbox with synthetic conversations.
_Avoid_: Payload, prompt text, raw lead, inbox message lead, project

**Lead Dossier**:
An enriched business intelligence profile synthesized from Google Places API and public web sources, detailing verified business name, official website, menu link (if available), service modalities (delivery, dine-in, takeout), operating hours, star rating, verified establishment phone number, positive review highlights, a curated 6-photo gallery with menu/atmosphere classification, and niche classification.
_Avoid_: Scraping dump, raw places json, info sheet

**Modalidade de Atendimento (Service Modalities)**:
The operational fulfillment channels supported by an establishment, extracted from Google Places API attributes (delivery, dine-in, takeout) and classified into structured flags (permite_entrega, permite_consumo_local, permite_retirada) and high-level status (modalidade) to steer both CRM lead insights and the feature directives in the Master Prompt.
_Avoid_: Delivery status, shipping options, service flags

**Classificação de Mídia do Dossiê (Dossier Media Classification)**:
The multimodal categorization applied to the verified photo gallery (restricted to 6 photos), tagging each visual asset as either cardapio (menu, price lists, dish catalogs) or foto_normal (atmosphere, facade, team, food), enabling focused UI presentation in the CRM and targeted asset references in the Master Prompt.
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
The structured payload stored in `contacts.additional_data.scraped_data`, comprising categorized menu items/services, institutional copy, and clean Markdown feedable directly into the Master Prompt Studio.
_Avoid_: Raw html dump, unparsed text, temp cache

**Catálogo Extraído (Extracted Catalog)**:
The organized Markdown that Gemini produces from files the operator uploads for a lead (photos or PDFs of menus, price lists, brochures), listing only what the files contain: general business information plus categories of items, each with description, price, variations, add-ons and notes. It is generic to any kind of business, not only restaurants, and when a file holds no catalog content only the general information is kept. It is editable by the operator and stored in `contacts.additional_data.catalogo_extraido`.
_Avoid_: Menu scrape, OCR dump, cardápio (when the business is not a restaurant), Dados Raspados

**Avaliações 5 Estrelas e Desafios de Atendimento (5-Star Reviews & Operational Pain Points)**:
The strict chronological review partitioning in the Lead Dossier separating up to 4 latest 5-star customer reviews (for genuine social proof and brand advocacy) and up to 2 latest constructive/negative reviews (rating <= 3, or fallback to 'Sem nenhuma avaliação negativa.') to equip the operator with actionable hooks for sales pitches and friction resolution.
_Avoid_: Random reviews, all praise, unfiltered testimonials

**Decision Gate**:
The mandatory human evaluation checkpoint on the Lead Profile Page where an operator inspects the Lead Dossier and decides either to generate the Master Prompt or to disqualify the lead (see Desqualificação).
_Avoid_: Auto-builder, silent pipeline, background generator

**Desqualificação (Lead Disqualification)**:
The operator's recorded decision, at the Decision Gate, that a lead will not get a site: its Deal is marked lost in the sales pipeline and the reason and date are kept on the contact. It can be undone, which reopens the Deal.
_Avoid_: Archive, delete, hide

**Lead Profile Page**:
The dedicated full-screen view (/contacts/[id]) in WACRM where the operator works a lead through the Etapas do Lead in order, from Lead Briefing to Master Prompt, with a Progress Panel on top and the Site Data Checklist and Master Prompt always in view.
_Avoid_: Contact drawer, sidebar sheet, modal popover

**Etapas do Lead (Lead Steps)**:
The ordered stages a lead goes through on the Lead Profile Page: Lead Briefing, Lead Dossier, Deep Web Scraping, Catálogo Extraído, Multimodal Business Diagnosis and Master Prompt. Each step has a status.
_Avoid_: Tabs, sections, phases, pipeline stages (those are the sales pipeline's)

**Painel de Progresso (Progress Panel)**:
The summary at the top of the Lead Profile Page showing every Etapa do Lead with its status and a Próximo Passo button.
_Avoid_: Stepper, wizard, timeline

**Próximo Passo (Next Step)**:
The action of the first required Etapa do Lead that still needs work, offered as a single button on the Progress Panel.
_Avoid_: Suggested action, CTA

**Checklist de Dados do Site (Site Data Checklist)**:
The list of data a client site needs (business name, phone/WhatsApp, address, Google Maps link, hours, official website, photos, 5-star reviews, catalog items, payment methods), each marked present or missing with the source it came from.
_Avoid_: Completeness score, data quality report

**Multimodal Business Diagnosis**:
An AI-driven analysis endpoint powered by Gemini Multimodal Vision and semantic NLP that evaluates both Google Maps imagery (interior ambiance, facade, products/services) and text data to synthesize exactly what the company is, its brand personality, target audience, and unique value proposition.
_Avoid_: Basic text summary, raw niche label, static category, brand analysis, RAG report

**Master Prompt Generator**:
The automated engine that transforms a Lead Dossier and Multimodal Business Diagnosis into a hyper-personalized, production-grade master prompt containing real client assets, design guidelines, tone, and component specifications, engineered for the operator to copy and execute in any frontier AI. It is the final step of the pipeline: nothing is built inside the app.
_Avoid_: Auto-builder script, hardcoded template, generic system prompt

**Operator-Driven Generation**:
The bespoke workflow where the human operator reviews the Lead Profile Page and Multimodal Diagnosis, copies the synthesized Master Prompt, and directs an external frontier AI to generate a zero-template website tailored from scratch.
_Avoid_: Blind auto-generation, one-click blackbox builder, project queue

**Tenant Workspace**:
The directory under `workspace/<slug>` holding a delivered client website, built outside the app from that client's Master Prompt.
_Avoid_: Client folder, target folder, output dir, provisioned stack

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
A business lead or customer record in WACRM (`contacts`), enriched with contact name (`name`), company name (`company`), email, phone, website (`website`), custom fields, tags, Lead Dossier, Multimodal Business Diagnosis, Master Prompt, and sales pipeline deals.
_Avoid_: Client, user, account

**Contact Name**:
The individual stakeholder or interlocutor representing the lead (`contacts.name`).
_Avoid_: User name, project name

**Company Name**:
The commercial enterprise, establishment, or brand represented by the lead (`contacts.company`), used as the deal title and Tenant Workspace slug.
_Avoid_: Contact name, lead owner

**Website Field**:
The first-class optional public web URL of the business (`contacts.website`), persisted directly in the CRM contact record.
_Avoid_: Link json, metadata url
