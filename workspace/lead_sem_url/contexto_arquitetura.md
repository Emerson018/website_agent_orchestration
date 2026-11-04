# Contexto Arquitetural do Tenant: Lead sem url

Este projeto utiliza a **Modular Tenant Stack**:
1. `backend/`: API Express rodando na porta 5051 com guardrails congelados (`security.js`, `validate.js`, `errorHandler.js`).
2. `frontend/`: PWA React + Vite rodando na porta 5174 configurado com os módulos: servicos, agendar.
3. `database/`: Migrações SQL adaptadas ao nicho: servicos.
