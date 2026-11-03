# 03: Multimodal Business Diagnosis API with Gemini Vision & Fail-Fast Error Handling

**What to build:**
Implement the backend endpoint `POST /api/leads/:id/diagnose` that gathers the lead's Google Maps photo gallery and text feedback, transmitting them to Gemini 2.5 Flash Vision. The multimodal AI evaluates visual cues (facade style, interior lighting, product styling, patrons) and reviews to diagnose: company essence (`resumo_empresa`), aesthetic style/vibe (`estilo_visual_vibe`), core target audience (`publico_alvo`), and authentic selling points (`diferenciais_unicos`). Enforce strict fail-fast error handling: if `GEMINI_API_KEY` is missing or the external API fails, return a clear, transparent error message rather than generating fictitious fallback data. Persist the diagnosis in `contacts.additional_data` and `local_projetos.json`.

**Blocked by:** 02: High-Resolution Maps Gallery & Rich Business Intelligence Panel

**Status:** closed

- [x] Endpoint `POST /api/leads/:id/diagnose` accepts lead ID and extracts Google Maps photos and reviews.
- [x] Multimodal vision prompt instructs Gemini 2.5 Flash to analyze business facade, decor, products, and customer sentiment into structured JSON.
- [x] Fail-fast behavior: returns HTTP 412 / 502 with an explicit error message if the API key is not configured or Google AI fails (no hallucinated fallback).
- [x] Successful diagnosis is persisted to Supabase `contacts.additional_data.diagnostico_ia` and `local_projetos.json`.
- [x] Integration tests verify fail-fast behavior and structured JSON response with valid input.
