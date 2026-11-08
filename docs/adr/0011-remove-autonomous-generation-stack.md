---
status: accepted
---

# Remove the autonomous site-generation stack

ADR 0010 moved site building to Operator-Driven Generation, but the old autonomous pipeline stayed wired in: the LangGraph orchestrator and its agents, the LLM Gateway, the workspace provisioners, the Gold Template, the project queue (`fila_projetos`) and the brand/RAG analysis. We decided to delete it. The app's pipeline now ends at the Master Prompt: Lead Briefing → Lead Dossier → Deep Web Scraping → Multimodal Business Diagnosis → Master Prompt, which the operator copies into an external frontier AI.

Supersedes ADR 0002, 0003, 0005, 0006, 0008 and 0009.

## Consequences

- The Python orchestrator survives only as a scraping microservice (`POST /api/scrape/deep`), because Scrapling exists only in Python.
- Lead intake (`POST /api/leads`, formerly `POST /api/projetos`) creates only the CRM Contact and Deal. Nothing writes to `fila_projetos` or `local_projetos.json` any more. The Supabase table is left in place, with no migration yet.
- The Master Prompt lives only in `contacts.additional_data`.
- Delivered client sites under `workspace/<slug>` stay as Tenant Workspaces. The Gold Template and test-only workspaces are deleted.
