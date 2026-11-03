# 01: Lead Profile Full-Screen Route & Contact Navigation

**What to build:**
Create a dedicated Next.js App Router route at `wacrm/src/app/(dashboard)/contacts/[id]/page.tsx` that replaces the narrow slide-over sheet with a full-screen, responsive lead profile view. Update the contacts list table (`wacrm/src/app/(dashboard)/contacts/page.tsx`) so clicking on any contact row or company name navigates directly to `/contacts/[id]`. The page must render an executive header with the verified company name, back button to `/contacts`, contact status, and core details.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Route `wacrm/src/app/(dashboard)/contacts/[id]/page.tsx` exists and loads contact data by ID from Supabase / local repository.
- [x] Clicking a contact in `/contacts` navigates directly to `/contacts/[id]`.
- [x] Executive header renders company name, phone, email, tags, and a return button to `/contacts`.
- [x] Vitest / component tests verify route parameters and navigation flow.
