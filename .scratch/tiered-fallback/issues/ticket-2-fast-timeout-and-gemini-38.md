# Ticket 2: Fast 15s Local Timeout and Gemini 3.8 Flash Configuration

## Description
Update `ai_software_factory/llm_gateway.py` to:
1. Enforce 15s default timeout for `invoke_local_lm_studio_http` with quick socket pre-check.
2. Support `gemini-3.8-flash` as primary Google Gemini model.

## TDD Scope
1. Write failing tests in `tests/test_tiered_fallback_gateway.py` asserting timeout config and Gemini 3.8 model identifier.
2. Implement updates in `llm_gateway.py`.
3. Pass tests.
