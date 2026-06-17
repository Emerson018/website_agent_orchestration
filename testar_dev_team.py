import sys
import os
from langchain_core.messages import HumanMessage

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Adiciona o diretório atual ao PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Carrega dotenv na raiz para garantir as chaves
from dotenv import load_dotenv
load_dotenv()

from ai_software_factory.dev_team import dev_squad_graph

def rodar_teste():
    project_path = "workspace/Sorriso_perfeito"
    task = "Adicionar uma barra de navegação lateral (Sidebar) elegante e responsiva no frontend do projeto, contendo links para as rotas/seções principais, estilizada de acordo com o design system do projeto."
    
    print(f"Iniciando o time de desenvolvimento para a tarefa:")
    print(f"Projeto: {project_path}")
    print(f"Tarefa: {task}")
    print("-" * 50)
    
    # Estado inicial do grafo de agentes
    estado_inicial = {
        "messages": [HumanMessage(content=task)],
        "project_path": project_path,
        "task": task,
        "next": "supervisor",
        "historico_nos": []
    }
    
    # Executa o fluxo de agentes
    try:
        # Executa o grafo
        resultado = dev_squad_graph.invoke(estado_inicial)
        
        print("\n" + "=" * 50)
        print("Execução finalizada!")
        print("=" * 50)
        
        # Exibe o histórico de mensagens trocadas
        print("\nHistórico de Mensagens dos Agentes:")
        for msg in resultado.get("messages", []):
            role = "Agente"
            if msg.type == "human":
                role = "Sistema/Tarefa"
            print(f"\n[{role}]: {msg.content}")
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                print(f"Chamadas de ferramentas: {msg.tool_calls}")
                
    except Exception as e:
        print(f"\nErro durante a execução do time de desenvolvimento: {str(e)}")

if __name__ == "__main__":
    rodar_teste()
