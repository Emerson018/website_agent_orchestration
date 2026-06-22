import os
import sys
import time
from typing import TypedDict, Annotated, Sequence, Literal
from operator import add
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END

# Carrega variáveis de ambiente
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

class ResilientLLM:
    def __init__(self, target_llm):
        self.__dict__['target_llm'] = target_llm
        
    def invoke(self, input, config=None, **kwargs):
        tentativas = 10
        delay = 35
        for i in range(tentativas):
            try:
                return self.target_llm.invoke(input, config=config, **kwargs)
            except Exception as e:
                erro_str = str(e)
                is_rate_limit = ("429" in erro_str or "RESOURCE_EXHAUSTED" in erro_str or "quota" in erro_str.lower())
                is_not_found = ("404" in erro_str or "not found" in erro_str.lower())
                
                if is_rate_limit and not is_not_found:
                    print(f"\n[Rate Limit] Limite de cota detectado. Aguardando {delay} segundos antes de tentar novamente (Tentativa {i+1}/{tentativas})...")
                    time.sleep(delay)
                else:
                    raise e
        return self.target_llm.invoke(input, config=config, **kwargs)
        
    def bind_tools(self, tools, **kwargs):
        bound_runnable = self.target_llm.bind_tools(tools, **kwargs)
        return ResilientLLM(bound_runnable)
        
    def with_structured_output(self, schema, **kwargs):
        bound_runnable = self.target_llm.with_structured_output(schema, **kwargs)
        return ResilientLLM(bound_runnable)

    def __getattr__(self, name):
        return getattr(self.target_llm, name)

def obter_delay():
    if os.environ.get("USE_LOCAL_LLM", "false").lower() == "true":
        return 0.1
    return 4.0

def obter_llm(model_openai="gpt-4o", model_gemini="gemini-2.5-flash", temperature=0):
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    
    if use_local:
        local_url = os.environ.get("LOCAL_LLM_URL", "http://localhost:1234/v1")
        local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
        llm = ChatOpenAI(
            model=local_model,
            openai_api_key="lm-studio",
            base_url=local_url,
            temperature=temperature
        )
    elif openai_key:
        llm = ChatOpenAI(model=model_openai, temperature=temperature)
    elif google_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=model_gemini,
            google_api_key=google_key,
            temperature=temperature
        )
    else:
        raise ValueError("Nenhuma chave de API ou LLM local configurada.")
        
    return ResilientLLM(llm)


# Adiciona a importação das ferramentas do sistema de arquivos
try:
    from dev_tools import listar_arvore_arquivos, ler_arquivo_codigo, escrever_arquivo_codigo, obter_fotos_instagram
except ImportError:
    from ai_software_factory.dev_tools import listar_arvore_arquivos, ler_arquivo_codigo, escrever_arquivo_codigo, obter_fotos_instagram

ferramentas_dev = [listar_arvore_arquivos, ler_arquivo_codigo, escrever_arquivo_codigo, obter_fotos_instagram]
ferramentas_map = {f.name: f for f in ferramentas_dev}


def executar_agente_com_ferramentas(llm_com_ferramentas, prompt_sistema, state_messages):
    messages = [SystemMessage(content=prompt_sistema)] + list(state_messages)
    tamanho_inicial = len(state_messages)
    
    while True:
        resposta = llm_com_ferramentas.invoke(messages)
        messages.append(resposta)
        
        # Se a IA respondeu sem pedir chamadas de ferramentas, saímos do loop
        if not hasattr(resposta, "tool_calls") or not resposta.tool_calls:
            break
            
        print(f"\n   [IA solicitou chamadas de ferramentas]: {[tc['name'] for tc in resposta.tool_calls]}")
        for tool_call in resposta.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            if tool_name in ferramentas_map:
                try:
                    print(f"   -> Executando localmente: {tool_name}({tool_args})")
                    resultado = ferramentas_map[tool_name].invoke(tool_args)
                    try:
                        print(f"   -> Resultado da ferramenta: {resultado}")
                    except Exception:
                        try:
                            print(f"   -> Resultado da ferramenta (safe encoding): {str(resultado).encode('ascii', 'replace').decode('ascii')}")
                        except Exception:
                            print("   -> Resultado da ferramenta: [Erro ao exibir no console devido ao encoding]")
                except Exception as ex:
                    resultado = f"Erro ao executar ferramenta {tool_name}: {str(ex)}"
                    try:
                        print(f"   -> Erro na ferramenta: {resultado}")
                    except Exception:
                        print("   -> Erro na ferramenta: [Erro ao exibir no console devido ao encoding]")
            else:
                resultado = f"Erro: Ferramenta '{tool_name}' não disponível."
                print(f"   -> Erro: {resultado}")
                
            tool_message = ToolMessage(content=str(resultado), name=tool_name, tool_call_id=tool_id)
            messages.append(tool_message)
            
    # Retorna apenas as novas mensagens acumuladas (ignora o system prompt [0] e as originais)
    return messages[tamanho_inicial + 1:]

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add]
    next: str
    project_path: str
    task: str
    historico_nos: Annotated[Sequence[str], add]

