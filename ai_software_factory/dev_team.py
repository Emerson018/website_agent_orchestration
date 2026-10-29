import os
import sys
import time
from operator import add
from typing import Annotated, Any, Dict, Literal, Optional, Sequence, TypedDict
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_software_factory import llm_gateway, skill_loader
from ai_software_factory.llm_gateway import ResilientLLM
from ai_software_factory.workspace_provisioner import TenantWorkspace

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))


def obter_delay():
    return 1.5


def obter_llm(model_openai="gpt-4o", model_gemini="gemini-3.8-flash", temperature=0):
    llm = llm_gateway.get_llm(
        temperature=temperature, model_openai=model_openai, model_gemini=model_gemini
    )
    if llm is None:
        raise ValueError("Nenhuma chave de API do Gemini/OpenAI configurada.")
    return llm


try:
    from dev_tools import (
        escrever_arquivo_codigo,
        ler_arquivo_codigo,
        listar_arvore_arquivos,
        obter_fotos_instagram,
    )
except ImportError:
    from ai_software_factory.dev_tools import (
        escrever_arquivo_codigo,
        ler_arquivo_codigo,
        listar_arvore_arquivos,
        obter_fotos_instagram,
    )

ferramentas_dev = [
    listar_arvore_arquivos,
    ler_arquivo_codigo,
    escrever_arquivo_codigo,
    obter_fotos_instagram,
]
ferramentas_map = {f.name: f for f in ferramentas_dev}


def executar_agente_com_ferramentas(llm_com_ferramentas, prompt_sistema, state_messages):
    messages = [SystemMessage(content=prompt_sistema)] + list(state_messages)
    tamanho_inicial = len(state_messages)

    while True:
        resposta = llm_com_ferramentas.invoke(messages)
        messages.append(resposta)

        if not hasattr(resposta, "tool_calls") or not resposta.tool_calls:
            break

        for tool_call in resposta.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]

            if tool_name in ferramentas_map:
                try:
                    resultado = ferramentas_map[tool_name].invoke(tool_args)
                except Exception as ex:
                    resultado = f"Erro ao executar ferramenta {tool_name}: {str(ex)}"
            else:
                resultado = f"Erro: Ferramenta '{tool_name}' não disponível."

            tool_message = ToolMessage(
                content=str(resultado), name=tool_name, tool_call_id=tool_id
            )
            messages.append(tool_message)

    return messages[tamanho_inicial + 1 :]


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add]
    next: str
    project_path: str
    task: str
    historico_nos: Annotated[Sequence[str], add]


class Route(BaseModel):
    next: Literal["frontend", "backend", "qa", "devops", "FINISH"]


def supervisor_node(state: AgentState):
    time.sleep(obter_delay())

    historico = state.get("historico_nos", [])
    if historico:
        from collections import Counter

        contagem = Counter(historico)
        for no, qtd in contagem.items():
            if no != "supervisor" and qtd >= 5:
                erro_msg = (
                    f"\n[DETECÇÃO DE LOOP / ERRO CRÍTICO]\nO agente '{no}' entrou em loop e tentou executar a mesma tarefa {qtd} vezes sem sucesso.\n"
                )
                raise ValueError(erro_msg)

    llm = obter_llm(temperature=0)
    llm_with_tool = llm.with_structured_output(Route)

    system_prompt = (
        f"Você é o Supervisor de um time de desenvolvimento. Seu time possui as seguintes opções: "
        f"'frontend' (interface e UI), 'backend' (banco e Supabase), 'qa' (validação e testes), 'devops' (infraestrutura). "
        f"O projeto está em: {state['project_path']}. A tarefa exigida é: {state['task']}. "
        f"Analise as mensagens passadas e decida qual trabalhador deve agir agora. "
        f"Se a tarefa estiver completamente finalizada e validada pelo QA, retorne 'FINISH'."
    )

    messages = [SystemMessage(content=system_prompt)] + list(state["messages"])
    resposta = llm_with_tool.invoke(messages)

    return {"next": resposta.next, "historico_nos": ["supervisor"]}


