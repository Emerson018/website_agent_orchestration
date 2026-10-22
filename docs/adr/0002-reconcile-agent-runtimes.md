---
status: accepted
---

# Reconcile Dual Agent Runtimes and Establish Three-Pass Lifecycle

Previously, the codebase contained two disconnected agent runtimes: the deterministic factory build pipeline in `ai_software_factory/agents.py` (which processes the Supabase `fila_projetos` queue and runs frontend validation) and an orphaned conversational supervisor graph in `ai_software_factory/dev_team.py` that had access to file tools but had no place in the product workflow. We decided to establish an explicit **Three-Pass Lifecycle** across the ecosystem and formalize each runtime's role.

## Consequences

- **Pass 1 (Design Direction)** is executed by `requirements_analyst_node` / RAG pipeline, synthesizing the client's visual tokens and self-critique into `ClientConfig` using the deep `llm_gateway`.
- **Pass 2 (Factory Provisioning)** is executed by `infra_cloner_node` and `code_injector_node`, delegating all atomic filesystem and database provisioning to the `TenantWorkspace` deep module.
- **Pass 3 (Refinement Squad)** is formalized in `dev_team.py` through the public interface `refine_tenant_workspace(project_path, task)`. It functions as a post-delivery conversational agent for granular edits requested via WhatsApp CRM or developer scripts, operating safely on an already-provisioned `TenantWorkspace`.
- Both runtimes now share the deep `llm_gateway` and `workspace_provisioner` modules rather than maintaining parallel copies of LLM retry loops, tool mappings, and path resolvers.
