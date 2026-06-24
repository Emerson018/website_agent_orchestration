-- Adiciona colunas para a arquitetura Single-Tenant na tabela fila_projetos
ALTER TABLE fila_projetos ADD COLUMN IF NOT EXISTS supabase_url VARCHAR;
ALTER TABLE fila_projetos ADD COLUMN IF NOT EXISTS supabase_anon_key VARCHAR;
ALTER TABLE fila_projetos ADD COLUMN IF NOT EXISTS supabase_service_role_key VARCHAR;

-- Adiciona colunas para a arquitetura Single-Tenant na tabela contacts (tabela de leads no CRM)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supabase_url VARCHAR;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supabase_anon_key VARCHAR;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supabase_service_role_key VARCHAR;