class Route(BaseModel):
    next: Literal["frontend", "backend", "qa", "devops", "FINISH"]

def supervisor_node(state: AgentState):
    print("\n--- [Nó: Supervisor] Iniciando decisão de rota... ---")
    time.sleep(obter_delay())
    
    # Detecção de Loops (Limite de 5 tentativas repetidas para o mesmo nó de trabalho)
    historico = state.get("historico_nos", [])
    if historico:
        from collections import Counter
        contagem = Counter(historico)
        for no, qtd in contagem.items():
            if no != "supervisor" and qtd >= 5:
                erro_msg = f"\n[DETECÇÃO DE LOOP / ERRO CRÍTICO]\nO agente '{no}' entrou em loop e tentou executar a mesma tarefa {qtd} vezes sem sucesso.\n"
                erro_msg += "A execução foi abortada. Aqui estão as últimas mensagens trocadas para análise humana:\n"
                for msg in state["messages"][-4:]:
                    role = "Agente" if msg.type == "ai" else "Sistema/Humano"
                    erro_msg += f"- [{role}]: {msg.content[:400]}\n"
                raise ValueError(erro_msg)
                
    llm = obter_llm(temperature=0)
    llm_with_tool = llm.with_structured_output(Route)
    
    system_prompt = f"Você é o Supervisor de um time de desenvolvimento. Seu time possui as seguintes opções: 'frontend' (interface e UI), 'backend' (banco e Supabase), 'qa' (validação e testes), 'devops' (infraestrutura). O projeto está em: {state['project_path']}. A tarefa exigida é: {state['task']}. Analise as mensagens passadas e decida qual trabalhador deve agir agora. Se a tarefa estiver completamente finalizada e validada pelo QA, retorne 'FINISH'."
    
    messages = [SystemMessage(content=system_prompt)] + list(state["messages"])
    resposta = llm_with_tool.invoke(messages)
    
    return {"next": resposta.next, "historico_nos": ["supervisor"]}

def frontend_node(state: AgentState):
    print("\n--- [Nó: Frontend] Iniciando tarefas de frontend... ---")
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)
    
    system_prompt = f"Você é um Engenheiro Frontend Sênior especialista em React, Vite e TailwindCSS. Sua missão é realizar alterações visuais e estruturais nos componentes do projeto localizado em: {state['project_path']}. Você DEVE OBRIGATORIAMENTE usar a ferramenta 'ler_arquivo_codigo' para ler o arquivo 'contexto_arquitetura.md' na raiz do projeto ANTES de tentar ler ou alterar qualquer outro arquivo. Entenda o design system e as regras. Só então, use a ferramenta de listar arquivos, encontre o componente a ser alterado, leia-o, e use a ferramenta de escrever para salvar a modificação. Quando finalizar, responda detalhando o que você alterou."
    
    novas_messages = executar_agente_com_ferramentas(llm_com_ferramentas, system_prompt, state["messages"])
    return {"messages": novas_messages, "historico_nos": ["frontend"]}

