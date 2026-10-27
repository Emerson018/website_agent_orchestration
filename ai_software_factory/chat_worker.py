import json
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT_DIR, ".env"))
load_dotenv(os.path.join(_ROOT_DIR, "ai_software_factory", ".env"))

LOCAL_PROJETOS_PATH = os.path.join(
    _ROOT_DIR, "workspace", "portal_fabrica", "backend", "data", "local_projetos.json"
)
PENDING_QUEUE_DIR = os.path.join(_ROOT_DIR, ".agents", "queue")
PENDING_JOB_FILE = os.path.join(PENDING_QUEUE_DIR, "pending_job.json")


def _get_supabase_client():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if url and key:
        try:
            from supabase import create_client
            return create_client(url, key)
        except Exception:
            return None
    return None


def _read_local_projects() -> List[Dict[str, Any]]:
    if not os.path.exists(LOCAL_PROJETOS_PATH):
        return []
    try:
        with open(LOCAL_PROPOS_PATH if 'LOCAL_PROPOS_PATH' in locals() else LOCAL_PROJETOS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _write_local_projects(projects: List[Dict[str, Any]]) -> bool:
    try:
        os.makedirs(os.path.dirname(LOCAL_PROJETOS_PATH), exist_ok=True)
        with open(LOCAL_PROJETOS_PATH, "w", encoding="utf-8") as f:
            json.dump(projects, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def fetch_pending_project() -> Optional[Dict[str, Any]]:
    """Localiza o primeiro projeto pendente no pending_job.json, Supabase ou local_projetos.json."""
    if os.path.exists(PENDING_JOB_FILE):
        try:
            with open(PENDING_JOB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    sb = _get_supabase_client()
    if sb:
        try:
            res = (
                sb.from_("fila_projetos")
                .select("*")
                .in_("status", ["aguardando_agente", "processando", "pendente"])
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception:
            pass

    projects = _read_local_projects()
    for p in projects:
        status = str(p.get("status", "")).lower()
        if status in ("aguardando_agente", "processando"):
            return p
    return None


def complete_project(
    project_id: int,
    customization_requirements: Dict[str, Any],
    target_project_path: str,
    preview_url: Optional[str] = None,
) -> bool:
    """Atualiza o projeto com status concluído, metadados de design e provedor antigravity_chat_agent no local e Supabase."""
    projects = _read_local_projects()
    target_item = None
    for p in projects:
        if str(p.get("id")) == str(project_id):
            target_item = p
            break

    if not target_item:
        target_item = {
            "id": project_id,
            "status": "concluido",
            "resultado_json": {},
            "is_local": True,
        }
        projects.insert(0, target_item)

    target_item["status"] = "concluido"
    res = target_item.get("resultado_json") or {}
    res["customization_requirements"] = customization_requirements
    res["target_project_path"] = target_project_path
    res["provedor_execucao"] = "antigravity_chat_agent"
    if preview_url:
        res["preview_url"] = preview_url
    target_item["resultado_json"] = res

    _write_local_projects(projects)

    # Atualiza no Supabase se ativo
    sb = _get_supabase_client()
    if sb:
        try:
            sb.from_("fila_projetos").update({
                "status": "concluido",
                "resultado_json": res,
            }).eq("id", project_id).execute()
        except Exception as e:
            print(f"[ChatWorker] Aviso ao atualizar Supabase: {e}")

    # Remove o arquivo de fila pending_job
    if os.path.exists(PENDING_JOB_FILE):
        try:
            os.remove(PENDING_JOB_FILE)
        except Exception:
            pass

    return True


def enqueue_project_for_agent(project_id: int, project_data: Optional[Dict[str, Any]] = None) -> bool:
    """Marca o projeto como aguardando_agente e grava .agents/queue/pending_job.json para o watcher."""
    projects = _read_local_projects()
    found = False
    target_item = project_data or {}
    for p in projects:
        if str(p.get("id")) == str(project_id):
            p["status"] = "aguardando_agente"
            target_item = p
            found = True
            break

    if not found and project_data:
        projects.insert(0, project_data)
        found = True

    if found:
        _write_local_projects(projects)
        os.makedirs(PENDING_QUEUE_DIR, exist_ok=True)
        try:
            with open(PENDING_JOB_FILE, "w", encoding="utf-8") as f:
                json.dump(target_item, f, indent=2, ensure_ascii=False)
            return True
        except Exception:
            return False
    return False
