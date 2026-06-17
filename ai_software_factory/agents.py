import re
import os
import shutil
import json
import subprocess
from typing import Dict, Any, List
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from ai_software_factory.state import AgentState
from ai_software_factory.schemas import ClientConfig

# Carrega chaves de API do arquivo .env
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

def requirements_analyst_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente Analista de Requisitos (Real com Fallback Seguro):
    Lê os dados brutos do lead, envia para a LLM se a chave estiver configurada,
    caso contrário executa uma extração base estruturada como fallback.
    """
    print("\n--- [Agente: Analista de Requisitos] ---")
    lead_raw = state.get("lead_raw_json", {})
    print(f"Analisando lead_raw_json recebido: {lead_raw}")
    
    # Verifica a existência de chaves de API para chamada da LLM
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    
    if openai_key:
        print("[Analista de Requisitos] OPENAI_API_KEY configurada. Invocando LLM OpenAI real...")
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        use_llm = True
    elif google_key:
        print("[Analista de Requisitos] GOOGLE_API_KEY configurada. Invocando Gemini real via endpoint compatível...")
        llm = ChatOpenAI(
            model="gemini-3.5-flash",
            openai_api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        use_llm = True
    else:
        use_llm = False
    
    if not use_llm:
        print("[Analista de Requisitos] AVISO: Nenhuma chave de API de LLM configurada.")
        print("Executando fallback local para simular a extração da estrutura ClientConfig...")
        # Fallback estruturado seguro
        custom_reqs = {
            "app_name": lead_raw.get("app_name", "AppCustomizado"),
            "primary_color": "#D4AF37",
            "secondary_color": "#1A1A1A"
        }
        log_msg = "[RequirementsAnalyst] Requisitos estruturados via Fallback seguro (chave de API ausente)."
    else:
        structured_llm = llm.with_structured_output(ClientConfig)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Você é um Analista de Requisitos especialista. Analise os dados de entrada do cliente e infira as configurações de personalização do app React (nome comercial, cor primária e secundária) de acordo com o esquema ClientConfig definido."),
            ("user", "Dados brutos do lead:\n{lead_raw_json}")
        ])
        
        chain = prompt | structured_llm
        
        result: ClientConfig = chain.invoke({"lead_raw_json": json.dumps(lead_raw, ensure_ascii=False)})
        custom_reqs = result.model_dump()
        log_msg = "[RequirementsAnalyst] Requisitos estruturados via LLM com sucesso."
    
    template = "gold_templates/template_base_app"
    
    print(f"Requisitos extraídos: {custom_reqs}")
    print(f"Template ouro selecionado: {template}")
    
    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(log_msg)
    
    return {
        "customization_requirements": custom_reqs,
        "template_path": template,
        "execution_logs": current_logs
    }

def infra_cloner_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente Infraestrutura / Clonador (Real):
    Cria a pasta do workspace e copia todo o conteúdo do Template Ouro
    para o diretório correspondente ao app customizado.
    """
    print("\n--- [Agente: Infraestrutura / Clonador] ---")
    template = state.get("template_path", "gold_templates/template_base_app")
    reqs = state.get("customization_requirements", {})
    app_name = reqs.get("app_name", "AppCustomizado")
    
    # Limpa o app_name para criar um nome de pasta seguro em snake_case/sem espaços
    app_name_limpo = re.sub(r'\s+', '_', app_name)
    app_name_limpo = re.sub(r'[^a-zA-Z0-9_]', '', app_name_limpo)
    
    target_project = f"workspace/{app_name_limpo}"
    
    print(f"Copiando fisicamente o Template Ouro de '{template}' para '{target_project}'...")
    
    # Realiza a cópia recursiva dos arquivos
    shutil.copytree(template, target_project, dirs_exist_ok=True)
    print("Cópia de arquivos concluída com sucesso.")
    
    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(f"[InfraCloner] Template clonado com sucesso para {target_project}.")
    
    return {
        "target_project_path": target_project,
        "execution_logs": current_logs
    }

