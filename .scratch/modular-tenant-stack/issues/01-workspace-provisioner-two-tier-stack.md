# 01: Workspace Provisioner Refactor for Two-Tier Tenant Stack

**What to build:**
Refactor the tenant provisioning engine (`workspace_provisioner.py`) to replace the legacy monolithic Gold Template cloning with a modern two-tier Modular Tenant Stack provisioner. When a client application is provisioned for any workspace slug, the provisioner establishes an isolated workspace containing both `backend/` (cloned from `gold_templates/composable_backend_blueprint` with frozen security guardrails: Helmet, CORS, rate limiting, Zod validation, and database health adapter) and `frontend/` (clean React + Vite PWA). Automated tests verify that every provisioned workspace contains runnable backend and frontend foundations with passing health and security tests.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `provision_modular_tenant_stack(app_name, ...)` implemented in `workspace_provisioner.py`, deprecating monolithic `clone_gold_template`.
- [x] Provisioned tenant workspaces contain discrete `backend/` and `frontend/` directories.
- [x] The tenant `backend/` copies the hardened Composable Backend Blueprint with audited `security.js`, `validate.js`, `errorHandler.js`, `db.js`, and `server.js`.
- [x] Automated regression tests verify that a provisioned workspace initializes with valid configuration files, syntax-checked scripts, and passing security tests.
