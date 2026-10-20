import { promises as nodeFs } from 'fs';
import path from 'path';

export interface WorkspaceFsAdapter {
  stat(targetPath: string): Promise<{ isDirectory(): boolean }>;
  readdir(
    dirPath: string,
    options?: { withFileTypes: true }
  ): Promise<Array<{ name: string; isDirectory(): boolean }>>;
  readFile(filePath: string, encoding: BufferEncoding): Promise<string>;
}

const defaultFsAdapter: WorkspaceFsAdapter = {
  stat: (targetPath) => nodeFs.stat(targetPath),
  readdir: (dirPath) => nodeFs.readdir(dirPath, { withFileTypes: true }),
  readFile: (filePath, encoding) => nodeFs.readFile(filePath, encoding),
};

export const EXEC_SQL_SETUP_FUNCTION = `CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;`;

const SQL_HEADER_REGEX = /^\s*(--|\/\*|CREATE\b|ALTER\b|DROP\b|INSERT\b|UPDATE\b|DELETE\b|BEGIN\b|DO\b|SET\b|SELECT\b|WITH\b|GRANT\b|REVOKE\b|COMMENT\b)/im;

/**
 * Sanitizes a raw project or contact name into a filesystem-safe workspace slug.
 */
export function sanitizeWorkspaceSlug(rawName: string): string {
  const trimmed = (rawName || '').trim();
  if (!trimmed) {
    return 'AppCustomizado';
  }
  const withUnderscores = trimmed.replace(/\s+/g, '_');
  const cleaned = withUnderscores.replace(/[^a-zA-Z0-9_]/g, '');
  return cleaned || 'AppCustomizado';
}

/**
 * Validates and strips markdown code fences from SQL before execution.
 */