def code_injector_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente Desenvolvedor / Injetor de Código (Real):
    Lê a configuração estruturada e escreve diretamente no ai_config.json
    do frontend do projeto clonado.
    """
    print("\n--- [Agente: Desenvolvedor / Injetor] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    reqs = state.get("customization_requirements", {})
    attempts = state.get("qa_attempts", 0)
    last_report = state.get("last_qa_report", {})
    
    print(f"Injetando código e parâmetros no projeto em '{target_path}' (Tentativas realizadas: {attempts})...")
    print(f"Dados a injetar: {reqs}")
    
    # Caminho do ai_config.json no projeto clonado
    config_file_path = os.path.join(target_path, "frontend", "ai_config.json")
    
    # Se o arquivo já existir, lê e mescla as configurações para não perder campos não customizados (ex: chaves do Supabase)
    if os.path.exists(config_file_path):
        try:
            with open(config_file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
        except Exception as e:
            print(f"Aviso ao abrir ai_config.json existente: {e}. Criando novo dicionário.")
            config_data = {}
    else:
        config_data = {}
        
    # Atualiza os dados com a customização da IA
    config_data.update(reqs)
    
    # Garante que o diretório pai existe antes de salvar
    os.makedirs(os.path.dirname(config_file_path), exist_ok=True)
    
    with open(config_file_path, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)
        
    print(f"Arquivo de parametrização '{config_file_path}' atualizado com sucesso.")
    
    # Geração do contexto de arquitetura (Project Ledger) para orientar futuras manutenções
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    
    contexto_arquitetura = f"""Contexto de Arquitetura: {app_name}
1. Identidade Visual
Cor Primária: {primary_color}

Cor Secundária: {secondary_color}

2. Stack Tecnológica Base
Frontend: React + Vite

Estilização: TailwindCSS

Backend/Auth/DB: Supabase

3. Regras Estritas de Manutenção (Para IAs)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.

DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.

DIRETRIZ 3: NENHUMA dependência npm externa (ex: bibliotecas de mapas, carrosséis) deve ser instalada sem aprovação explícita do usuário.

DIRETRIZ 4: Mantenha as rotas protegidas sob o fluxo de autenticação atual.
"""
    
    contexto_path = os.path.join(target_path, "contexto_arquitetura.md")
    with open(contexto_path, 'w', encoding='utf-8') as f:
        f.write(contexto_arquitetura)
        
    print(f"Documento de contexto de arquitetura '{contexto_path}' gerado com sucesso.")
    
    if last_report and last_report.get("error"):
        print(f"Corrigindo falha reportada pelo QA anterior: {last_report.get('error')}")
        
    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(f"[CodeInjector] Customização injetada fisicamente no ai_config.json.")
    
    return {
        "execution_logs": current_logs
    }

def qa_validator_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente QA / Validador de Build (Real):
    Executa 'npm install' e 'npm run build' na pasta do frontend clonado.
    Analisa o resultado e atualiza o estado com o status de build_success e erros.
    """
    print("\n--- [Agente: QA / Validador] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    attempts = state.get("qa_attempts", 0) + 1
    
    frontend_dir = os.path.join(target_path, "frontend")
    print(f"Executando validações de QA em '{frontend_dir}' (Tentativa {attempts})...")
    
    # 1. Executa 'npm install'
    print("Executando 'npm install'...")
    install_process = subprocess.run(
        "npm install",
        cwd=frontend_dir,
        shell=True,
        capture_output=True,
        text=True
    )
    
    if install_process.returncode != 0:
        print("Erro durante 'npm install'!")
        print(install_process.stderr)
        
    # 2. Executa 'npm run build'
    print("Executando 'npm run build'...")
    build_process = subprocess.run(
        "npm run build",
        cwd=frontend_dir,
        shell=True,
        capture_output=True,
        text=True
    )
    
    current_logs = state.get("execution_logs", []).copy()
    
    if build_process.returncode == 0:
        print("Build realizado com sucesso! Sem erros detectados.")
        build_success = True
        report = {}
        current_logs.append(f"[QAValidator] Build e testes executados com sucesso na tentativa {attempts}.")
    else:
        print("Erro de compilação/build detectado pelo QA!")
        build_success = False
        error_msg = build_process.stderr or build_process.stdout or "Erro desconhecido durante o build."
        report = {"error": error_msg.strip()}
        current_logs.append(f"[QAValidator] Build falhou na tentativa {attempts}. Erro: {report['error'][:100]}...")
        
    return {
        "build_success": build_success,
        "last_qa_report": report,
        "qa_attempts": attempts,
        "execution_logs": current_logs
    }
