Contexto de Arquitetura & BrandDesignSpec: Pizzaria Nonna
0. Motor de IA Utilizado
Motor / Modelo: Gerador Multi-Arquétipo + Prompt Gemini (gemini-3.8-flash)
Arquétipo Estrutural de Layout: Editorial Trattoria Menu & Interactive Order Sheet

1. Design Direction & Essência da Marca (Gerada com a Skill /frontend-design)
Essência da Marca: Caderno de receitas da cantina italiana traduzido em um cardápio digital tátil, direto e sem atalhos entre a fome e o pedido.
Tema: light
Cor Primária (--primary-color): #C8321E
Cor Secundária (--secondary-color): #2E4F2F
Cor de Fundo (--bg-color): #F9F4E8
Cor de Superfície (--surface-color): #EFE8D5
Cor de Texto Principal (--text-color): #241914
Cor de Texto Secundário (--muted-color): #735F52
Fonte de Títulos (--font-display): Fraunces
Fonte de Corpo (--font-sans): Plus Jakarta Sans
Conceito de Layout: Estrutura inspirada nos cardápios impressos em papel algodão das cantinas tradicionais do sul da Itália, alinhada à esquerda com hierarquia tipográfica de livro de receitas. Em vez de uma grade de cartões quadrados de e-commerce, os sabores são dispostos em linhas editoriais contínuas com linhas pontilhadas sutis ligando o nome da pizza ao preço, acompanhadas de retratos fotográficos recortados apenas para as criações principais e uma comanda lateral fixa (ou gaveta inferior tátil no celular) que funciona como o bloco de notas do garçom.
Elemento Focal Único: O Montador Visual de Pizza ('Bancada da Nonna'): no topo do cardápio, um disco de pizza ilustrado e fotográfico que permite ao cliente escolher entre pizza inteira ou meio a meio com um único toque, atualizando visualmente as duas metades do disco e o valor final antes de enviar para a comanda.
Revisão Anti-Clichê: Rejeitamos o layout de grade SaaS de 3 colunas com sombras cinzas idênticas e substituímos por uma lista editorial de cantina com espaçamento generoso e foco nos ingredientes. Eliminamos a paleta clichê de fundo creme #F4F1EA com terracota #D97757 em favor do contraste vivo entre tomate San Marzano (#C8321E), farinha de sêmola (#F9F4E8) e verde manjericão (#2E4F2F). Removemos todos os eyebrows em caixa alta espaçada, marcadores numéricos falsos (01/02/03) e setas '→' nos botões; cada ação usa verbos diretos de mesa ('Adicionar à comanda', 'Montar meio a meio', 'Enviar pedido pelo WhatsApp'). A animação se resume à transição física do disco meio a meio e ao deslize suave do bloco da comanda.
Tom de Escrita UX: Acolhedor, apetitoso e específico. Escreve os ingredientes exatos de cada receita sem adjetivos vazios como 'incrível' ou 'incomparável', colocando o leitor diante do cheiro de lenha e manjericão fresco.

2. Stack Tecnológica Base (Backend Padronizado + Frontend Único)
Frontend: React + Vite + Framer Motion
Estilização: TailwindCSS (usando variáveis semânticas de index.css)
Backend/Auth/DB: Supabase (tabelas padronizadas agendamentos_base e configuracao_agenda)

3. Regras Estritas de Manutenção (Para Agentes de IA)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.
DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.
DIRETRIZ 3: NENHUMA dependência npm externa deve ser instalada sem aprovação explícita do usuário.
DIRETRIZ 4: Mantenha as rotas protegidas (/agendar e /admin) sob o fluxo atual e NÃO duplique o Header/Footer do MainLayout.jsx dentro das páginas filhas.
DIRETRIZ 5: Toda alteração de interface DEVE seguir os princípios da skill `.agents/skills/frontend-design/SKILL.md` e preservar o arquétipo `Editorial Trattoria Menu & Interactive Order Sheet` e os tokens semânticos acima.
