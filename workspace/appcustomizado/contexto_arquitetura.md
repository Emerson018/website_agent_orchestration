Contexto de Arquitetura & BrandDesignSpec: AppCustomizado
0. Motor de IA Utilizado
Motor / Modelo: Gerador Multi-Arquétipo + Prompt Gemini (gemini-3.8-flash)
Arquétipo Estrutural de Layout: bento_modular

1. Design Direction & Essência da Marca (Gerada com a Skill /frontend-design)
Essência da Marca: AppCustomizado posiciona-se no segmento de Serviços Especializados combinando domínio técnico em Atendimento Individual, Avaliação e Diagnóstico e Agendamento Online Direto com uma atmosfera moderno, tecnológico, dinâmico e profissional.
Tema: dark
Cor Primária (--primary-color): #6366F1
Cor Secundária (--secondary-color): #1A1A1A
Cor de Fundo (--bg-color): #0F172A
Cor de Superfície (--surface-color): #1E293B
Cor de Texto Principal (--text-color): #F8FAFC
Cor de Texto Secundário (--muted-color): #94A3B8
Fonte de Títulos (--font-display): Space Grotesk
Fonte de Corpo (--font-sans): Plus Jakarta Sans
Conceito de Layout: Bento Grid Modular de Alta Precisão: Composição em mosaico técnico de células assimétricas (col-span-8 + col-span-4), combinando vitrine principal, células de métricas/horários ao vivo e grade modular de serviços.
Elemento Focal Único: Painel tipográfico de abertura com chamada direta para reserva de horário online.
Revisão Anti-Clichê: Removidos jargões genéricos de IA e decorações supérfluas; foco em clareza de escopo, horários e reserva.
Tom de Escrita UX: Objetivo, claro e orientado à ação do cliente.

2. Stack Tecnológica Base (Backend Padronizado + Frontend Único)
Frontend: React + Vite + Framer Motion
Estilização: TailwindCSS (usando variáveis semânticas de index.css)
Backend/Auth/DB: Supabase (tabelas padronizadas agendamentos_base e configuracao_agenda)

3. Regras Estritas de Manutenção (Para Agentes de IA)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.
DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.
DIRETRIZ 3: NENHUMA dependência npm externa deve ser instalada sem aprovação explícita do usuário.
DIRETRIZ 4: Mantenha as rotas protegidas (/agendar e /admin) sob o fluxo atual e NÃO duplique o Header/Footer do MainLayout.jsx dentro das páginas filhas.
DIRETRIZ 5: Toda alteração de interface DEVE seguir os princípios da skill `.agents/skills/frontend-design/SKILL.md` e preservar o arquétipo `bento_modular` e os tokens semânticos acima.