def frontend_node(state: AgentState):
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)
    coding_skill = skill_loader.get_frontend_coding_skill_prompt()

    system_prompt = (
        f"Você é um Engenheiro Frontend Sênior e Design Engineer especialista em React, Vite e TailwindCSS. "
        f"Sua missão é realizar alterações visuais e estruturais nos componentes do projeto localizado em: {state['project_path']}.\n"
        f"Você DEVE OBRIGATORIAMENTE usar a ferramenta 'ler_arquivo_codigo' para ler o arquivo 'contexto_arquitetura.md' na raiz do projeto ANTES de tentar ler ou alterar qualquer outro arquivo.\n\n"
        f"{coding_skill}"
    )

    novas_messages = executar_agente_com_ferramentas(
        llm_com_ferramentas, system_prompt, state["messages"]
    )
    return {"messages": novas_messages, "historico_nos": ["frontend"]}


def backend_node(state: AgentState):
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)

    system_prompt = (
        f"Você é um Engenheiro Backend Sênior especialista em Supabase, PostgreSQL, APIs REST e lógica de negócios. "
        f"Sua missão é atuar na integração de dados e regras de servidor do projeto em: {state['project_path']}. "
        f"Você DEVE OBRIGATORIAMENTE usar a ferramenta 'ler_arquivo_codigo' para ler o 'contexto_arquitetura.md' na raiz do projeto ANTES de alterar qualquer arquivo."
    )

    novas_messages = executar_agente_com_ferramentas(
        llm_com_ferramentas, system_prompt, state["messages"]
    )
    return {"messages": novas_messages, "historico_nos": ["backend"]}


def qa_node(state: AgentState):
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)

    system_prompt = (
        f"Você é um Engenheiro de QA e Dados Sênior. Sua missão é auditar as modificações feitas pelos agentes de frontend e backend no projeto em: {state['project_path']}. "
        f"Você DEVE OBRIGATORIAMENTE usar a ferramenta de leitura para ler o 'contexto_arquitetura.md' primeiro."
    )

    novas_messages = executar_agente_com_ferramentas(
        llm_com_ferramentas, system_prompt, state["messages"]
    )
    return {"messages": novas_messages, "historico_nos": ["qa"]}


def devops_node(state: AgentState):
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)

    system_prompt = (
        f"Você é um Engenheiro DevOps Sênior. Sua missão é gerenciar dependências, variáveis de ambiente e documentação do projeto em: {state['project_path']}. "
        f"Você DEVE OBRIGATORIAMENTE ler o 'contexto_arquitetura.md' primeiro."
    )

    novas_messages = executar_agente_com_ferramentas(
        llm_com_ferramentas, system_prompt, state["messages"]
    )
    return {"messages": novas_messages, "historico_nos": ["devops"]}


builder = StateGraph(AgentState)
builder.add_node("supervisor", supervisor_node)
builder.add_node("frontend", frontend_node)
builder.add_node("backend", backend_node)
builder.add_node("qa", qa_node)
builder.add_node("devops", devops_node)

builder.add_edge(START, "supervisor")
builder.add_edge("frontend", "supervisor")
builder.add_edge("backend", "supervisor")
builder.add_edge("qa", "supervisor")
builder.add_edge("devops", "supervisor")

rotas = {
    "frontend": "frontend",
    "backend": "backend",
    "qa": "qa",
    "devops": "devops",
    "FINISH": END,
}

builder.add_conditional_edges("supervisor", lambda state: state["next"], rotas)
dev_squad_graph = builder.compile()


def refine_tenant_workspace(
    project_path: str,
    task: str,
    initial_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Passe 3 (Post-Generation Refinement Squad):
    Aciona a equipe multiagente com ferramentas (frontend, backend, QA e devops)
    para realizar refinamentos e customizações granulares sobre um Tenant Workspace já provisionado.
    """
    workspace = TenantWorkspace(project_path)
    user_task = initial_prompt or f"Realize a seguinte tarefa no projeto: {task}"
    initial_messages = [HumanMessage(content=user_task)]

    estado_inicial: AgentState = {
        "messages": initial_messages,
        "next": "supervisor",
        "project_path": workspace.target_path,
        "task": task,
        "historico_nos": [],
    }

    resultado = dev_squad_graph.invoke(estado_inicial)
    return {
        "success": True,
        "project_path": workspace.target_path,
        "workspace": workspace,
        "task": task,
        "messages": resultado.get("messages", []),
        "historico_nos": resultado.get("historico_nos", []),
    }

