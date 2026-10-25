import os
import re
import shutil
import subprocess
import sys
from typing import Callable, List, Optional


def find_antigravity_cli_path() -> Optional[str]:
    """Localiza o binário agy.exe no PATH do sistema ou diretórios padrão do Windows/Linux."""
    # 1. Verifica no PATH
    found = shutil.which("agy") or shutil.which("agy.exe")
    if found:
        return found

    # 2. Caminhos conhecidos no Windows
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        candidates = [
            os.path.join(local_app_data, "Programs", "antigravity", "bin", "agy.exe"),
            os.path.join(local_app_data, "Programs", "antigravity", "agy.exe"),
            os.path.join(local_app_data, "antigravity", "agy.exe"),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate

    return None


def is_antigravity_cli_available() -> bool:
    """Retorna True se o Antigravity CLI estiver disponível para execução."""
    return find_antigravity_cli_path() is not None


def strip_markdown_fences(text: str) -> str:
    """Remove blocos de formatação markdown (```jsx / ```json ... ```) de uma resposta."""
    if not text:
        return ""
    cleaned = re.sub(r"^```[a-zA-Z0-9]*\n", "", text.strip())
    cleaned = re.sub(r"\n```$", "", cleaned)
    return cleaned.strip()


def invoke_antigravity_cli(
    prompt: str,
    system_prompt: Optional[str] = None,
    timeout: float = 60.0,
    runner_fn: Optional[Callable[[List[str], float], str]] = None,
) -> Optional[str]:
    """
    Executa o Antigravity CLI (agy) de forma não-interativa (headless) em modo --print.
    Retorna o conteúdo da resposta ou None em caso de falha ou timeout.
    """
    cli_path = find_antigravity_cli_path()
    if not cli_path and runner_fn is None:
        return None

    full_prompt = prompt
    if system_prompt:
        full_prompt = f"[SYSTEM INSTRUCTIONS]\n{system_prompt}\n\n[USER REQUEST]\n{prompt}"

    cmd = [
        cli_path or "agy",
        "--print",
        full_prompt,
        "--dangerously-skip-permissions",
        "--output-format",
        "text",
    ]

    try:
        if runner_fn is not None:
            raw_output = runner_fn(cmd, timeout)
        else:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace",
            )
            if proc.returncode != 0:
                print(f"[Antigravity Runner] CLI retornou código de erro {proc.returncode}: {proc.stderr}")
                return None
            raw_output = proc.stdout

        if raw_output:
            return strip_markdown_fences(raw_output)
        return None
    except Exception as e:
        print(f"[Antigravity Runner] Falha na execução do CLI Antigravity: {e}")
        return None