export function validateAndSanitizeSql(rawSql: string): string {
  const cleaned = (rawSql || '')
    .replace(/```sql/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) {
    throw new Error('Conteúdo SQL vazio.');
  }

  if (!SQL_HEADER_REGEX.test(cleaned)) {
    throw new Error('Conteúdo inválido: não contém instruções SQL reconhecidas.');
  }

  return cleaned;
}

/**
 * Resolves a tenant workspace folder by sanitized name, exact name, or case-insensitive scan.
 */
export async function resolveWorkspaceFolder(
  contactOrProjectName: string,
  workspaceRoot: string = path.resolve(process.cwd(), '../workspace'),
  fsAdapter: WorkspaceFsAdapter = defaultFsAdapter
): Promise<string | null> {
  const sanitized = sanitizeWorkspaceSlug(contactOrProjectName);

  // 1. Try sanitized slug
  const sanitizedPath = path.join(workspaceRoot, sanitized);
  try {
    const stat = await fsAdapter.stat(sanitizedPath);
    if (stat.isDirectory()) {
      return sanitizedPath;
    }
  } catch {}

  // 2. Try exact name
  const exactPath = path.join(workspaceRoot, contactOrProjectName);
  try {
    const stat = await fsAdapter.stat(exactPath);
    if (stat.isDirectory()) {
      return exactPath;
    }
  } catch {}

  // 3. Fallback: case-insensitive directory scan
  try {
    const entries = await fsAdapter.readdir(workspaceRoot, { withFileTypes: true });
    const targetLower = sanitized.toLowerCase();
    const rawUnderscoreLower = contactOrProjectName.toLowerCase().replace(/\s+/g, '_');

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nameLower = entry.name.toLowerCase();
        if (nameLower === targetLower || nameLower === rawUnderscoreLower) {
          return path.join(workspaceRoot, entry.name);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao varrer pasta workspace:', err);
  }

  return null;
}

/**
 * Reads `base_schema.sql` and `ai_extension_schema.sql` from a resolved workspace directory.
 */
export async function readWorkspaceSqlFiles(
  projectFolder: string,
  fsAdapter: WorkspaceFsAdapter = defaultFsAdapter
): Promise<{ baseSchema: string | null; aiSchema: string | null }> {
  const dbDir = path.join(projectFolder, 'database');
  const baseSchemaPath = path.join(dbDir, 'base_schema.sql');
  const aiSchemaPath = path.join(dbDir, 'ai_extension_schema.sql');

  let baseSchema: string | null = null;
  let aiSchema: string | null = null;

  try {
    const rawBase = await fsAdapter.readFile(baseSchemaPath, 'utf-8');
    baseSchema = validateAndSanitizeSql(rawBase);
  } catch {}

  try {
    const rawAi = await fsAdapter.readFile(aiSchemaPath, 'utf-8');
    aiSchema = validateAndSanitizeSql(rawAi);
  } catch {}

  return { baseSchema, aiSchema };
}

export type SqlRpcRunner = (
  fnName: string,
  args: Record<string, string>
) => Promise<{ error: { code?: string; message?: string } | null }>;

export interface DeployTenantSchemasResult {
  success: boolean;
  message?: string;
  error?: string;
  isFunctionMissing?: boolean;
  setup_sql?: string;
}

function isExecSqlMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === 'PGRST104' ||
    error.code === 'PGRST202' ||
    msg.includes('does not exist') ||
    msg.includes('não existe') ||
    msg.includes('could not find the function')
  );
}

async function executeSchemaViaRpc(
  schemaSql: string,
  rpcRunner: SqlRpcRunner
): Promise<{ error: { code?: string; message?: string } | null }> {
  const sanitized = validateAndSanitizeSql(schemaSql);
  const primary = await rpcRunner('exec_sql', { sql: sanitized });
  if (!primary.error) {
    return { error: null };
  }

  // Fallback for legacy `exec_sql(query text)` signature
  const msg = (primary.error.message || '').toLowerCase();
  if (msg.includes('query') && (msg.includes('parameter') || msg.includes('argument'))) {
    const fallback = await rpcRunner('exec_sql', { query: sanitized });
    if (!fallback.error) {
      return { error: null };
    }
  }

  return primary;
}

/**
 * Deploys base and AI extension schemas into a tenant Supabase instance via `exec_sql` RPC.
 */
export async function deployTenantSchemas(
  schemas: { baseSchema: string | null; aiSchema: string | null },
  rpcRunner: SqlRpcRunner
): Promise<DeployTenantSchemasResult> {
  if (!schemas.baseSchema && !schemas.aiSchema) {
    return {
      success: false,
      error:
        'Nenhum dos esquemas SQL (base_schema.sql ou ai_extension_schema.sql) foi encontrado na pasta local.',
    };
  }

  if (schemas.baseSchema) {
    const { error: baseError } = await executeSchemaViaRpc(schemas.baseSchema, rpcRunner);
    if (baseError) {
      if (isExecSqlMissing(baseError)) {
        return {
          success: false,
          error: 'A função auxiliar `exec_sql` não foi encontrada no banco de dados do cliente.',
          isFunctionMissing: true,
          setup_sql: EXEC_SQL_SETUP_FUNCTION,
        };
      }
      return {
        success: false,
        error: `Erro no deploy do base_schema: ${baseError.message}`,
      };
    }
  }

  if (schemas.aiSchema) {
    const { error: aiError } = await executeSchemaViaRpc(schemas.aiSchema, rpcRunner);
    if (aiError) {
      if (isExecSqlMissing(aiError)) {
        return {
          success: false,
          error:
            'A função auxiliar `exec_sql` não foi encontrada no banco de dados do cliente ao executar o esquema de IA.',
          isFunctionMissing: true,
          setup_sql: EXEC_SQL_SETUP_FUNCTION,
        };
      }
      return {
        success: false,
        error: `Erro no deploy do ai_extension_schema: ${aiError.message}`,
      };
    }
  }

  return {
    success: true,
    message: 'Deploy dos esquemas SQL executado com sucesso no banco do cliente.',
  };
}
