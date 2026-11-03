# Contexto Arquitetural do Tenant: Clínica

Este projeto utiliza a **Modular Tenant Stack**:
1. `backend/`: API Express rodando na porta 5150 com guardrails congelados (`security.js`, `validate.js`, `errorHandler.js`).
2. `frontend/`: PWA React + Vite rodando na porta 5273 configurado com os módulos: servicos, agendar.
3. `database/`: Migrações SQL adaptadas ao nicho: servicos.
