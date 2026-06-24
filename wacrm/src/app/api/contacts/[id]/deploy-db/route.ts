import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createClientExternal } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

// Sanitiza o nome do contato para corresponder à pasta do projeto
function sanitizeProjectFolderName(projectName: string): string {
  let cleanName = projectName.replace(/\s+/g, '_');
  cleanName = cleanName.replace(/[^a-zA-Z0-9_]/g, '');
  return cleanName;
}

// Localiza a pasta do projeto no workspace local de forma robusta
async function findProjectFolder(contactName: string): Promise<string | null> {
  const workspaceRoot = path.resolve(process.cwd(), '../workspace');
  
  // 1. Tenta o nome sanitizado
  const sanitized = sanitizeProjectFolderName(contactName);
  let targetPath = path.join(workspaceRoot, sanitized);
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      return targetPath;
    }
  } catch {}

  // 2. Tenta o nome exato do contato
  targetPath = path.join(workspaceRoot, contactName);
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      return targetPath;
    }
  } catch {}

  // 3. Fallback: Lista o diretório e tenta encontrar uma correspondência case-insensitive
  try {
    const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
    const targetLower = sanitized.toLowerCase();
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nameLower = entry.name.toLowerCase();
        if (nameLower === targetLower || nameLower === contactName.toLowerCase().replace(/\s+/g, '_')) {
          return path.join(workspaceRoot, entry.name);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao varrer pasta workspace:', err);
  }

  return null;
}

// Lê os dois arquivos SQL da pasta local do projeto
async function readSqlFiles(projectFolder: string) {
  const dbDir = path.join(projectFolder, 'database');
  const baseSchemaPath = path.join(dbDir, 'base_schema.sql');
  const aiSchemaPath = path.join(dbDir, 'ai_extension_schema.sql');

  let baseSchema: string | null = null;
  let aiSchema: string | null = null;

  try {
    baseSchema = await fs.readFile(baseSchemaPath, 'utf-8');
  } catch (err) {
    console.warn(`Aviso: base_schema.sql não encontrado em ${baseSchemaPath}`);
  }

  try {
    aiSchema = await fs.readFile(aiSchemaPath, 'utf-8');
  } catch (err) {
    console.warn(`Aviso: ai_extension_schema.sql não encontrado em ${aiSchemaPath}`);
  }

  return { baseSchema, aiSchema };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Autentica o usuário do CRM
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Busca dados do lead
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const projectFolder = await findProjectFolder(contact.name);
    if (!projectFolder) {
      return NextResponse.json({
        base_schema: null,
        ai_extension_schema: null,
        project_folder: sanitizeProjectFolderName(contact.name),
        error: 'Pasta do projeto correspondente não foi encontrada no workspace local.'
      });
    }

    const { baseSchema, aiSchema } = await readSqlFiles(projectFolder);
    const folderName = path.basename(projectFolder);

    return NextResponse.json({
      base_schema: baseSchema,
      ai_extension_schema: aiSchema,
      project_folder: folderName,
    });
  } catch (err: any) {
    console.error('Erro na rota GET deploy-db:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Autentica o usuário do CRM
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado', success: false }, { status: 401 });
    }

    // Busca credenciais do inquilino do lead
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('name, supabase_url, supabase_service_role_key')
      .eq('id', id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Lead não encontrado', success: false }, { status: 404 });
    }

    const { supabase_url, supabase_service_role_key } = contact;

    if (!supabase_url || !supabase_service_role_key) {
      return NextResponse.json({
        success: false,
        error: 'As credenciais do Supabase (URL e Service Role Key) do cliente estão ausentes no cadastro.'
      }, { status: 400 });
    }

    // Localiza a pasta e lê os SQLs locais
    const projectFolder = await findProjectFolder(contact.name);
    if (!projectFolder) {
      return NextResponse.json({
        success: false,
        error: 'Pasta do projeto correspondente não foi encontrada no workspace local para ler os arquivos SQL.'
      }, { status: 400 });
    }

    const { baseSchema, aiSchema } = await readSqlFiles(projectFolder);

    if (!baseSchema && !aiSchema) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum dos esquemas SQL (base_schema.sql ou ai_extension_schema.sql) foi encontrado na pasta local.'
      }, { status: 400 });
    }

    // Instancia o cliente Supabase conectado no inquilino do cliente
    const clientSupabase = createClientExternal(supabase_url, supabase_service_role_key, {
      auth: { persistSession: false }
    });

    // 1. Executa base_schema.sql se ele existir
    if (baseSchema) {
      const { error: baseError } = await clientSupabase.rpc('exec_sql', { sql: baseSchema });
      
      if (baseError) {
        console.error('Erro ao implantar base_schema:', baseError);
        const isFunctionMissing = 
          baseError.code === 'PGRST104' || 
          baseError.message?.toLowerCase().includes('does not exist') ||
          baseError.message?.toLowerCase().includes('não existe');

        if (isFunctionMissing) {
          return NextResponse.json({
            success: false,
            error: 'A função auxiliar `exec_sql` não foi encontrada no banco de dados do cliente.',
            isFunctionMissing: true,
            setup_sql: `CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;`
          }, { status: 400 });
        }

        return NextResponse.json({
          success: false,
          error: `Erro no deploy do base_schema: ${baseError.message}`
        }, { status: 400 });
      }
    }

    // 2. Executa ai_extension_schema.sql se ele existir
    if (aiSchema) {
      const { error: aiError } = await clientSupabase.rpc('exec_sql', { sql: aiSchema });
      
      if (aiError) {
        console.error('Erro ao implantar ai_extension_schema:', aiError);
        const isFunctionMissing = 
          aiError.code === 'PGRST104' || 
          aiError.message?.toLowerCase().includes('does not exist') ||
          aiError.message?.toLowerCase().includes('não existe');

        if (isFunctionMissing) {
          return NextResponse.json({
            success: false,
            error: 'A função auxiliar `exec_sql` não foi encontrada no banco de dados do cliente ao executar o esquema de IA.',
            isFunctionMissing: true,
            setup_sql: `CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;`
          }, { status: 400 });
        }

        return NextResponse.json({
          success: false,
          error: `Erro no deploy do ai_extension_schema: ${aiError.message}`
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Deploy dos esquemas SQL executado com sucesso no banco do cliente.'
    });
  } catch (err: any) {
    console.error('Erro na rota POST deploy-db:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro interno ao executar o deploy do banco de dados.'
    }, { status: 500 });
  }
}
