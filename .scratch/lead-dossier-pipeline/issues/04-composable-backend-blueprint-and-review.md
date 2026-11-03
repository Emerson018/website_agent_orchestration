# 04: Composable Backend Blueprint and Security Code Review

**What to build:**
A modular, composable backend architecture that replaces the monolithic generic appointment backend template. The blueprint freezes audited security guardrails (Helmet, CORS whitelist, rate limiting, Zod schema validation, database connection pooling, and global error handling) into a reusable foundation. When the operator triggers PWA generation from the Decision Gate, the factory AI synthesizes domain models (Prisma/SQL schemas) and business route handlers specifically tailored to the niche and pains documented in the Lead Dossier. The guardrail layer is audited via `/code-review` before deployment.

**Blocked by:** 03: Decision Gate UI and Dossier Panel in WACRM and Portal Fabrica

**Status:** closed

- [x] Composable backend skeleton created with frozen security and infrastructure files (`security.js`, `db.js`, `errorHandler.js`, `validate.js`).
- [x] Factory generator prompts updated to synthesize only business domain schemas and route handlers tailored to the Lead Dossier.
- [x] Automated security tests verify rate limiting, input sanitization, and invalid schema rejection.
- [x] Formal `/code-review` executed and recorded across the security and infrastructure guardrail layers.
- [x] End-to-end test verifies generation of a niche-tailored backend from an approved Lead Dossier.
