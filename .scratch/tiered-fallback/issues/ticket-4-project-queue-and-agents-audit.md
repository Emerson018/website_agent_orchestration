# Ticket 4: Project Queue Audit and Critical Failure Transition

## Description
Update `ai_software_factory/agents.py` and `ai_software_factory/project_queue.py`:
1. Include `provedor_execucao` and provider notes in `execution_logs` and `resultado_json`.
2. Transition project to `falha_critica` if catastrophic failure occurs and QA attempts are exhausted.

## TDD Scope
1. Write failing tests asserting status `falha_critica` and provider recording.
2. Implement updates.
3. Pass tests.
