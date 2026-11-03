# 04: Master Prompt Studio & Live Zero-Template Generator

**What to build:**
Build the Master Prompt Studio on `/contacts/[id]`. The engine synthesizes a structured 4-block reverse-engineering prompt for the business (Real Brand Vibe, Verified Client Assets & Testimonials, Design & UX Directives, Clean React + Tailwind Zero-Template Directives). On the interface, render the prompt inside an interactive, live-editable textarea with syntax styling, a prominent `[📋 Copiar Prompt Mestre para a IA]` button with toast confirmation, and a `[Restaurar Original]` button. Provide an end-to-end integration test validating the workflow from contact selection to prompt generation and clipboard copy.

**Blocked by:** 03: Multimodal Business Diagnosis API with Gemini Vision & Fail-Fast Error Handling

**Status:** closed

- [x] Master Prompt Generator synthesizes a 4-block production-grade prompt tailored to the diagnosed business.
- [x] `/contacts/[id]` renders the Master Prompt Studio with live editable textarea.
- [x] `[📋 Copiar Prompt Mestre para a IA]` copies the current text to clipboard with feedback toast.
- [x] `[Restaurar Original]` reverts any user edits back to the AI-generated master prompt.
- [x] End-to-end tests verify prompt synthesis from lead dossier and interaction behaviors.
