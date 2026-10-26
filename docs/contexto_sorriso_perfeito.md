# Contexto de Arquitetura - Sorriso Perfeito

Este documento define a arquitetura, estrutura e diretrizes de design do projeto **Sorriso Perfeito**, servindo como guia para todos os agentes do time de desenvolvimento.

---

## 1. Visão Geral do Projeto
O **Sorriso Perfeito** é uma aplicação web para agendamento de consultas odontológicas.
A stack principal é:
* **Frontend**: React (SPA) com Vite, React Router DOM para navegação, TailwindCSS e Estilos Inline para estilização.
* **Backend/Banco**: Supabase (PostgreSQL) para persistência de dados, autenticação de usuários e controle de agendamentos.

---

## 2. Estrutura de Pastas (Frontend)
A estrutura do frontend está localizada em `workspace/Sorriso_perfeito/frontend` e segue este padrão:
* `src/App.jsx`: Ponto de entrada que gerencia as rotas e carrega variáveis globais de estilo.
* `src/main.jsx`: Inicializa a aplicação React.
* `src/layouts/`: Componentes de estrutura de layout.
  * `MainLayout.jsx`: Layout principal da aplicação. **É aqui que a Sidebar (barra de navegação lateral) elegante, colapsável e responsiva deve ser implementada.**
* `src/pages/`: Páginas renderizadas dentro do layout principal.
  * `LandingPage.jsx`: Página de apresentação.
  * `BookingPage.jsx`: Página de agendamento de consultas.
  * `LoginPage.jsx`: Página de login de clientes/administradores.
  * `AdminDashboard.jsx`: Painel administrativo com controle de horários.
* `src/contexts/`: Provedores de estado (ex: `AuthContext`).
* `src/components/`: Componentes reutilizáveis (ex: `ProtectedRoute`).
* `ai_config.json`: Arquivo na raiz do frontend contendo as cores de branding (`primary_color`, `secondary_color`) e o nome do app.

---

## 3. Diretrizes de Design e Estilo (Design System)
* **Branding e Cores**: Usar prioritariamente as cores definidas no arquivo `ai_config.json` (importado no layout ou injetado via variáveis CSS `--primary-color` e `--secondary-color`).
* **Visual Premium**: Utilizar sombras de profundidade (`box-shadow`), transições suaves para interações de hover (`transition-all duration-300`), cantos arredondados (`border-radius`) e layouts flexíveis (`flexbox`/`grid`).
* **Sidebar colapsável**: A barra lateral deve conter um botão de alternância elegante para colapsar/expandir a barra. Quando colapsada, deve mostrar apenas ícones elegantes ou recolher completamente. Deve ser responsiva para não quebrar em telas de celular.
