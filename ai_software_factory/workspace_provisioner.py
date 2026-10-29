import json
import os
import re
import shutil
import subprocess
from typing import Any, Callable, Dict, Optional
from urllib.parse import quote_plus

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


def has_missing_frontend_dependencies(frontend_dir: str) -> bool:
    """
    Verifica se a pasta node_modules está ausente ou se alguma dependência declarada
    em package.json (dependencies / devDependencies) ainda não está instalada em node_modules.
    """
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_path):
        return True

    package_json_path = os.path.join(frontend_dir, "package.json")
    if not os.path.isfile(package_json_path):
        return False

    try:
        with open(package_json_path, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
    except Exception:
        return False

    declared_packages = {}
    if isinstance(pkg_data.get("dependencies"), dict):
        declared_packages.update(pkg_data["dependencies"])
    if isinstance(pkg_data.get("devDependencies"), dict):
        declared_packages.update(pkg_data["devDependencies"])

    for pkg_name in declared_packages:
        pkg_dir = os.path.join(node_modules_path, *pkg_name.split("/"))
        if not os.path.exists(pkg_dir):
            return True

    return False


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

    if has_missing_frontend_dependencies(frontend_dir):
        runner("npm install", frontend_dir)

    build_proc = runner("npm run build", frontend_dir)
    if build_proc.returncode == 0:
        return {"build_success": True, "report": {}}

    error_msg = build_proc.stderr or build_proc.stdout or "Erro desconhecido durante o build."
    return {"build_success": False, "report": {"error": error_msg.strip()}}


def build_google_fonts_url(font_heading: str, font_body: str) -> str:
    """Monta a URL da API Google Fonts CSS2 para as famílias de título e corpo."""
    families = []
    for font in [font_heading, font_body]:
        clean = (font or "").strip()
        if clean and clean not in families:
            families.append(clean)
    if not families:
        families = ["Plus Jakarta Sans", "Inter"]

    query_parts = [f"family={quote_plus(fam)}:wght@400;500;600;700;800" for fam in families]
    return f"https://fonts.googleapis.com/css2?{'&'.join(query_parts)}&display=swap"


class TenantWorkspace:
    """
    Módulo Profundo de Workspace do Cliente.
    Encapsula o ciclo de vida e operações atômicas sobre a pasta isolada do projeto:
    clonagem de template, aplicação de Design Direction (tokens CSS, fontes, ai_config.json, .env),
    escrita de LandingPage, cópia e implantação de esquema SQL e geração do contexto de arquitetura.
    """

    def __init__(self, project_path: str):
        self.project_path = project_path.replace("\\", "/")
        self.target_path = self.project_path

    @classmethod
    def provision(
        cls,
        app_name: str,
        template_path: str = "gold_templates/template_base_app",
        workspace_root: str = "workspace",
    ) -> "TenantWorkspace":
        target = clone_gold_template(
            app_name=app_name, template_path=template_path, workspace_root=workspace_root
        )
        return cls(target)

    def apply_design_direction(
        self,
        direction: Dict[str, Any],
        lead_raw: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Aplica atomicamente os tokens da Design Direction no workspace:
        - Roteamento e fontes em App.jsx e index.html
        - Tokens semânticos CSS em index.css
        - Configuração estruturada em ai_config.json
        - Variáveis de ambiente em frontend/.env
        """
        lead = lead_raw or {}
        app_name = direction.get("app_name") or lead.get("app_name") or "AppCustomizado"
        font_heading = direction.get("font_heading") or "Plus Jakarta Sans"
        font_body = direction.get("font_body") or "Inter"

        # 1. Atualizar App.jsx para LandingPage na rota inicial
        app_jsx_path = os.path.join(self.project_path, "frontend", "src", "App.jsx")
        if os.path.exists(app_jsx_path):
            try:
                with open(app_jsx_path, "r", encoding="utf-8") as f:
                    content = f.read()
                if "LandingPage" not in content:
                    content = content.replace(
                        "import BookingPage from './pages/BookingPage';",
                        "import LandingPage from './pages/LandingPage';\nimport BookingPage from './pages/BookingPage';",
                    )
                content = content.replace(
                    "{ index: true, element: <BookingPage /> }",
                    "{ index: true, element: <LandingPage /> }",
                )
                if '{ path: "agendar", element: <BookingPage /> }' not in content:
                    content = content.replace(
                        "{ index: true, element: <LandingPage /> },",
                        '{ index: true, element: <LandingPage /> },\n      { path: "agendar", element: <BookingPage /> },',
                    )
                with open(app_jsx_path, "w", encoding="utf-8") as f:
                    f.write(content)
            except Exception as e:
                print(f"[TenantWorkspace] Aviso ao atualizar App.jsx: {e}")

        # 2. Injetar Google Fonts e título no index.html
        index_html_path = os.path.join(self.project_path, "frontend", "index.html")
        if os.path.exists(index_html_path):
            try:
                with open(index_html_path, "r", encoding="utf-8") as f:
                    html_content = f.read()

                html_content = re.sub(
                    r"<title>.*?</title>", f"<title>{app_name}</title>", html_content
                )
                fonts_url = build_google_fonts_url(font_heading, font_body)
                font_link_tag = f'<link href="{fonts_url}" rel="stylesheet">'

                if "fonts.googleapis.com/css2" in html_content:
                    html_content = re.sub(
                        r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>',
                        font_link_tag,
                        html_content,
                    )
                elif "</head>" in html_content:
                    html_content = html_content.replace(
                        "</head>",
                        f'  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
                        f'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                        f"  {font_link_tag}\n</head>",
                    )

                html_content = html_content.replace(
                    'bg-[#0E0D0C] text-[#F5F4F0]',
                    'bg-[var(--bg-color,#0E0D0C)] text-[var(--text-color,#F5F4F0)]',
                )

                with open(index_html_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
            except Exception as e:
                print(f"[TenantWorkspace] Aviso ao atualizar index.html: {e}")

        # 3. Injetar tokens semânticos CSS no index.css
        index_css_path = os.path.join(self.project_path, "frontend", "src", "index.css")
        if os.path.exists(index_css_path):
            try:
                with open(index_css_path, "r", encoding="utf-8") as f:
                    css_content = f.read()

                primary_color = direction.get("primary_color", "#D4AF37")
                secondary_color = direction.get("secondary_color", "#1A1A1A")
                bg_color = direction.get("bg_color", "#0E0D0C")
                surface_color = direction.get("surface_color", "#181614")
                border_color = direction.get("border_color", "#26221F")
                text_color = direction.get("text_color", "#F5F4F0")
                muted_color = direction.get("muted_color", "#A8A29E")

                semantic_vars_block = f"""  /* Semantic Design Direction Tokens */
  --primary-color: {primary_color};
  --secondary-color: {secondary_color};
  --bg-color: {bg_color};
  --surface-color: {surface_color};
  --border-color: {border_color};
  --text-color: {text_color};
  --muted-color: {muted_color};
  --font-display: '{font_heading}', sans-serif;
  --font-sans: '{font_body}', sans-serif;"""

                if ":root {" in css_content:
                    new_css = re.sub(
                        r":root\s*\{[^}]*\}",
                        f":root {{\n{semantic_vars_block}\n}}",
                        css_content,
                        count=1,
                    )
                else:
                    new_css = f":root {{\n{semantic_vars_block}\n}}\n\n" + css_content

                with open(index_css_path, "w", encoding="utf-8") as f:
                    f.write(new_css)
            except Exception as e:
                print(f"[TenantWorkspace] Aviso ao atualizar temas CSS em index.css: {e}")

        # 4. Gravar frontend/ai_config.json
        config_file_path = os.path.join(self.project_path, "frontend", "ai_config.json")
        config_data = {}
        if os.path.exists(config_file_path):
            try:
                with open(config_file_path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
            except Exception:
                config_data = {}
        config_data.update(direction)
        os.makedirs(os.path.dirname(config_file_path), exist_ok=True)
        with open(config_file_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)

        # 5. Gravar frontend/.env
        raw_sub_url = (lead.get("supabase_url") or "").strip()
        raw_sub_key = (lead.get("supabase_anon_key") or "").strip()
        sub_url = raw_sub_url if raw_sub_url else "https://your-project.supabase.co"
        sub_anon = raw_sub_key if raw_sub_key else "your-anon-key-here"

        env_file_path = os.path.join(self.project_path, "frontend", ".env")
        try:
            with open(env_file_path, "w", encoding="utf-8") as f:
                f.write(f"VITE_SUPABASE_URL={sub_url}\n")
                f.write(f"VITE_SUPABASE_ANON_KEY={sub_anon}\n")
                f.write(f"NEXT_PUBLIC_SUPABASE_URL={sub_url}\n")
                f.write(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={sub_anon}\n")
        except Exception as env_err:
            print(f"[TenantWorkspace] Erro ao gravar frontend/.env: {env_err}")

    def write_landing_page(self, jsx_code: str) -> str:
        """Escreve o componente LandingPage.jsx na pasta de páginas do frontend."""
        landing_page_path = os.path.join(
            self.project_path, "frontend", "src", "pages", "LandingPage.jsx"
        )
        os.makedirs(os.path.dirname(landing_page_path), exist_ok=True)
        with open(landing_page_path, "w", encoding="utf-8") as f:
            f.write(jsx_code)
        return landing_page_path

    def copy_template_schema(self, template_path: str = "gold_templates/template_base_app") -> None:
        """Copia os esquemas SQL do template para a pasta database/ do workspace."""
        base_dest_dir = os.path.join(self.project_path, "database")
        os.makedirs(base_dest_dir, exist_ok=True)
        base_dest_schema = os.path.join(base_dest_dir, "base_schema.sql")

        base_template_candidates = [
            os.path.join(template_path, "supabase_schema", "base_schema.sql"),
            os.path.join(template_path, "supabase_schema", "001_initial_schema.sql"),
            os.path.join(template_path, "database", "base_schema.sql"),
        ]
        for candidate in base_template_candidates:
            if os.path.exists(candidate):
                shutil.copy2(candidate, base_dest_schema)
                break

    def deploy_schema(
        self,
        supabase_url: str = "",
        supabase_key: str = "",
        rpc_adapter: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
        template_path: str = "gold_templates/template_base_app",
    ) -> Dict[str, Any]:
        """Garante a presença do esquema SQL base e faz o deploy no banco do cliente se credenciais existirem."""
        self.copy_template_schema(template_path)
        if not supabase_url or not supabase_key:
            return {
                "success": False,
                "error": "Nenhuma credencial de banco enviada. O esquema base foi preservado localmente.",
            }
        return deploy_tenant_database(
            project_path=self.project_path,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            rpc_adapter=rpc_adapter,
        )

    def write_architecture_context(self, content: str) -> str:
        """Grava o arquivo contexto_arquitetura.md na raiz do workspace."""
        path = os.path.join(self.project_path, "contexto_arquitetura.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return path
