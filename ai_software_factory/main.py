import sys
import os

# Garante codificação UTF-8 no console do Windows para evitar UnicodeEncodeError
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv
from supabase import create_client

# Adiciona o diretório raiz ao PYTHONPATH para garantir importações corretas de pacotes
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if supabase_url and supabase_key:
    supabase_client = create_client(supabase_url, supabase_key)
else:
    supabase_client = None

from ai_software_factory.state import AgentState
from ai_software_factory.agents import (
    requirements_analyst_node,
    infra_cloner_node,
    code_injector_node,
    qa_validator_node
)
from ai_software_factory.rag_pipeline import run_rag_analysis_pipeline

# 1. Definição da Estrutura do Grafo
workflow = StateGraph(AgentState)

# Adiciona os nós
workflow.add_node("analista", requirements_analyst_node)
workflow.add_node("infraestrutura", infra_cloner_node)
workflow.add_node("desenvolvedor", code_injector_node)
workflow.add_node("qa", qa_validator_node)

# Ponto de entrada
workflow.set_entry_point("analista")

# Definição do fluxo linear
workflow.add_edge("analista", "infraestrutura")
workflow.add_edge("infraestrutura", "desenvolvedor")
workflow.add_edge("desenvolvedor", "qa")

# Borda condicional pós-QA
def route_after_qa(state: AgentState) -> str:
    if state.get("build_success", False):
        print("\n[Roteamento] Build bem-sucedido! Encerrando execução.")
        return "sucesso"
        
    attempts = state.get("qa_attempts", 0)
    max_attempts = state.get("max_qa_attempts", 3)
    
    if attempts < max_attempts:
        print(f"\n[Roteamento] Build com erros! Retornando para correção (Tentativa {attempts}/{max_attempts}).")
        return "erro"
    else:
        print(f"\n[Roteamento] Falha crítica! Limite máximo de tentativas ({max_attempts}) excedido. Encerrando fluxo.")
        return "falha_critica"

workflow.add_conditional_edges(
    "qa",
    route_after_qa,
    {
        "sucesso": END,
        "erro": "desenvolvedor",
        "falha_critica": END
    }
)

# Compilação do Grafo
app = workflow.compile()

