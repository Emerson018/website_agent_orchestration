---
status: accepted
---

# 0006: Antigravity Chat Agent Worker Loop

## Context and Decision

Previously (ADR 0005), the software factory attempted to invoke the Antigravity engine headlessly via `subprocess.run(["antigravity", "--print", ...])`. However, `antigravity.cmd` in Windows is the Electron/VS Code IDE runtime launcher and does not support headless CLI piping or `--print`, resulting in silent fallbacks to base templates without visual feedback to the developer.

We decided to establish the **Antigravity Chat Agent Worker Loop**:
1. **Interactive Chat Worker**: Rather than treating Antigravity as an external headless subprocess, the active Antigravity Agent in this pair-programming session acts as the primary builder and developer.
2. **Decoupled Queue & Event Listener**:
   - When a project is submitted or processed via the Portal Fábrica (`workspace/portal_fabrica`), the backend updates the project status in `local_projetos.json` (and/or Supabase) to `aguardando_agente` and registers the job payload in `.agents/queue/pending_job.json`.
   - A background schedule / listener within the chat session monitors the queue and immediately wakes the chat agent with a high-priority notification containing the project ID and briefing.
3. **Native Code Authoring**:
   - The agent in this chat receives the prompt, creates the semantic tokens, and directly writes `LandingPage.jsx` into the tenant's workspace using IDE tools (`write_file`, `edit_file`).
   - The user observes the entire generation process, motion choreography, and component architecture live in the chat.
4. **Autonomous Completion & Preview**:
   - Once validated, the agent marks the project as `concluido` in `local_projetos.json`, updates metadata, and ensures the tenant preview server is accessible from the Portal.

## Consequences

- Full Observability: Every decision, styling choice, and component generated is displayed live in the Antigravity conversation.
- Zero Subprocess Fragility: Completely eliminates dependency on CLI piping, terminal timeouts, or local LLM server daemons.
- Instant Responsiveness: The Portal Fábrica UI remains unblocked and immediately indicates when the agent is actively developing the website.
