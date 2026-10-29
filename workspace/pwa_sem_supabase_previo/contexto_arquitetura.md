Contexto de Arquitetura & Design Direction: PWA Sem Supabase Previo
1. Design Direction (Gerada com a Skill /frontend-design)
Tema: dark
Cor Primária (--primary-color): #6366F1
Cor Secundária (--secondary-color): #1A1A1A
Cor de Fundo (--bg-color): #0F172A
Cor de Superfície (--surface-color): #1E293B
Cor de Texto Principal (--text-color): #F8FAFC
Cor de Texto Secundário (--muted-color): #94A3B8
Fonte de Títulos (--font-display): Space Grotesk
Fonte de Corpo (--font-sans): Plus Jakarta Sans
Conceito de Layout: Grade assimétrica objetiva com foco em serviços sob hora marcada, endereço e canais diretos de atendimento.
Elemento Focal Único: Painel tipográfico de abertura com chamada direta para reserva de horário online.
Revisão Anti-Clichê: Removidos jargões genéricos de IA e decorações supérfluas; foco em clareza de escopo, horários e reserva.
Tom de Escrita UX: Objetivo, claro e orientado à ação do cliente.

2. Stack Tecnológica Base
Frontend: React + Vite
Estilização: TailwindCSS (usando variáveis semânticas de index.css)
Backend/Auth/DB: Supabase

3. Regras Estritas de Manutenção (Para Agentes de IA)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.
DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.
DIRETRIZ 3: NENHUMA dependência npm externa deve ser instalada sem aprovação explícita do usuário.
DIRETRIZ 4: Mantenha as rotas protegidas sob o fluxo de autenticação atual e NÃO duplique o Header/Footer do MainLayout.jsx dentro das páginas filhas.
DIRETRIZ 5: Toda alteração de interface DEVE seguir os princípios da skill `.agents/skills/frontend-design/SKILL.md` (evitar SaaS-card kit genérico, evitar ALL-CAPS eyebrows repetitivos, usar voz ativa e preservar os tokens semânticos da Design Direction acima).
