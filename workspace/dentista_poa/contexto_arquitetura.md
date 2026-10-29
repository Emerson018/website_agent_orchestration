Contexto de Arquitetura & Design Direction: Dentista poa
1. Design Direction (Gerada com a Skill /frontend-design)
Tema: light
Cor Primária (--primary-color): #0EA5E9
Cor Secundária (--secondary-color): #0284C7
Cor de Fundo (--bg-color): #F8FAFC
Cor de Superfície (--surface-color): #FFFFFF
Cor de Texto Principal (--text-color): #0F172A
Cor de Texto Secundário (--muted-color): #475569
Fonte de Títulos (--font-display): Plus Jakarta Sans
Fonte de Corpo (--font-sans): Source Sans 3
Conceito de Layout: Composição split-hero editorial com respiro amplo, cartões de procedimentos com bordas suaves e foco em credibilidade médica.
Elemento Focal Único: Bloco de apresentação da equipe clínica com selo de registro profissional e tipografia humanista de alto contraste.
Revisão Anti-Clichê: Evitados degradês espalhafatosos e sombras pesadas de templates SaaS genéricos; paleta clara transmite higiene, assepsia e tranquilidade.
Tom de Escrita UX: Técnico, acolhedor e focado na saúde e bem-estar preventivo dos pacientes.

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
