# 03: Dynamic Frontend PWA Module Adapter

**What to build:**
Refactor the frontend PWA template to remove legacy hardcoded burger shop data ("Marcianos") and compulsory `/agendar` booking constraints. Implement dynamic modular routing and UI components in the React PWA that activate conditionally based on the modules registered in `ai_config.json`: gastronomy clients render an interactive Digital Menu (`/cardapio`) and WhatsApp order checkout (`/pedidos`); service clients render Service Specialties and Booking (`/servicos`, `/agendar`); retail clients render Product Catalog and Cart (`/produtos`, `/carrinho`). Frontend components consume the tenant's own backend REST API (`/api/<nicho>`).

**Blocked by:** 02: Niche-Driven Backend Route and Schema Synthesis

**Status:** closed

- [x] Legacy hardcoded "Marcianos" burger shop data and forced appointment booking pages are removed from the frontend template.
- [x] React Router dynamic routing configures views based on the client niche and `ai_config.json` module list.
- [x] Modular components for Gastronomy (Menu/Orders), Services (Portfolio/Booking), and Retail (Catalog/Cart) are integrated.
- [x] Frontend API services communicate directly with the tenant backend REST endpoints (`/api/<nicho>`).
- [x] Vitest component and service tests verify correct rendering and mock API interaction for each supported niche.
