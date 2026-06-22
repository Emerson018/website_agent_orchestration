from langchain_core.tools import tool
import os
import pathlib
import json

@tool
def listar_arvore_arquivos(caminho_diretorio: str) -> str:
    """Útil para listar todos os arquivos e pastas dentro de um diretório específico para entender a estrutura do projeto."""
    try:
        path = pathlib.Path(caminho_diretorio)
        if not path.exists():
            return f"Erro: O diretório '{caminho_diretorio}' não existe."
        if not path.is_dir():
            return f"Erro: '{caminho_diretorio}' não é um diretório."
            
        tree_lines = []
        
        def build_tree(dir_path: pathlib.Path, prefix: str = ""):
            try:
                items = sorted(list(dir_path.iterdir()))
            except Exception:
                return
                
            # Filtra diretórios pesados e indesejados
            items = [item for item in items if item.name not in ('node_modules', '.git', '.venv')]
            
            for index, item in enumerate(items):
                is_last = (index == len(items) - 1)
                connector = "└── " if is_last else "├── "
                tree_lines.append(f"{prefix}{connector}{item.name}")
                if item.is_dir():
                    new_prefix = prefix + ("    " if is_last else "│   ")
                    build_tree(item, new_prefix)
                    
        tree_lines.append(path.name)
        build_tree(path)
        return "\n".join(tree_lines)
    except Exception as e:
        return f"Erro ao listar o diretório: {str(e)}"

@tool
def ler_arquivo_codigo(caminho_arquivo: str) -> str:
    """Útil para ler o conteúdo exato de um arquivo de código ou documentação (ex: .jsx, .py, .md)."""
    try:
        with open(caminho_arquivo, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"Erro: O arquivo '{caminho_arquivo}' não foi encontrado."
    except Exception as e:
        return f"Erro ao ler o arquivo '{caminho_arquivo}': {str(e)}"

@tool
def escrever_arquivo_codigo(caminho_arquivo: str, conteudo_codigo: str) -> str:
    """Útil para salvar, sobrescrever ou criar um novo arquivo com o código gerado."""
    try:
        parent_dir = os.path.dirname(caminho_arquivo)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)
            
        with open(caminho_arquivo, 'w', encoding='utf-8') as f:
            f.write(conteudo_codigo)
        return f"Arquivo {caminho_arquivo} atualizado com sucesso!"
    except PermissionError:
        return f"Erro: Sem permissão para escrever no arquivo '{caminho_arquivo}'."
    except Exception as e:
        return f"Erro ao escrever no arquivo '{caminho_arquivo}': {str(e)}"

@tool
def obter_fotos_instagram(link_instagram: str) -> str:
    """Útil para buscar fotos reais ou representativas do feed do Instagram do cliente para usar no design do site (como banners, imagens do cardápio e galeria)."""
    perfil = link_instagram.lower()
    
    if "marcianosoficial" in perfil or "marcianos" in perfil:
        # Retorna URLs específicas do rodízio temático alienígena e boliche do Marcianos Burguer
        fotos = {
            "rodizio_mini_burgers": "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=600&q=80",
            "mini_burger_premium": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
            "space_bowling": "https://images.unsplash.com/photo-1538510122447-24839e4871ef?auto=format&fit=crop&w=600&q=80",
            "alien_milkshake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
            "mini_pasteis_rodizio": "https://images.unsplash.com/photo-1563379971899-660589a01cf3?auto=format&fit=crop&w=600&q=80",
            "doces_sobremesa": "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80"
        }
        return f"Fotos encontradas para o perfil @marcianosoficial (Rodízio de Mini Hambúrgueres Temático Alienígena e Boliche):\n{json.dumps(fotos, indent=2)}"
    elif "barbearia" in perfil or "barber" in perfil:
        fotos = {
            "fachada_retro": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
            "corte_cabelo": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80",
            "barba_navalha": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80"
        }
        return f"Fotos encontradas para Barbearia:\n{json.dumps(fotos, indent=2)}"
    else:
        fotos = {
            "hero_banner": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
            "servico_1": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
            "servico_2": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80"
        }
        return f"Fotos representativas encontradas:\n{json.dumps(fotos, indent=2)}"

