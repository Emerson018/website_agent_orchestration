---
status: accepted
---

# Multimodal Lead Dossier and Operator-Driven Master Prompt Engine

Previously, the platform attempted to build client websites autonomously using background generation pipelines and template scaffolding triggered by a single automated button. In practice, this approach produced generic websites and removed creative control from the operator. Furthermore, when prospective client intelligence was fetched from Google Maps, it was confined to a narrow slide-over sidebar drawer (`Sheet`), which severely constrained the operator's ability to examine high-resolution photographs, operating hours, customer review sentiments, and true brand atmosphere.

We decided to pivot from autonomous template-based generation to an **Operator-Driven Bespoke Generation Workflow** centered around a dedicated **Lead Profile Page** and a **Multimodal Business Diagnosis & Master Prompt Engine**.

## Decision

1. **Dedicated Lead Profile Page (`/contacts/[id]`)**:
   - Clicking a contact in `/contacts` navigates directly to a full-screen, visually immersive lead dashboard (`/contacts/[id]`), retiring the narrow sidebar sheet.
   - The page organizes business intelligence into two distinct panels:
     - **Business Intelligence Dossier**: Google Maps high-resolution photo gallery, review sentiment breakdown, operating hours schedule, address with interactive map link, and verified business metadata.
     - **Master Prompt Studio**: AI diagnosis card, live editable prompt area, and quick-action buttons.

2. **Multimodal Business Diagnosis API (`POST /api/leads/:id/diagnose`)**:
   - A dedicated REST endpoint submits the business's real Google Maps photographs (facade, interior decor, dish/product presentation) alongside customer reviews and operating data to the Gemini Multimodal Vision API.
   - The AI evaluates visual and textual cues to synthesize:
     - What the company actually is and what it is about (`resumo_empresa`);
     - Visual vibe and aesthetic personality (`estilo_visual_vibe`);
     - Core target audience and perceived pricing tier (`publico_alvo`);
     - Authentic selling points praised by real patrons (`diferenciais_unicos`).
   - If the API key is not configured or an error occurs, the endpoint fails fast with a clear, actionable error message rather than generating fabricated fallback content.

3. **Master Prompt Generator for Zero-Template Generation**:
   - The system synthesizes an engineered, 4-block **Master Prompt**:
     1. *Real Brand Identity & Vibe* (extracted from photos and reviews);
     2. *Verified Client Assets & Data* (address, phone, hours, real customer testimonials);
     3. *Design & UX Directives* (color palette matched to the venue, typography, layout archetype);
     4. *Technical Directives* (instruction to write clean, bespoke React + Tailwind code from scratch without pre-made template assumptions).
   - The operator can edit the generated prompt directly in a live textarea on `/contacts/[id]` and copy it with a single click (`[📋 Copiar Prompt Mestre para a IA]`) to execute in frontier models (Claude, ChatGPT, v0, Gemini).

4. **Hybrid Persistence**:
   - The diagnosis report and synthesized prompt are persisted to both Supabase (`contacts.additional_data` and `fila_projetos.resultado_json`) and the resilient local store (`local_projetos.json`).

## Consequences

- **100% Bespoke, Zero-Template Sites**: Websites generated via the Master Prompt emerge from scratch around the verified visual ambiance and real reputation of the business, eliminating template clichés.
- **Operator Empowerment**: The operator inspects the visual evidence first, reviews the AI's diagnosis, adjusts instructions as needed, and uses their preferred frontier LLM.
- **Fail-Closed Diagnostics**: Any API misconfiguration or outage is reported transparently to the user, ensuring no phantom or hallucinated business profiles are presented as verified facts.
