Contexto de Arquitetura & BrandDesignSpec: Espaço Mesclado Café
0. Motor de IA Utilizado
Motor / Modelo: Gerador Multi-Arquétipo + Prompt Gemini (gemini-3.8-flash)
Arquétipo Estrutural de Layout: Editorial de Balcão & Cardápio de Fornada

1. Design Direction & Essência da Marca (Gerada com a Skill /frontend-design)
Essência da Marca: O ponto de encontro entre a extração técnica do café especial e a pausa descomplicada ao redor da mesa.
Tema: light
Cor Primária (--primary-color): #382215
Cor Secundária (--secondary-color): #4E6E58
Cor de Fundo (--bg-color): #FAF8F3
Cor de Superfície (--surface-color): #F0ECE1
Cor de Texto Principal (--text-color): #1E1916
Cor de Texto Secundário (--muted-color): #73675E
Fonte de Títulos (--font-display): Fraunces
Fonte de Corpo (--font-sans): Plus Jakarta Sans
Conceito de Layout: Alinhamento à esquerda com composição assimétrica inspirada em cardápios de cafeterias independentes e revistas de cultura gastronômica. Em vez de blocos centralizados, a página divide a tela entre uma coluna de narrativa sensorial fixa e um quadro vivo de fornadas, métodos de extração e disponibilidade de mesas.
Elemento Focal Único: Quadro Interativo 'Fornada & Extração do Dia' no Hero: um painel tipográfico e tátil que cruza a nota sensorial do grão em moinho hoje com o seletor rápido de reserva de mesa ou bancada de trabalho.
Revisão Anti-Clichê: Rejeitamos o clichê #F4F1EA com terracota #D97757 (tell clássico de IA) usando um fundo de leite vaporizado #FAF8F3 combinado ao marrom espresso #382215 e verde botânico #4E6E58. Eliminamos o kit SaaS de 3 cards idênticos em favor de uma lista de cardápio com preços e notas de torra alinhados por tabulação editorial. Removemos eyebrows em ALL-CAPS, separadores com ponto médio e setas '→' nos botões, adotando verbos diretos na primeira ação ('Reservar mesa', 'Ver cardápio do dia').
Tom de Escrita UX: Conversacional, sensorial e direto. Fala de temperatura, moagem na hora, manteiga dourada e lugares confortáveis para sentar, sem adjetivos vazios como 'experiência única' ou 'incomparável'.

2. Stack Tecnológica Base (Backend Padronizado + Frontend Único)
Frontend: React + Vite + Framer Motion
Estilização: TailwindCSS (usando variáveis semânticas de index.css)
Backend/Auth/DB: Supabase (tabelas padronizadas agendamentos_base e configuracao_agenda)

3. Regras Estritas de Manutenção (Para Agentes de IA)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.
DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.
DIRETRIZ 3: NENHUMA dependência npm externa deve ser instalada sem aprovação explícita do usuário.
DIRETRIZ 4: Mantenha as rotas protegidas (/agendar e /admin) sob o fluxo atual e NÃO duplique o Header/Footer do MainLayout.jsx dentro das páginas filhas.
DIRETRIZ 5: Toda alteração de interface DEVE seguir os princípios da skill `.agents/skills/frontend-design/SKILL.md` e preservar o arquétipo `Editorial de Balcão & Cardápio de Fornada` e os tokens semânticos acima.
