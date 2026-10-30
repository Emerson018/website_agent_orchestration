---
status: accepted
---

# Decouple Web Lead Intake from WhatsApp CRM Inbox Conversations

Previously, when a prospective client submitted the intake form on Fábrica de Sites (`portal_fabrica`), the backend (`server.js`) automatically created a conversation in `conversations` and inserted a synthetic incoming customer message in `messages` with the raw briefing payload. This polluted the WhatsApp CRM Inbox with artificial web form submissions, introducing informational clutter in an interface intended strictly for genuine WhatsApp customer dialogues.

We decided to decouple web lead capture from chat conversations. Incoming web leads are ingested strictly as CRM Contacts, Sales Pipeline Deals, and Project Queue Items.

## Decision

1. **Intake Persistence**:
   - Web leads populate `contacts` directly with first-class fields: `name` (Contact Name / interlocutor), `company` (Company Name / brand), `email`, `phone` (WhatsApp), and `website` (official URL).
   - An automatic tag `Fábrica de Sites` is associated in `contact_tags` to provide immediate provenance filtering across all acquisition channels (WhatsApp, Instagram, Web, etc.).
   - A Deal is created in the primary sales pipeline (`deals`) under the title `Projeto - <Company Name>`.
   - A queue record is created in `fila_projetos` with status `pendente` containing the canonical 5-field JSON payload.

2. **Inbox Isolation**:
   - The backend no longer inserts rows into `conversations` or `messages` during web lead intake.
   - Conversations in the Inbox are reserved exclusively for active, real-time message exchanges initiated via WhatsApp webhooks or outbound template broadcasts.

## Consequences

- **Clean Inbox**: Sales agents and operators experience a zero-clutter Inbox reserved exclusively for live conversational interactions.
- **Dedicated Triage**: Web leads are triaged where they belong: inside the Contacts registry (`/contacts`) and the visual Sales Pipeline Kanban (`/pipelines`).
- **Omnichannel Extensibility**: Leads arriving from WhatsApp, Instagram, or Web forms retain distinct origin tags (`Fábrica de Sites`, etc.), enabling clear attribution and tailored sales cadences.
