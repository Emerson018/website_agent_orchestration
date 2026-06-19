Contexto de Arquitetura: Barbearia de Teste
1. Identidade Visual
Cor Primária: #f43f5e

Cor Secundária: #FFFFFF

2. Stack Tecnológica Base
Frontend: React + Vite

Estilização: TailwindCSS

Backend/Auth/DB: Supabase

3. Regras Estritas de Manutenção (Para IAs)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.

DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.

DIRETRIZ 3: NENHUMA dependência npm externa (ex: bibliotecas de mapas, carrosséis) deve ser instalada sem aprovação explícita do usuário.

DIRETRIZ 4: Mantenha as rotas protegidas sob o fluxo de autenticação atual.
