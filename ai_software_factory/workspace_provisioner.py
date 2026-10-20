import os
import re
import shutil
import subprocess
from typing import Any, Callable, Dict, Optional

EXEC_SQL_SETUP_DDL = """CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;"""


def normalize_supabase_url(raw_url: str) -> str:
    """Normaliza uma URL ou project ref do Supabase para https://<ref>.supabase.co."""
    clean = (raw_url or "").strip()
    if not clean:
        return ""
    if not clean.startswith("http://") and not clean.startswith("https://"):
        clean = f"https://{clean}.supabase.co"
    return clean.rstrip("/")


def sanitize_workspace_slug(app_name: str) -> str:
    """Converte o nome comercial do projeto em um slug seguro em snake_case minúsculo."""
    clean = re.sub(r"\s+", "_", (app_name or "").strip())
    clean = re.sub(r"[^a-zA-Z0-9_]", "", clean)
    clean = clean.lower().strip()
    return clean or "app_customizado"


def resolve_workspace_path(app_name_or_path: str, workspace_root: str = "workspace") -> str:
    """
    Resolve o caminho do Tenant Workspace. Se já existir uma pasta com correspondência
    case-insensitive em workspace_root, retorna essa pasta; caso contrário, retorna
    o caminho canônico em snake_case minúsculo.
    """
    slug = sanitize_workspace_slug(app_name_or_path)
    canonical_path = os.path.join(workspace_root, slug)

    if os.path.isdir(canonical_path):
        return canonical_path

    if os.path.isdir(workspace_root):
        raw_clean = re.sub(r"\s+", "_", (app_name_or_path or "").strip()).lower()
        try:
            for entry in os.listdir(workspace_root):
                entry_path = os.path.join(workspace_root, entry)
                if os.path.isdir(entry_path):
                    entry_lower = entry.lower()
                    if entry_lower == slug or entry_lower == raw_clean:
                        return entry_path
        except OSError:
            pass

    return canonical_path


def clone_gold_template(
    app_name: str,
    template_path: str = "gold_templates/template_base_app",
    workspace_root: str = "workspace",
) -> str:
    """Clona o Gold Template para o Tenant Workspace correspondente."""
    slug = sanitize_workspace_slug(app_name)
    target_project = os.path.join(workspace_root, slug)
    shutil.copytree(template_path, target_project, dirs_exist_ok=True)
    return target_project.replace("\\", "/")


def validate_and_sanitize_sql(sql_code: str) -> str:
    """Valida e bloqueia instruções DDL destrutivas antes da execução no banco."""
    if not sql_code or not sql_code.strip():
        return ""

    blacklisted = [
        "DROP DATABASE",
        "DROP TABLE",
        "TRUNCATE",
        "ALTER ROLE",
        "GRANT ALL",
        "REVOKE",
    ]

    sql_upper = sql_code.upper()
    for item in blacklisted:
        if item in sql_upper:
            print(
                f"[Segurança SQL] ATENÇÃO: Instrução DDL proibida '{item}' detectada. Descartando SQL dinâmico."
            )
            return f"-- SQL descartado por violar regras de segurança DDL ({item})\n"

    return sql_code


def is_effective_sql(sql_code: str) -> bool:
    """Verifica se há instruções SQL executáveis além de comentários."""
    if not sql_code:
        return False
    lines = [
        line.strip()
        for line in sql_code.splitlines()
        if line.strip() and not line.strip().startswith("--")
    ]
    return len(lines) > 0


