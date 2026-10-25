# AI Software Factory & Lead Orchestrator

Autonomous lead qualification, RAG enrichment, and client website generation engine bridging WhatsApp CRM and tenant codebases.

## Language

**Lead Briefing**:
The initial client data and customization requirements captured via CRM or landing page.
_Avoid_: User prompt, raw input, message text

**Project Queue Item**:
A persistent record in `fila_projetos` representing a requested client build and its lifecycle state.
_Avoid_: Job, task, build request

**Tiered Fallback Cascade**:
A multi-level execution sequence (Local LM Studio -> Antigravity CLI -> Cloud API -> Manual Parking) ensuring site generation resilience.
_Avoid_: Retry loop, backup plan

**Tenant Workspace**:
An isolated directory under `workspace/` containing a provisioned client application generated from a gold template.
_Avoid_: Client folder, output directory

**Gold Template**:
A curated, production-ready frontend template cloned and customized for a client.
_Avoid_: Starter kit, boilerplate, theme

**Motion Choreography**:
Orchestrated, physics-based UI transitions and scroll-triggered reveals tailored to client brand identity.
_Avoid_: Flashy animations, page effects
