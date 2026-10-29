import os
import sys
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.graph import END, StateGraph
from pydantic import BaseModel
from supabase import create_client
import uvicorn

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if supabase_url and supabase_key:
    try:
        supabase_client = create_client(supabase_url, supabase_key)
    except Exception:
        supabase_client = None
else:
    supabase_client = None

from ai_software_factory.agents import (
    code_injector_node,
    infra_cloner_node,
    qa_validator_node,
    requirements_analyst_node,
)
from ai_software_factory.project_queue import (
    SupabaseQueueStore,
    build_initial_agent_state,
    process_queue_item,
)
from ai_software_factory.brand_analyzer import run_brand_analysis_pipeline
from ai_software_factory.state import AgentState
from ai_software_factory import llm_gateway

workflow = StateGraph(AgentState)
workflow.add_node("analista", requirements_analyst_node)
workflow.add_node("infraestrutura", infra_cloner_node)
workflow.add_node("desenvolvedor", code_injector_node)
workflow.add_node("qa", qa_validator_node)

workflow.set_entry_point("analista")
workflow.add_edge("analista", "infraestrutura")
workflow.add_edge("infraestrutura", "desenvolvedor")
workflow.add_edge("desenvolvedor", "qa")


def route_after_qa(state: AgentState) -> str:
    if state.get("build_success", False):
        return "sucesso"

    attempts = state.get("qa_attempts", 0)
    max_attempts = state.get("max_qa_attempts", 3)

    if attempts < max_attempts:
        return "erro"
    return "falha_critica"


workflow.add_conditional_edges(
    "qa",
    route_after_qa,
    {
        "sucesso": END,
        "erro": "desenvolvedor",
        "falha_critica": END,
    },
)

app = workflow.compile()

app_api = FastAPI(
    title="Fábrica de Software API",
    description="Endpoint HTTP para diagnóstico de marca e geração automatizada de sites com layouts únicos.",
)

app_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WebhookPayload(BaseModel):
    mensagem: str
    briefing_payload: Optional[Dict[str, Any]] = None


@app_api.post("/gerar-site")
async def gerar_site(payload: WebhookPayload):
    estado_inicial = build_initial_agent_state(
        mensagem_lead=payload.mensagem,
        briefing_payload=payload.briefing_payload,
    )
    try:
        resultado = app.invoke(estado_inicial)
        if not resultado.get("build_success", False):
            raise Exception(
                "O build do projeto falhou nas validações de QA e excedeu o limite de tentativas."
            )
        provedor = resultado.get("provedor_execucao") or llm_gateway.get_last_execution_provider()
        modelo_label = llm_gateway.get_last_execution_model_label()
        return {
            "status": "sucesso",
            "mensagem": f"Projeto gerado e validado com sucesso via {modelo_label}",
            "detalhes": resultado.get("customization_requirements"),
            "target_project_path": resultado.get("target_project_path"),
            "provedor_execucao": provedor,
            "modelo_utilizado": modelo_label,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno do servidor ao gerar site: {str(e)}",
        )


class ProcessarFilaRequest(BaseModel):
    project_id: Optional[int] = None


@app_api.post("/processar-fila")
async def processar_fila(req_data: Optional[ProcessarFilaRequest] = None):
    if not supabase_client:
        raise HTTPException(
            status_code=500,
            detail="Cliente Supabase não inicializado. Verifique as credenciais no arquivo .env.",
        )

    store = SupabaseQueueStore(supabase_client)
    project_id = req_data.project_id if req_data else None

    try:
        res = process_queue_item(
            queue_store=store,
            workflow_runner=app.invoke,
            project_id=project_id,
        )
        if res.get("status") == "vazio":
            return {"mensagem": res["mensagem"]}
        return res
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno do servidor ao processar projeto da fila: {str(e)}",
        )


@app_api.post("/api/analisar-marca/{contact_id}")
@app_api.post("/api/analisar-rag/{contact_id}")
async def analisar_marca(contact_id: str, background_tasks: BackgroundTasks):
    active_info = llm_gateway.describe_active_llm()
    background_tasks.add_task(run_brand_analysis_pipeline, contact_id)
    return {
        "status": "processing",
        "engine": active_info["label"],
        "message": f"Análise de marca e conteúdo iniciada em segundo plano para o contato {contact_id} ({active_info['label']})",
    }


if __name__ == "__main__":
    uvicorn.run("main:app_api", host="0.0.0.0", port=8000, reload=True)
