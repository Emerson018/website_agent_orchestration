# Specification: Tiered Fallback Cascade with Antigravity CLI and Gemini 3.8 Flash

## Problem Statement

When a new lead arrives via the CRM or Landing Page to generate a client website, the system delegates prompt synthesis and JSX component creation to a locally hosted model (LM Studio running `google/gemma-3-4b`). However, if the local LM Studio instance is not running, crashes, hangs, or fails to respond, the current implementation either blocks for 120 seconds or skips directly to generic hardcoded strings without attempting external intelligence. This leads to stalled builds, degraded customer websites, and requires manual debugging by human developers without clear visibility into why the build stalled.

## Solution

Implement an automated, 4-tier fallback cascade in the LLM Gateway:
1. **Tier 1 (Local LM Studio)**: Fast, zero-cost generation with an aggressive 15-second timeout and port reachability check.
2. **Tier 2 (Antigravity CLI Headless)**: If Tier 1 fails, invoke the local `agy` CLI (`agy -p`) non-interactively with a 60-second timeout to execute Pass 1 (Design Direction) and Pass 2 (LandingPage JSX).
3. **Tier 3 (Cloud API - Gemini 3.8 Flash)**: If Tier 2 fails or is unavailable, invoke Google Gemini (`gemini-3.8-flash`) via API, with secondary backup to OpenAI (`gpt-4o-mini`).
4. **Tier 4 (Critical Failure & Queue Parking)**: If all automated tiers fail, transition the project in `fila_projetos` to status `falha_critica`, preserving the lead payload and error stack for manual resolution in the Antigravity IDE.
5. **Observability**: Record `provedor_execucao` in `resultado_json` and append transition messages in `execution_logs` for complete CRM visibility.

## User Stories

1. As a business owner submitting a lead briefing, I want my website generated even if the local AI daemon is offline, so that my onboarding is never delayed.
2. As a CRM administrator, I want to see which AI provider generated the website (Local LM Studio, Antigravity CLI, or Gemini 3.8 Flash) in `resultado_json`, so that I have operational visibility into system performance.
3. As a developer running the AI factory, I want LM Studio calls to fail fast after 15 seconds instead of waiting 120 seconds, so that unresponsive local processes do not stall the build queue.
4. As an automated queue consumer, I want the system to seamlessly switch to Antigravity CLI (`agy -p`) if LM Studio is offline, so that I leverage Antigravity's autonomous agent capabilities on the local machine.
5. As an automated queue consumer, I want the system to clean markdown code fences (e.g. ````jsx ... ````) from the Antigravity CLI output, so that the injected React component is syntactically valid.
6. As a queue consumer, I want the system to fall back to the Gemini 3.8 Flash cloud API if the Antigravity CLI is unavailable or times out, so that temporary terminal issues do not break the generation pipeline.
7. As a system operator, I want all fallback transitions logged into `execution_logs`, so that I can inspect the exact timeline of failover events during debugging.
8. As a customer support engineer, I want projects that exhaust all three automated tiers to be marked as `falha_critica` instead of hanging in `processando`, so that urgent alerts can be surfaced on the CRM dashboard.
9. As a developer using the Antigravity IDE, I want the original lead briefing to be preserved intact when a project enters `falha_critica`, so that I can manually inspect and trigger the build inside the IDE.
10. As an automated tester, I want to verify fallback behavior through pure public interfaces using test adapters without making real external HTTP or process calls during continuous integration.

## Implementation Decisions

### Modules & Interfaces

1. **`ai_software_factory/antigravity_runner.py`**:
   - Deep module encapsulating the execution of the Antigravity CLI (`agy.exe`).
   - Interface:
     - `is_antigravity_cli_available() -> bool`: Probes the environment to see if `agy` exists in path or standard AppData directories.
     - `invoke_antigravity_cli(prompt: str, system_prompt: Optional[str] = None, timeout: float = 60.0, runner_fn: Optional[Callable[..., str]] = None) -> Optional[str]`: Executes `agy -p --dangerously-skip-permissions` with sanitized inputs and timeout management.
   
2. **`ai_software_factory/llm_gateway.py`**:
   - Updates `invoke_local_lm_studio_http` with a configurable `timeout` parameter defaulted to 15.0s, plus a fast socket check to avoid hanging on closed ports.
   - Updates `describe_active_llm` and `get_llm` to support `gemini-3.8-flash` as primary cloud model alongside OpenAI.
   - Refactors `generate_code` to execute the 4-tier cascade:
     - Tier 1: Local LM Studio (15s timeout).
     - Tier 2: Antigravity CLI runner (60s timeout).
     - Tier 3: Cloud API (Gemini 3.8 Flash, followed by OpenAI).
     - Tier 4: Deterministic fallback or failure signal.
   - Refactors `synthesize_structured` to execute the same 4-tier cascade for Pydantic models / JSON dictionaries.
   - Exposes `get_last_execution_provider() -> str` so caller nodes can record which provider fulfilled the request.

3. **`ai_software_factory/agents.py`**:
   - In `requirements_analyst_node` and `code_injector_node`, retrieve the used execution provider and append it to `execution_logs` and return state.

4. **`ai_software_factory/project_queue.py`**:
   - Records `provedor_execucao` in `resultado_json`.
   - On catastrophic failure (all tiers exhausted and build fails), transitions project status to `falha_critica` instead of a generic failure, preserving `lead_raw_json` and `briefing_payload`.

## Testing Decisions

- **Good Tests**: Verify external behavior at public seams (`generate_code`, `synthesize_structured`, `invoke_antigravity_cli`, and `process_queue_item`) without testing internal subprocess commands directly. Test adapters and dependency injection allow simulating offline LM Studio, failing CLI, and cloud fallbacks cleanly.
- **Seams**:
  - `llm_gateway.py`: Tested with simulated local timeouts to assert graceful transition to Antigravity CLI and Gemini.
  - `antigravity_runner.py`: Tested for command formatting, timeout handling, and markdown stripping.
  - `project_queue.py`: Tested for status transitions (`falha_critica` vs `concluido`) and metadata retention.
- **Prior Art**: Follows patterns established in `tests/test_agents_and_rag_seams.py`, `tests/test_project_queue.py`, and `tests/test_niche_and_llm_module.py`.

## Out of Scope

- Modifying the frontend Next.js CRM UI pages (the database schema already stores `resultado_json` and status, which the CRM renders).
- Installing third-party CLI tools or changing the developer's global Windows environment.
- Rewriting gold template components.

## Further Notes

All changes maintain full backward compatibility with existing tests and scripts.
