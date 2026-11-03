# 02: Google Places Intelligence Engine and Lead Dossier Extraction

**What to build:**
An intelligence extraction pipeline powered by the official Google Places API (`GOOGLE_MAPS_API_KEY`) that resolves incoming Google Maps URLs or business names into an enriched Lead Dossier. The pipeline extracts verified business attributes (formatted name, address, category, business hours, star rating, total review count, recent customer reviews, and high-resolution photo URLs) and runs an LLM sentiment classification node to extract top customer praises, operational friction/complaints, and a synthesized sales pitch ready for outbound outreach.

**Blocked by:** 01: Lead Intake De-escalation and Decision Gate Status

**Status:** closed

- [x] Google Places API integration resolves both direct Google Maps URLs and free-text company queries (Text Search / Place Details).
- [x] Backend exposes endpoint `POST /api/leads/:id/enrich-dossier` that triggers the extraction and stores the result in `contacts.custom_fields` / `fila_projetos.dossie`.
- [x] LLM sentiment analysis extracts verified customer praises, customer pain points (1-3 star review themes), and a suggested WhatsApp cold-pitch hook.
- [x] Fallback handling alerts the operator when `GOOGLE_MAPS_API_KEY` is missing or invalid without crashing the server.
- [x] Automated integration tests verify successful parsing and structured schema generation of a mock place payload.
