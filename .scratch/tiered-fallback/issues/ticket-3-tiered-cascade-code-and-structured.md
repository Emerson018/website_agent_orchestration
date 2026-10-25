# Ticket 3: Multi-Tiered Cascade for Code Generation and Structured Output

## Description
Refactor `generate_code` and `synthesize_structured` in `ai_software_factory/llm_gateway.py` to:
1. Try Tier 1: Local LM Studio (15s).
2. If Tier 1 fails, try Tier 2: Antigravity CLI (60s).
3. If Tier 2 fails, try Tier 3: Gemini 3.8 Flash, then OpenAI.
4. If Tier 3 fails, try deterministic fallback or return None.
5. Track `get_last_execution_provider()`.

## TDD Scope
1. Write failing tests asserting failover progression across tiers for both code and structured output.
2. Implement cascade in `llm_gateway.py`.
3. Pass tests.
