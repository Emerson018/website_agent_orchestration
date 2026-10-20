import { NextResponse } from 'next/server';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { createClient as createClientExternal } from '@supabase/supabase-js';
import {
  sanitizeWorkspaceSlug,
  resolveWorkspaceFolder,
  readWorkspaceSqlFiles,
  deployTenantSchemas,
} from '@/lib/workspace-provisioner';
import { normalizeTenantSupabaseUrl } from '@/lib/project-queue';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const projectFolder = await resolveWorkspaceFolder(contact.name);
    if (!projectFolder) {
      return NextResponse.json({
        base_schema: null,
        ai_extension_schema: null,
        project_folder: sanitizeWorkspaceSlug(contact.name),
        error: 'Pasta do projeto correspondente não foi encontrada no workspace local.',
      });
    }

    const { baseSchema, aiSchema } = await readWorkspaceSqlFiles(projectFolder);
    const folderName = path.basename(projectFolder);

    return NextResponse.json({
      base_schema: baseSchema,
      ai_extension_schema: aiSchema,
      project_folder: folderName,
    });
  } catch (err: any) {
    console.error('Erro na rota GET deploy-db:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado', success: false }, { status: 401 });
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('name, supabase_url, supabase_service_role_key')
      .eq('id', id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Lead não encontrado', success: false }, { status: 404 });
    }

    const normalizedUrl = normalizeTenantSupabaseUrl(contact.supabase_url);
    const serviceRoleKey = (contact.supabase_service_role_key || '').trim();

    if (!normalizedUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'As credenciais do Supabase (URL e Service Role Key) do cliente estão ausentes no cadastro.',
        },
        { status: 400 }
      );
    }

    const projectFolder = await resolveWorkspaceFolder(contact.name);
    if (!projectFolder) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Pasta do projeto correspondente não foi encontrada no workspace local para ler os arquivos SQL.',
        },
        { status: 400 }
      );
    }

    const schemas = await readWorkspaceSqlFiles(projectFolder);

    const clientSupabase = createClientExternal(normalizedUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const result = await deployTenantSchemas(schemas, async (fnName, args) => {
      const { error } = await clientSupabase.rpc(fnName, args);
      return { error };
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Erro na rota POST deploy-db:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro interno ao executar o deploy do banco de dados.',
      },
      { status: 500 }
    );
  }
}