def backend_node(state: AgentState):
    print("\n--- [Nó: Backend] Iniciando tarefas de backend... ---")
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)
    
    system_prompt = f"Você é um Engenheiro Backend Sênior especialista em Supabase, PostgreSQL, APIs REST e lógica de negócios. Sua missão é atuar na integração de dados e regras de servidor do projeto em: {state['project_path']}. Você DEVE OBRIGATORIAMENTE usar a ferramenta 'ler_arquivo_codigo' para ler o 'contexto_arquitetura.md' na raiz do projeto ANTES de alterar qualquer arquivo. Entenda as regras de banco de dados e arquitetura. Após isso, use suas ferramentas para ler, criar ou alterar os arquivos necessários (como chamadas de API ou lógicas de banco). Nunca exponha chaves secretas no frontend. Ao finalizar, responda detalhando a lógica que você implementou."
    
    novas_messages = executar_agente_com_ferramentas(llm_com_ferramentas, system_prompt, state["messages"])
    return {"messages": novas_messages, "historico_nos": ["backend"]}

def qa_node(state: AgentState):
    print("\n--- [Nó: QA] Iniciando validações de código... ---")
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)
    
    system_prompt = f"Você é um Engenheiro de QA e Dados Sênior. Sua missão é auditar as modificações feitas pelos agentes de frontend e backend no projeto em: {state['project_path']}. Você DEVE OBRIGATORIAMENTE usar a ferramenta de leitura para ler o 'contexto_arquitetura.md' primeiro. Revise o código alterado em busca de erros de sintaxe, violações de arquitetura e falhas de lógica. Preste atenção extrema a qualquer lógica de aggregation de dados, garantindo que o sistema manipule registros redundantes como entradas únicas e jamais some valores duplicados em cálculos ou relatórios. Se encontrar erros, use a ferramenta de escrita para corrigi-los. Responda com um relatório de aprovação detalhando o que foi validado."
    
    novas_messages = executar_agente_com_ferramentas(llm_com_ferramentas, system_prompt, state["messages"])
    return {"messages": novas_messages, "historico_nos": ["qa"]}

def devops_node(state: AgentState):
    print("\n--- [Nó: DevOps] Iniciando tarefas de infraestrutura e documentação... ---")
    time.sleep(obter_delay())
    llm = obter_llm(temperature=0)
    llm_com_ferramentas = llm.bind_tools(ferramentas_dev)
    
    system_prompt = f"Você é um Engenheiro DevOps Sênior. Sua missão é gerenciar dependências, variáveis de ambiente e documentação do projeto em: {state['project_path']}. Você DEVE OBRIGATORIAMENTE ler o 'contexto_arquitetura.md' primeiro. Sua responsabilidade principal é verificar se as alterações recentes adicionaram novas bibliotecas (package.json) ou rotas cruciais. Se sim, você deve usar a ferramenta de escrita para ATUALIZAR o arquivo 'contexto_arquitetura.md' com essa novas informações, mantendo-o como um documento vivo. Responda detalhando os ajustes de ambiente ou updates de documentação que você realizou."
    
    novas_messages = executar_agente_com_ferramentas(llm_com_ferramentas, system_prompt, state["messages"])
    return {"messages": novas_messages, "historico_nos": ["devops"]}

# Construção do Grafo
builder = StateGraph(AgentState)

# Adiciona todos os nós
builder.add_node("supervisor", supervisor_node)
builder.add_node("frontend", frontend_node)
builder.add_node("backend", backend_node)
builder.add_node("qa", qa_node)
builder.add_node("devops", devops_node)

# Define o ponto de partida (START)
builder.add_edge(START, "supervisor")

# Define as rotas de retorno para o Supervisor
builder.add_edge("frontend", "supervisor")
builder.add_edge("backend", "supervisor")
builder.add_edge("qa", "supervisor")
builder.add_edge("devops", "supervisor")

# Define as rotas condicionais do Supervisor
rotas = {
    "frontend": "frontend",
    "backend": "backend",
    "qa": "qa",
    "devops": "devops",
    "FINISH": END
}

builder.add_conditional_edges("supervisor", lambda state: state["next"], rotas)

# Compilação do Grafo
dev_squad_graph = builder.compile()
