# Ticket 1: Implement Antigravity CLI Runner Module (`ai_software_factory/antigravity_runner.py`)

## Description
Create deep module `ai_software_factory/antigravity_runner.py` exposing:
- `is_antigravity_cli_available() -> bool`
- `invoke_antigravity_cli(prompt: str, system_prompt: Optional[str] = None, timeout: float = 60.0, runner_fn: Optional[Callable[..., str]] = None) -> Optional[str]`

## TDD Scope
1. Write failing test `tests/test_antigravity_runner.py` verifying detection and headless invocation with mocked runner.
2. Implement `ai_software_factory/antigravity_runner.py`.
3. Pass tests.