# 2. Configuração do FastAPI
app_api = FastAPI(
    title="Fábrica de Software API",
    description="Endpoint HTTP para disparo automatizado de geração de sites baseados em templates ouro."
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

@app_api.post("/gerar-site")
async def gerar_site(payload: WebhookPayload):
    """
    Inicia o fluxo do orquestrador LangGraph para gerar e validar o site
    com base no payload enviado.
    """
    print(f"\n--- [API POST: /gerar-site] Recebido payload: {payload} ---")
    
    # Prepara o estado inicial para execução do LangGraph
    estado_inicial = {
        "lead_raw_json": {"mensagem": payload.mensagem},
        "customization_requirements": {},
        "template_path": "",
        "target_project_path": "",
        "qa_attempts": 0,
        "max_qa_attempts": 3,
        "last_qa_report": {},
        "build_success": False,
        "execution_logs": []
    }
    
    try:
        # Invoca a execução síncrona do grafo LangGraph
        resultado = app.invoke(estado_inicial)
        
        # Se a validação e build final do QA falharem criticamente
        if not resultado.get("build_success", False):
            raise Exception("O build do projeto falhou nas validações de QA e excedeu o limite de tentativas.")
            
        return {
            "status": "sucesso",
            "mensagem": "Projeto gerado e validado com sucesso",
            "detalhes": resultado.get("customization_requirements")
        }
        
    except Exception as e:
        print(f"Erro crítico durante a geração do site: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno do servidor ao gerar site: {str(e)}"
        )

class ProcessarFilaRequest(BaseModel):
    project_id: Optional[int] = None

@app_api.post("/processar-fila")
async def processar_fila(req_data: Optional[ProcessarFilaRequest] = None):
    """
    Processa o próximo projeto pendente na fila do Supabase.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=500,
            detail="Cliente Supabase não inicializado. Verifique as credenciais no arquivo .env."
        )
        
    project_id = None
    try:
        query = supabase_client.table("fila_projetos").select("*")
        if req_data and req_data.project_id is not None:
            response = query.eq("id", req_data.project_id).execute()
        else:
            response = query.eq("status", "pendente").order("created_at", desc=False).limit(1).execute()
            
        projetos = response.data
        if not projetos:
            return {"mensagem": "A fila de projetos está vazia"}
            
        projeto_encontrado = projetos[0]
        project_id = projeto_encontrado["id"]
        mensagem_lead = projeto_encontrado.get("mensagem_lead", "")
        supabase_url = projeto_encontrado.get("supabase_url")
        supabase_anon_key = projeto_encontrado.get("supabase_anon_key")

        # Validação obrigatória das credenciais do Supabase Single-Tenant
        if not supabase_url or not supabase_anon_key or not supabase_url.strip() or not supabase_anon_key.strip():
            supabase_client.table("fila_projetos")\
                .update({"status": "erro"})\
                .eq("id", project_id)\
                .execute()
            raise HTTPException(
                status_code=400,
                detail="Credenciais do Supabase ausentes. Os campos supabase_url e supabase_anon_key são obrigatórios para a geração do PWA."
            )
            
        # Muda imediatamente o status para 'processando'
        supabase_client.table("fila_projetos")\
            .update({"status": "processando"})\
            .eq("id", project_id)\
            .execute()
            
        # Prepara o estado inicial para execução do LangGraph
        estado_inicial = {
            "lead_raw_json": {
                "mensagem": mensagem_lead,
                "supabase_url": supabase_url.strip(),
                "supabase_anon_key": supabase_anon_key.strip()
            },
            "customization_requirements": {},
            "template_path": "",
            "target_project_path": "",
            "qa_attempts": 0,
            "max_qa_attempts": 3,
            "last_qa_report": {},
            "build_success": False,
            "execution_logs": []
        }
        
        # Invoca a execução síncrona do grafo LangGraph
        resultado = app.invoke(estado_inicial)
        
        # Se a validação e build final do QA falharem criticamente
        if not resultado.get("build_success", False):
            # Se falhar, atualiza o status para 'erro'
            supabase_client.table("fila_projetos")\
                .update({"status": "erro"})\
                .eq("id", project_id)\
                .execute()
            raise Exception("O build do projeto falhou nas validações de QA e excedeu o limite de tentativas.")
            
        # Sucesso: atualiza status para 'concluido' e resultado_json com as customizações geradas
        custom_reqs = resultado.get("customization_requirements", {})
        supabase_client.table("fila_projetos")\
            .update({
                "status": "concluido",
                "resultado_json": custom_reqs
            })\
            .eq("id", project_id)\
            .execute()
            
        return {
            "status": "sucesso",
            "mensagem": "Projeto processado e concluído com sucesso",
            "detalhes": custom_reqs
        }
        
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print(f"Erro crítico durante o processamento do site da fila: {str(e)}")
        # Garante que o status do projeto seja atualizado para 'erro' em caso de exceção no fluxo, se o ID já for conhecido
        if project_id is not None:
            try:
                supabase_client.table("fila_projetos")\
                    .update({"status": "erro"})\
                    .eq("id", project_id)\
                    .execute()
            except Exception as update_err:
                print(f"Erro ao tentar marcar status como 'erro' após falha: {str(update_err)}")
                
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno do servidor ao processar projeto da fila: {str(e)}"
        )

@app_api.post("/api/analisar-rag/{contact_id}")
async def analisar_rag(contact_id: str, background_tasks: BackgroundTasks):
    """
    Inicia o processamento assíncrono do pipeline RAG para o contato fornecido.
    """
    print(f"\n--- [API POST: /api/analisar-rag/{contact_id}] Recebido pedido ---")
    background_tasks.add_task(run_rag_analysis_pipeline, contact_id)
    return {
        "status": "processing",
        "message": f"Pipeline RAG iniciado em segundo plano para o contato {contact_id}"
    }

# 3. Inicialização do Servidor Uvicorn
if __name__ == "__main__":
    uvicorn.run("main:app_api", host="0.0.0.0", port=8000, reload=True)
