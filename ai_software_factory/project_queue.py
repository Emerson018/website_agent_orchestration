from typing import Any, Callable, Dict, Optional


class SupabaseQueueStore:
    """Adapter de produção para leitura e atualização de Project Queue Items no Supabase."""

    def __init__(self, supabase_client: Any):
        self.client = supabase_client

    def fetch_next(self, project_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        query = self.client.table("fila_projetos").select("*")
        if project_id is not None:
            response = query.eq("id", project_id).execute()
        else:
            response = (
                query.eq("status", "pendente")
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
        rows = response.data or []
        return rows[0] if rows else None

    def update(self, project_id: int, patch: Dict[str, Any]) -> None:
        self.client.table("fila_projetos").update(patch).eq("id", project_id).execute()


def extract_requirements_from_briefing_payload(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Extrai campos canônicos estruturados enviados pelo WACRM/Portal Fábrica."""
    if not isinstance(payload, dict):
        return {}
    branding = payload.get("branding") or {}
    client_info = payload.get("client_info") or {}
    reqs: Dict[str, Any] = {}
    if payload.get("project_name"):
        reqs["app_name"] = payload["project_name"]
    if branding.get("primary_color_hex"):
        reqs["primary_color"] = branding["primary_color_hex"]
    if branding.get("secondary_color_hex"):
        reqs["secondary_color"] = branding["secondary_color_hex"]
    if branding.get("bg_color_hex"):
        reqs["bg_color"] = branding["bg_color_hex"]
    if branding.get("surface_color_hex"):
        reqs["surface_color"] = branding["surface_color_hex"]
    if branding.get("text_color_hex"):
        reqs["text_color"] = branding["text_color_hex"]
    if branding.get("muted_color_hex"):
        reqs["muted_color"] = branding["muted_color_hex"]
    if branding.get("theme"):
        reqs["theme"] = branding["theme"]
    if branding.get("font_heading"):
        reqs["font_heading"] = branding["font_heading"]
    if branding.get("font_body"):
        reqs["font_body"] = branding["font_body"]
    if branding.get("layout_concept"):
        reqs["layout_concept"] = branding["layout_concept"]
    if branding.get("focal_element"):
        reqs["focal_element"] = branding["focal_element"]
    if branding.get("design_critique"):
        reqs["design_critique"] = branding["design_critique"]
    if branding.get("copy_tone"):
        reqs["copy_tone"] = branding["copy_tone"]
    if client_info.get("phone"):
        reqs["phone"] = client_info["phone"]
    if client_info.get("email"):
        reqs["email"] = client_info["email"]
    return reqs


def build_initial_agent_state(
    mensagem_lead: str,
    supabase_url: str = "",
    supabase_anon_key: str = "",
    supabase_service_role_key: str = "",
    briefing_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    custom_reqs = extract_requirements_from_briefing_payload(briefing_payload) if briefing_payload else {}
    lead_raw: Dict[str, Any] = {
        "mensagem": mensagem_lead,
        "supabase_url": (supabase_url or "").strip(),
        "supabase_anon_key": (supabase_anon_key or "").strip(),
        "supabase_service_role_key": (supabase_service_role_key or "").strip(),
    }
    if briefing_payload:
        lead_raw["briefing_payload"] = briefing_payload
        if custom_reqs.get("app_name"):
            lead_raw["app_name"] = custom_reqs["app_name"]

    return {
        "lead_raw_json": lead_raw,
        "customization_requirements": custom_reqs,
        "template_path": "",
        "target_project_path": "",
        "qa_attempts": 0,
        "max_qa_attempts": 3,
        "last_qa_report": {},
        "build_success": False,
        "execution_logs": [],
    }


def merge_project_outcome(
    existing_resultado: Optional[Dict[str, Any]],
    custom_reqs: Dict[str, Any],
    target_project_path: str = "",
) -> Dict[str, Any]:
    """
    Preserva os metadados de vínculo com o CRM (account_id, user_id, contact_id, project_name)
    em resultado_json ao registrar as configurações geradas pela fábrica.
    """
    merged: Dict[str, Any] = {}
    if isinstance(existing_resultado, dict):
        merged.update(existing_resultado)
    if isinstance(custom_reqs, dict):
        merged.update(custom_reqs)
    if target_project_path:
        merged["target_project_path"] = target_project_path
    return merged


def process_queue_item(
    queue_store: Any,
    workflow_runner: Callable[[Dict[str, Any]], Dict[str, Any]],
    project_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Processa um Project Queue Item da fila (pendente ou específico por ID),
    gerenciando transições de status e preservando metadados de domínio.
    """
    item = queue_store.fetch_next(project_id=project_id)
    if not item:
        return {"status": "vazio", "mensagem": "A fila de projetos está vazia"}

    target_id = item["id"]
    mensagem_lead = item.get("mensagem_lead", "") or ""
    supabase_url = (item.get("supabase_url") or "").strip()
    supabase_anon_key = (item.get("supabase_anon_key") or "").strip()
    existing_resultado = item.get("resultado_json") or {}
    service_role_key = ""
    briefing_payload = None
    if isinstance(existing_resultado, dict):
        service_role_key = (existing_resultado.get("supabase_service_role_key") or "").strip()
        briefing_payload = existing_resultado.get("briefing_payload")

    queue_store.update(target_id, {"status": "processando"})

    initial_state = build_initial_agent_state(
        mensagem_lead=mensagem_lead,
        supabase_url=supabase_url,
        supabase_anon_key=supabase_anon_key,
        supabase_service_role_key=service_role_key,
        briefing_payload=briefing_payload,
    )

    try:
        resultado = workflow_runner(initial_state)
        if not resultado.get("build_success", False):
            queue_store.update(target_id, {"status": "erro"})
            raise RuntimeError(
                "O build do projeto falhou nas validações de QA e excedeu o limite de tentativas."
            )

        custom_reqs = resultado.get("customization_requirements", {})
        target_path = resultado.get("target_project_path", "")
        merged_json = merge_project_outcome(existing_resultado, custom_reqs, target_path)

        queue_store.update(
            target_id,
            {
                "status": "concluido",
                "resultado_json": merged_json,
            },
        )
        return {
            "status": "sucesso",
            "mensagem": "Projeto processado e concluído com sucesso",
            "detalhes": merged_json,
        }
    except Exception:
        try:
            queue_store.update(target_id, {"status": "erro"})
        except Exception:
            pass
        raise
