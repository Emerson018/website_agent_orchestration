-- Migration 025: Adiciona campo nativo de website na tabela contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website TEXT;

COMMENT ON COLUMN contacts.website IS 'URL do site ou página web oficial do contato/empresa';
