---
status: superseded by 0005
---

# Tiered Fallback Cascade with Antigravity CLI and Gemini 3.8 Flash

Previously, `llm_gateway.py` operated with a single-tier model choice: either Local LM Studio or Cloud API. If the local LM Studio instance stalled, was offline, or exceeded its default 120s timeout, the build pipeline either hung or prematurely fell back to hardcoded template strings, never leveraging external agent runtimes or cloud models. We decided to establish a **4-Tier Fallback Cascade** orchestrated directly inside the deep `llm_gateway`.

## Context and Decision

When a lead is submitted to generate a website, the build must remain resilient without stalling or failing silently:
1. **Tier 1 (Local LM Studio)**: Fast, zero-cost inference using `google/gemma-3-4b` with an aggressive 15-second fail-fast timeout and socket healthcheck.
2. **Tier 2 (Antigravity CLI Headless)**: If Tier 1 fails, the system executes the local `agy` CLI (`agy -p`) non-interactively with a 60-second timeout, executing both Pass 1 (Design Direction) and Pass 2 (JSX Code Generation) with Antigravity's autonomous agent capabilities.
3. **Tier 3 (Cloud API - Gemini 3.8 Flash)**: If Tier 2 fails or is unavailable, the gateway falls back directly to the Google Gemini API using `gemini-3.8-flash` (with secondary backup to OpenAI `gpt-4o-mini`).
4. **Tier 4 (Critical Failure & Queue Parking)**: If all automated tiers fail, the project in `fila_projetos` transitions to status `falha_critica`, preserving the lead payload and error stack for manual resolution in the Antigravity IDE.

## Consequences

- Full observability: `resultado_json` in Supabase and `execution_logs` in the agent state record the exact execution provider (`local_lm_studio`, `antigravity_cli`, `cloud_gemini_3.8_flash`, or `cloud_openai`), enabling CRM UI indicators.
- Non-blocking execution: Builds never block on unresponsive local daemons for longer than 15 seconds.
- Antigravity integration: The Antigravity CLI becomes a first-class execution engine in the software factory's headless pipeline.
