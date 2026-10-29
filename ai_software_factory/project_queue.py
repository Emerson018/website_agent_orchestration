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
    """
    Extrai campos canônicos do `BrandDesignSpec` (`brand_direction` ou `branding`)
    enviados pelo WACRM / Portal Fábrica.
    """
    if not isinstance(payload, dict):
        return {}
    brand_spec = payload.get("brand_direction") or payload.get("branding") or {}
    client_info = payload.get("client_info") or {}
    reqs: Dict[str, Any] = {}
    if payload.get("project_name"):
        reqs["app_name"] = payload["project_name"]
    if brand_spec.get("primary_color") or brand_spec.get("primary_color_hex"):
        reqs["primary_color"] = brand_spec.get("primary_color") or brand_spec.get("primary_color_hex")
    if brand_spec.get("secondary_color") or brand_spec.get("secondary_color_hex"):
        reqs["secondary_color"] = brand_spec.get("secondary_color") or brand_spec.get("secondary_color_hex")
    if brand_spec.get("bg_color") or brand_spec.get("bg_color_hex"):
        reqs["bg_color"] = brand_spec.get("bg_color") or brand_spec.get("bg_color_hex")
    if brand_spec.get("surface_color") or brand_spec.get("surface_color_hex"):
        reqs["surface_color"] = brand_spec.get("surface_color") or brand_spec.get("surface_color_hex")
    if brand_spec.get("text_color") or brand_spec.get("text_color_hex"):
        reqs["text_color"] = brand_spec.get("text_color") or brand_spec.get("text_color_hex")
    if brand_spec.get("muted_color") or brand_spec.get("muted_color_hex"):
        reqs["muted_color"] = brand_spec.get("muted_color") or brand_spec.get("muted_color_hex")
    if brand_spec.get("theme"):
        reqs["theme"] = brand_spec["theme"]
    if brand_spec.get("font_heading"):
        reqs["font_heading"] = brand_spec["font_heading"]
    if brand_spec.get("font_body"):
        reqs["font_body"] = brand_spec["font_body"]
    if brand_spec.get("layout_archetype"):
        reqs["layout_archetype"] = brand_spec["layout_archetype"]
    if brand_spec.get("layout_concept"):
        reqs["layout_concept"] = brand_spec["layout_concept"]
    if brand_spec.get("focal_element"):
        reqs["focal_element"] = brand_spec["focal_element"]
    if brand_spec.get("design_critique"):
        reqs["design_critique"] = brand_spec["design_critique"]
    if brand_spec.get("copy_tone"):
        reqs["copy_tone"] = brand_spec["copy_tone"]
    if brand_spec.get("brand_essence"):
        reqs["brand_essence"] = brand_spec["brand_essence"]
    if brand_spec.get("value_proposition"):
        reqs["value_proposition"] = brand_spec["value_proposition"]
    if brand_spec.get("target_audience"):
        reqs["target_audience"] = brand_spec["target_audience"]
    if brand_spec.get("brand_pillars"):
        reqs["brand_pillars"] = brand_spec["brand_pillars"]
    if brand_spec.get("real_services"):
        reqs["real_services"] = brand_spec["real_services"]
    if brand_spec.get("section_blueprint"):
        reqs["section_blueprint"] = brand_spec["section_blueprint"]
    if brand_spec.get("execution_engine"):
        reqs["execution_engine"] = brand_spec["execution_engine"]
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
        "provedor_execucao": "none",
    }


def merge_project_outcome(
    existing_resultado: Optional[Dict[str, Any]],
    custom_reqs: Dict[str, Any],
    target_project_path: str = "",
    provedor_execucao: Optional[str] = None,
    modelo_utilizado: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Preserva os metadados de vínculo com o CRM (account_id, user_id, contact_id, project_name)
    em resultado_json ao registrar as configurações geradas pela fábrica e o motor/modelo Gemini utilizado.
    """
    merged: Dict[str, Any] = {}
    if isinstance(existing_resultado, dict):
        merged.update(existing_resultado)
    if isinstance(custom_reqs, dict):
        merged.update(custom_reqs)
    if target_project_path:
        merged["target_project_path"] = target_project_path
    if provedor_execucao:
        merged["provedor_execucao"] = provedor_execucao
    if modelo_utilizado:
        merged["modelo_utilizado"] = modelo_utilizado
    return merged


def process_queue_item(
    queue_store: Any,
    workflow_runner: Callable[[Dict[str, Any]], Dict[str, Any]],
    project_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Processa um Project Queue Item da fila (pendente ou específico por ID),
    gerenciando transições de status e preservando metadados de domínio.
    Em caso de falha crítica irrecuperável, estaciona na fila com status 'falha_critica'
    para permitir resolução manual pelo operador/agente na IDE.
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
            error_details = "O build do projeto falhou nas validações de QA e excedeu o limite de tentativas."
            error_payload = dict(existing_resultado or {})
            error_payload["error_details"] = error_details
            if resultado.get("execution_logs"):
                error_payload["execution_logs"] = resultado["execution_logs"]
            queue_store.update(target_id, {"status": "falha_critica", "resultado_json": error_payload})
            raise RuntimeError(error_details)

        custom_reqs = resultado.get("customization_requirements", {})
        target_path = resultado.get("target_project_path", "")
        provedor = resultado.get("provedor_execucao")
        modelo_label = None
        try:
            from ai_software_factory import llm_gateway
            if not provedor:
                provedor = llm_gateway.get_last_execution_provider()
            modelo_label = llm_gateway.get_last_execution_model_label()
        except Exception:
            if not provedor:
                provedor = "desconhecido"

        merged_json = merge_project_outcome(
            existing_resultado=existing_resultado,
            custom_reqs=custom_reqs,
            target_project_path=target_path,
            provedor_execucao=provedor,
            modelo_utilizado=modelo_label,
        )
        if resultado.get("manual_prompt"):
            merged_json["manual_prompt"] = resultado["manual_prompt"]

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
    except Exception as ex:
        try:
            error_payload = dict(existing_resultado or {})
            error_payload["error_details"] = str(ex)
            queue_store.update(target_id, {"status": "falha_critica", "resultado_json": error_payload})
        except Exception:
            pass
        raise