def read_workspace_sql_schemas(project_path: str) -> Dict[str, Optional[str]]:
    """Lê os arquivos base_schema.sql e ai_extension_schema.sql do Tenant Workspace."""
    db_dir = os.path.join(project_path, "database")
    base_candidates = [
        os.path.join(db_dir, "base_schema.sql"),
        os.path.join(project_path, "supabase_schema", "base_schema.sql"),
        os.path.join(project_path, "supabase_schema", "001_initial_schema.sql"),
    ]
    ai_path = os.path.join(db_dir, "ai_extension_schema.sql")

    base_schema: Optional[str] = None
    for candidate in base_candidates:
        if os.path.isfile(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                base_schema = f.read()
            break

    ai_schema: Optional[str] = None
    if os.path.isfile(ai_path):
        with open(ai_path, "r", encoding="utf-8") as f:
            ai_schema = f.read()

    return {"base_schema": base_schema, "ai_extension_schema": ai_schema}


def _default_supabase_rpc_adapter(url: str, key: str, payload: Dict[str, Any]) -> None:
    from supabase import create_client

    client = create_client(url, key)
    try:
        client.rpc("exec_sql", payload).execute()
    except Exception as first_err:
        # Compatibilidade reversa: caso o banco do cliente tenha exec_sql(query text)
        if "sql" in payload and ("PGRST202" in str(first_err) or "query" in str(first_err)):
            client.rpc("exec_sql", {"query": payload["sql"]}).execute()
        else:
            raise first_err


def deploy_tenant_database(
    project_path: str,
    supabase_url: str,
    supabase_key: str,
    rpc_adapter: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """
    Valida, sanitiza e implanta os esquemas SQL do Tenant Workspace no Supabase Single-Tenant
    usando o contrato canônico RPC exec_sql(sql text).
    """
    norm_url = normalize_supabase_url(supabase_url)
    clean_key = (supabase_key or "").strip()

    if not norm_url or not clean_key:
        return {
            "success": False,
            "error": "Credenciais do Supabase (URL e chave) ausentes.",
            "isFunctionMissing": False,
            "setup_sql": None,
        }

    schemas = read_workspace_sql_schemas(project_path)
    base_raw = schemas.get("base_schema")
    ai_raw = schemas.get("ai_extension_schema")

    if not base_raw and not ai_raw:
        return {
            "success": False,
            "error": "Nenhum esquema SQL encontrado na pasta do projeto.",
            "isFunctionMissing": False,
            "setup_sql": None,
        }

    adapter = rpc_adapter or _default_supabase_rpc_adapter

    for label, raw_sql in [("base_schema", base_raw), ("ai_extension_schema", ai_raw)]:
        if not raw_sql:
            continue
        sanitized = validate_and_sanitize_sql(raw_sql)
        if not is_effective_sql(sanitized):
            continue
        try:
            adapter(norm_url, clean_key, {"sql": sanitized})
        except Exception as err:
            err_msg = str(err)
            is_missing = (
                "PGRST104" in err_msg
                or "PGRST202" in err_msg
                or "does not exist" in err_msg.lower()
                or "não existe" in err_msg.lower()
            )
            return {
                "success": False,
                "error": f"Erro no deploy de {label}: {err_msg}",
                "isFunctionMissing": is_missing,
                "setup_sql": EXEC_SQL_SETUP_DDL if is_missing else None,
            }

    return {
        "success": True,
        "error": None,
        "isFunctionMissing": False,
        "setup_sql": None,
    }


def run_frontend_build(
    target_project_path: str,
    command_runner: Optional[Callable[[str, str], subprocess.CompletedProcess]] = None,
) -> Dict[str, Any]:
    """
    Executa a validação de build do frontend (npm install condicional + npm run build)
    através de uma seam injetável para testes rápidos.
    """
    frontend_dir = os.path.join(target_project_path, "frontend")

    def _default_runner(cmd: str, cwd: str) -> subprocess.CompletedProcess:
        return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)

    runner = command_runner or _default_runner

    node_modules_path = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_path):
        runner("npm install", frontend_dir)

    build_proc = runner("npm run build", frontend_dir)
    if build_proc.returncode == 0:
        return {"build_success": True, "report": {}}

    error_msg = build_proc.stderr or build_proc.stdout or "Erro desconhecido durante o build."
    return {"build_success": False, "report": {"error": error_msg.strip()}}
