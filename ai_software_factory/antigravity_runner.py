import os
import re
import shutil
import subprocess
import sys
from typing import Callable, List, Optional


def find_gemini_cli_path() -> Optional[str]:
    """Localiza o binário do Gemini CLI (gemini.cmd / gemini) no PATH ou pasta npm global."""
    env_path = os.environ.get("GEMINI_CLI_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    for name in ["gemini.cmd", "gemini.exe", "gemini"]:
        found = shutil.which(name)
        if found:
            return found

    appdata = os.environ.get("APPDATA", "")
    if appdata:
        candidate = os.path.join(appdata, "npm", "gemini.cmd")
        if os.path.exists(candidate):
            return candidate

    return None


def find_antigravity_cli_path() -> Optional[str]:
    """Localiza o binário do Antigravity / agy ou Gemini CLI no PATH do sistema, env var ou diretórios padrão."""
    # 0. Override explícito via variável de ambiente
    env_path = os.environ.get("ANTIGRAVITY_CLI_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path

    # 1. Verifica no PATH do sistema
    cli_names = [
        "antigravity",
        "antigravity.cmd",
        "antigravity.exe",
        "agy",
        "agy.cmd",
        "agy.exe",
        "gemini.cmd",
        "gemini",
    ]
    for name in cli_names:
        found = shutil.which(name)
        if found:
            return found

    # 2. Caminhos conhecidos no Windows
    known_candidates = [
        r"E:\Antigravity\bin\antigravity.cmd",
        r"E:\Antigravity\bin\antigravity-ide.cmd",
        r"C:\Program Files\Antigravity\bin\antigravity.cmd",
    ]
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        known_candidates.extend([
            os.path.join(local_app_data, "Programs", "antigravity", "bin", "antigravity.cmd"),
            os.path.join(local_app_data, "Programs", "antigravity", "bin", "antigravity-ide.cmd"),
            os.path.join(local_app_data, "Programs", "antigravity", "bin", "agy.exe"),
            os.path.join(local_app_data, "Programs", "antigravity", "agy.exe"),
            os.path.join(local_app_data, "antigravity", "agy.exe"),
        ])

    for candidate in known_candidates:
        if os.path.exists(candidate):
            return candidate

    return None


def is_antigravity_cli_available() -> bool:
    """Retorna True se o Antigravity CLI ou Gemini CLI estiver disponível para execução."""
    return find_antigravity_cli_path() is not None


def strip_markdown_fences(text: str) -> str:
    """Remove blocos de formatação markdown (```jsx / ```json ... ```) de uma resposta."""
    if not text:
        return ""
    cleaned = re.sub(r"^```[a-zA-Z0-9]*\n", "", text.strip())
    cleaned = re.sub(r"\n```$", "", cleaned)
    return cleaned.strip()


def build_manual_prompt(
    system_prompt: str,
    user_prompt: str,
    target_file: Optional[str] = "LandingPage.jsx",
    extra_context: Optional[str] = None,
) -> str:
    """
    Constrói um prompt completo, detalhado e auto-contido para o usuário
    executar a tarefa manualmente no Antigravity/Gemini caso a execução autônoma
    encontre falha ou esteja indisponível.
    """
    extra_block = f"\n\n## Contexto Adicional do Negócio\n{extra_context}" if extra_context else ""
    return (
        f"# [MANUAL TASK] Geração de {target_file}\n\n"
        f"> **Intervenção Manual Solicitada (Tier 2):**\n"
        f"> A execução autônoma via Gemini CLI / API não foi concluída. "
        f"Copie o prompt estruturado abaixo e cole diretamente no chat do Antigravity para gerar o código.\n\n"
        f"## Diretrizes de Sistema (System Prompt)\n"
        f"```markdown\n{system_prompt}\n```\n\n"
        f"## Especificação da Tarefa (User Prompt)\n"
        f"```markdown\n{user_prompt}\n```{extra_block}\n\n"
        f"## Instruções de Conclusão\n"
        f"1. Cole o conteúdo acima no chat do Antigravity.\n"
        f"2. Solicite a gravação do resultado em `{target_file}` no workspace do projeto.\n"
        f"3. O sistema manterá o status de intervenção manual no painel até a conclusão."
    )


def invoke_gemini_cli(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    timeout: float = 75.0,
) -> Optional[str]:
    """
    Executa o Gemini CLI (`gemini.cmd`) em modo não-interativo (`-p`), enviando o prompt
    via stdin para evitar limite de caracteres do comando no Windows.
    """
    gemini_bin = find_gemini_cli_path()
    if not gemini_bin:
        return None

    full_prompt = prompt
    if system_prompt:
        full_prompt = f"[SYSTEM INSTRUCTIONS]\n{system_prompt}\n\n[USER REQUEST]\n{prompt}"

    cmd: List[str] = [gemini_bin]
    if model:
        cmd.extend(["-m", model])
    cmd.extend(["-p", "Responda estritamente ao prompt fornecido na entrada padrao."])

    try:
        proc = subprocess.run(
            cmd,
            input=full_prompt,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode == 0 and proc.stdout and proc.stdout.strip():
            return strip_markdown_fences(proc.stdout)
        return None
    except Exception as e:
        print(f"[Gemini CLI Runner] Aviso ao invocar Gemini CLI: {e}")
        return None


def invoke_antigravity_cli(
    prompt: str,
    system_prompt: Optional[str] = None,
    timeout: float = 60.0,
    runner_fn: Optional[Callable[[List[str], float], str]] = None,
) -> Optional[str]:
    """
    Executa o CLI de IA de forma não-interativa (headless).
    Se `runner_fn` for injetado (testes), usa o contrato `--print`; caso contrário,
    tenta primeiro o `gemini.cmd` não-interativo e em seguida o binário `antigravity --print`.
    """
    cli_path = find_antigravity_cli_path()
    if not cli_path and runner_fn is None:
        return None

    full_prompt = prompt
    if system_prompt:
        full_prompt = f"[SYSTEM INSTRUCTIONS]\n{system_prompt}\n\n[USER REQUEST]\n{prompt}"

    cmd = [
        cli_path or "antigravity",
        "--print",
        full_prompt,
        "--dangerously-skip-permissions",
        "--output-format",
        "text",
    ]

    try:
        if runner_fn is not None:
            raw_output = runner_fn(cmd, timeout)
            if raw_output:
                return strip_markdown_fences(raw_output)
            return None

        # Tenta primeiro o Gemini CLI (headless nativo com -p) se disponível
        gemini_out = invoke_gemini_cli(prompt=prompt, system_prompt=system_prompt, timeout=timeout)
        if gemini_out:
            return gemini_out

        # Evita abrir janela Electron se o binário for o launcher gráfico do IDE sem suporte a --print
        if cli_path and os.path.basename(cli_path).lower() in ("antigravity.cmd", "antigravity-ide.cmd"):
            return None

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
        print(f"[Antigravity Runner] Falha na execução do CLI: {e}")
        return None
