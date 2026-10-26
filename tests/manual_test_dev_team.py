import sys
import os
from langchain_core.messages import HumanMessage

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Adiciona a raiz do repositório ao PYTHONPATH
_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT_DIR)

# Carrega dotenv na raiz para garantir as chaves
from dotenv import load_dotenv
load_dotenv(os.path.join(_ROOT_DIR, ".env"))

from ai_software_factory.dev_team import refine_tenant_workspace

def rodar_teste():
    project_path = "workspace/Sorriso_perfeito"
    task = "Adicionar uma barra de navegação lateral (Sidebar) elegante e responsiva no frontend do projeto, contendo links para as rotas/seções principais, estilizada de acordo com o design system do projeto."
    
    print(f"Iniciando o time de desenvolvimento (Passe 3 — Refinement Squad):")
    print(f"Projeto: {project_path}")
    print(f"Tarefa: {task}")
    print("-" * 50)
    
    try:
        resultado = refine_tenant_workspace(project_path, task)
        
        print("\n" + "=" * 50)
        print("Execução finalizada com sucesso!")
        print("=" * 50)
        
        print("\nHistórico de Mensagens dos Agentes:")
        for msg in resultado.get("messages", []):
            role = "Agente"
            if hasattr(msg, "type") and msg.type == "human":
                role = "Sistema/Tarefa"
            content = getattr(msg, "content", str(msg))
            print(f"\n[{role}]: {content}")
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                print(f"Chamadas de ferramentas: {msg.tool_calls}")
                
    except Exception as e:
        print(f"\nErro durante a execução do time de desenvolvimento: {str(e)}")

if __name__ == "__main__":
    rodar_teste()
