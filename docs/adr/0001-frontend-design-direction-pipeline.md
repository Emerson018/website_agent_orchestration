---
status: accepted
---

# Two-Pass Frontend Design Direction Pipeline and Semantic Gold Template Shell

Previously, frontend code generation enforced a fixed 5-block SaaS-card layout in `agents.py` and hardcoded dark obsidian colors (`#0E0D0C`) in the Gold Template's `MainLayout.jsx` and `BookingPage.jsx`, causing generated client sites to share generic AI visual tells and breaking theme polarity on light-themed niches. We decided to replace the fixed block template with a two-pass **Design Direction** pipeline powered by `.agents/skills/frontend-design/SKILL.md` (complemented by `stop_slop.md` and `web-design-guidelines`) across all three frontend AI touchpoints (RAG Branding, Factory Graph, and Dev Squad), paired with a unified semantic CSS token shell in the Gold Template.

## Consequences

- **Pass 1 (Design Direction)** is materialized by the RAG pipeline (`ui-designer.md` / `ai-engineer.md`) and `requirements_analyst_node` into `ClientConfig` (`ai_config.json`), capturing a 6-color semantic palette (`primary`, `secondary`, `bg`, `surface`, `text`, `muted`), display and body Google Fonts, layout concept, single focal element, and anti-cliché self-critique.
- **Pass 2 (Code Generation)** in `code_injector_node` dynamically loads the Google Fonts into `index.html`, injects the semantic CSS variables into `index.css`, and generates `LandingPage.jsx` without duplicating the global `MainLayout.jsx` header/footer or falling back to hardcoded dark-mode SaaS cards.
- **Gold Template Shell (`MainLayout.jsx` and `BookingPage.jsx`)** consumes the semantic CSS variables so both `/` and `/agendar` automatically adapt to any client's light or dark **Design Direction**.
