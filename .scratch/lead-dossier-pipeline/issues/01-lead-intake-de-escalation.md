# 01: Lead Intake De-escalation and Decision Gate Status

**What to build:**
When a prospective lead submits their details via the Fábrica de Sites intake form or is added in the CRM, the system must no longer trigger autonomous code generation or build workers in the background. The intake persists the contact and project queue item in an awaiting-decision state (`aguardando_decisao`), displaying an explicit "Aguardando Decisão" status in the UI with code compilation buttons disabled until manual qualification.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] New lead submission to `POST /api/projetos` persists the item in `fila_projetos` with status `aguardando_decisao` without invoking `dispatchProjectToFactory`.
- [x] The lead is tagged `Fábrica de Sites` and associated with a Deal in WACRM without triggering synthetic conversations in the WhatsApp Inbox.
- [x] Portal Fábrica project list and WACRM project monitors display the "Aguardando Decisão" badge.
- [x] Automated regression tests verify that submitting a lead does not spawn autonomous build processes.
