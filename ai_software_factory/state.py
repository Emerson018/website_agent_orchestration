from typing import TypedDict, Dict, Any, List

class AgentState(TypedDict):
    """
    Estado compartilhado entre os nós do grafo do Orquestrador de Fábrica de IA.
    """
    # Entradas do Sistema
    lead_raw_json: Dict[str, Any]
    
    # Dados Processados (Analista de Requisitos)
    customization_requirements: Dict[str, Any]
    
    # Controle de Caminhos de Arquivo
    template_path: str
    target_project_path: str
    
    # Histórico de Build & Feedback do QA
    qa_attempts: int
    max_qa_attempts: int
    last_qa_report: Dict[str, Any]
    build_success: bool
    
    # Logs e Rastreabilidade do Fluxo
    execution_logs: List[str]
