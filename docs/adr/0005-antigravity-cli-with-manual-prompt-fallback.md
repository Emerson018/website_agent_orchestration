---
status: accepted
---

# 2-Tier Architecture: Antigravity CLI and Manual Prompt Generation

Previously (ADR 0003), `llm_gateway.py` operated with a 4-tier cascade: Local LM Studio (Gemma), Antigravity CLI, Cloud API (Gemini), and deterministic fallback. Local LM Studio execution was constrained by hardware token generation speeds (~30 tokens/sec), frequent socket disconnects on long JSX component generation, and multi-round retry loops. We decided to supersede ADR 0003 and replace the cascade with a lean **2-Tier Architecture** focused on the Antigravity engine.

## Context and Decision

1. **Tier 1 (Antigravity CLI Headless)**:
   - Primary execution engine for both Pass 1 (Requirements & Design Direction) and Pass 2 (Frontend JSX Code Generation).
   - Discovered automatically via system PATH (`antigravity.cmd`, `antigravity`, `agy`) or explicit environment variable `ANTIGRAVITY_CLI_PATH`.
   - Executes headlessly using `--print --dangerously-skip-permissions --output-format text`, avoiding local model memory consumption and token generation timeouts.

2. **Tier 2 (Structured Manual Prompt Generation)**:
   - If Tier 1 fails, is interrupted, or the CLI binary is unavailable, the factory triggers Tier 2.
   - Tier 2 generates a complete, copy-pasteable Markdown instruction prompt containing the full System Guidelines, Niche Profile, Semantic Palette, Google Fonts typography, Layout Concept, and Lead Briefing.
   - The manual prompt is persisted directly to the tenant workspace as `manual_prompt_LandingPage.md` and registered in the state/metadata (`manual_prompt_generated`), allowing the developer or agent to immediately execute the task within the Antigravity IDE without crashing the pipeline.
   - Local LM Studio dependencies, network polling on port 1234, and intermediary Cloud tiers are removed from the site generation flow.

## Consequences

- Zero local GPU/VRAM contention: LM Studio does not need to run in the background.
- High developer sovereignty: Whenever automated generation does not meet expectations, the operator receives the exact, rich prompt ready to paste and direct in the Antigravity IDE.
- High reliability: The two-tier boundary is clear, observable, and fully covered by unit tests.
