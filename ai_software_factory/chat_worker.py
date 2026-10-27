import json
import os
from typing import Any, Dict, List, Optional

_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_PROJETOS_PATH = os.path.join(
    _ROOT_DIR, "workspace", "portal_fabrica", "backend", "data", "local_projetos.json"
)
PENDING_QUEUE_DIR = os.path.join(_ROOT_DIR, ".agents", "queue")
PENDING_JOB_FILE = os.path.join(PENDING_QUEUE_DIR, "pending_job.json")


def _read_local_projects() -> List[Dict[str, Any]]:
    if not os.path.exists(LOCAL_PROJETOS_PATH):
        return []
    try:
        with open(LOCAL_PROJETOS_PATH, "r", encoding="utf-8") as f:
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
    """Localiza o primeiro projeto pendente de atendimento pelo agente Antigravity."""
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
    """Atualiza o projeto com status concluído, metadados de design e provedor antigravity_chat_agent."""
    projects = _read_local_projects()
    updated = False
    for p in projects:
        if p.get("id") == project_id:
            p["status"] = "concluido"
            res = p.get("resultado_json") or {}
            res["customization_requirements"] = customization_requirements
            res["target_project_path"] = target_project_path
            res["provedor_execucao"] = "antigravity_chat_agent"
            if preview_url:
                res["preview_url"] = preview_url
            p["resultado_json"] = res
            updated = True
            break

    if updated:
        _write_local_projects(projects)
        # Limpa arquivo de pending_job se existir
        if os.path.exists(PENDING_JOB_FILE):
            try:
                os.remove(PENDING_JOB_FILE)
            except Exception:
                pass
        return True
    return False


def enqueue_project_for_agent(project_id: int, project_data: Optional[Dict[str, Any]] = None) -> bool:
    """Marca o projeto como aguardando_agente e grava .agents/queue/pending_job.json para o watcher."""
    projects = _read_local_projects()
    found = False
    target_item = project_data or {}
    for p in projects:
        if p.get("id") == project_id:
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
