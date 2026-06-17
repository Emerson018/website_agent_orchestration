from langchain_core.tools import tool
import os
import pathlib

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
