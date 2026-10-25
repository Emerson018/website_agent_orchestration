import json
import os
import re
import socket
import time
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar
from urllib.parse import urlparse
import httpx
from pydantic import BaseModel

from ai_software_factory.antigravity_runner import (
    invoke_antigravity_cli,
    is_antigravity_cli_available,
)

T = TypeVar("T", bound=BaseModel)

_LAST_EXECUTION_PROVIDER: str = "none"


def get_last_execution_provider() -> str:
    """Retorna o identificador do último provedor que executou a geração com sucesso (ex: local_lm_studio, antigravity_cli, cloud_gemini_3.8_flash)."""
    global _LAST_EXECUTION_PROVIDER
    return _LAST_EXECUTION_PROVIDER


def set_last_execution_provider(provider: str) -> None:
    """Define o identificador do provedor de execução atual."""
    global _LAST_EXECUTION_PROVIDER
    _LAST_EXECUTION_PROVIDER = provider


def strip_code_fences(code: str) -> str:
    """Extrai de forma robusta o código contido em blocos markdown (```jsx ... ```) ou remove cercas."""
    if not code:
        return ""
    # Se houver bloco de código markdown explícito no corpo da resposta
    match = re.search(r"```(?:jsx|javascript|react|tsx|js)?\s*\n(.*?)```", code, re.DOTALL)
    if match:
        return match.group(1).strip()
    cleaned = re.sub(r"^```[a-zA-Z0-9]*\n", "", code.strip())
    cleaned = re.sub(r"\n```$", "", cleaned)
    return cleaned.strip()


class ResilientLLM:
    """
    Wrapper resiliente que intercepta erros de Rate Limit (HTTP 429 / RESOURCE_EXHAUSTED)
    e realiza retentativas com backoff configurável.
    """

    def __init__(self, target_llm: Any, max_attempts: int = 10, retry_delay: float = 35.0):
        self.__dict__["target_llm"] = target_llm
        self.__dict__["max_attempts"] = max_attempts
        self.__dict__["retry_delay"] = retry_delay

    def invoke(self, input_data: Any, config: Any = None, **kwargs: Any) -> Any:
        for i in range(self.max_attempts):
            try:
                if config is not None:
                    return self.target_llm.invoke(input_data, config=config, **kwargs)
                return self.target_llm.invoke(input_data, **kwargs)
            except Exception as e:
                erro_str = str(e)
                is_rate_limit = (
                    "429" in erro_str
                    or "RESOURCE_EXHAUSTED" in erro_str
                    or "quota" in erro_str.lower()
                )
                is_not_found = "404" in erro_str or "not found" in erro_str.lower()

                if is_rate_limit and not is_not_found and i < self.max_attempts - 1:
                    delay = min(self.retry_delay * (1.5 ** i), 120.0) if self.retry_delay > 0 else 0.0
                    print(
                        f"\n[Rate Limit] Limite de cota detectado. Aguardando {delay:.1f}s "
                        f"(Tentativa {i + 1}/{self.max_attempts})..."
                    )
                    if delay > 0:
                        time.sleep(delay)
                else:
                    raise e
        return self.target_llm.invoke(input_data, **kwargs)

    def bind_tools(self, tools: Any, **kwargs: Any) -> "ResilientLLM":
        bound_runnable = self.target_llm.bind_tools(tools, **kwargs)
        return ResilientLLM(
            bound_runnable, max_attempts=self.max_attempts, retry_delay=self.retry_delay
        )

    def with_structured_output(self, schema: Any, **kwargs: Any) -> "ResilientLLM":
        bound_runnable = self.target_llm.with_structured_output(schema, **kwargs)
        return ResilientLLM(
            bound_runnable, max_attempts=self.max_attempts, retry_delay=self.retry_delay
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self.target_llm, name)


def describe_active_llm() -> Dict[str, Any]:
    """Informa qual provedor LLM está configurado no ambiente atual."""
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")

    if use_local:
        return {
            "provider": "local",
            "label": f"LM Studio Local ({local_model} em {local_url})",
            "model": local_model,
            "base_url": local_url,
        }
    if google_key:
        return {
            "provider": "google",
            "label": "API Google Gemini (gemini-3.8-flash)",
            "model": "gemini-3.8-flash",
        }
    if openai_key:
        return {
            "provider": "openai",
            "label": "API OpenAI (gpt-4o-mini)",
            "model": "gpt-4o-mini",
        }
    return {
        "provider": "none",
        "label": "Fallback Heurístico Local (Motor Python)",
        "model": None,
    }


def get_llm(
    temperature: float = 0.0,
    model_openai: str = "gpt-4o-mini",
    model_gemini: str = "gemini-3.8-flash",
    adapter: Optional[Any] = None,
) -> Optional[ResilientLLM]:
    """
    Retorna a instância unificada de LLM encapsulada em ResilientLLM, ou None se
    nenhum provedor estiver configurado. Aceita um adapter injetado para testes.
    """
    if adapter is not None:
        return (
            adapter
            if isinstance(adapter, ResilientLLM)
            else ResilientLLM(adapter, retry_delay=0.0)
        )

    info = describe_active_llm()
    provider = info["provider"]
    if provider == "none":
        return None

    from langchain_openai import ChatOpenAI

    if provider == "local":
        llm = ChatOpenAI(
            model=info["model"],
            openai_api_key=os.environ.get("LOCAL_LLM_API_KEY", "lm-studio") or "lm-studio",
            base_url=info["base_url"],
            temperature=temperature,
        )
    elif provider == "google":
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        llm = ChatOpenAI(
            model=model_gemini,
            openai_api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=temperature,
        )
    else:
        llm = ChatOpenAI(model=model_openai, temperature=temperature)

    return ResilientLLM(llm)


def is_port_reachable(url: str, timeout: float = 1.0) -> bool:
    """Verifica rapidamente se o host/porta da URL informada aceita conexões TCP."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (80 if parsed.scheme == "http" else 443)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def invoke_local_lm_studio_http(
    system_prompt: str, user_prompt: str, timeout: float = 15.0
) -> Optional[str]:
    """
    Chama o LM Studio local via HTTP direto com timeout fail-fast de 15 segundos
    e verificação imediata de porta para não travar a fábrica.
    """
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
    local_api_key = os.environ.get("LOCAL_LLM_API_KEY", "").strip()

    urls_to_try = [local_url, "http://127.0.0.1:1234/v1", "http://localhost:1234/v1"]
    seen = set()
    urls_unique = [x for x in urls_to_try if not (x in seen or seen.add(x))]

    # Checagem rápida de porta: se nenhuma porta estiver aberta, fail-fast em milissegundos
    reachable_urls = [u for u in urls_unique if is_port_reachable(u, timeout=0.8)]
    if not reachable_urls:
        return None

    payload = {
        "model": local_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    headers_list = [{"Content-Type": "application/json"}]
    if local_api_key:
        headers_list.insert(
            0, {"Content-Type": "application/json", "Authorization": f"Bearer {local_api_key}"}
        )
    else:
        headers_list.append(
            {"Content-Type": "application/json", "Authorization": "Bearer lm-studio"}
        )

    for url in reachable_urls:
        for headers in headers_list:
            try:
                with httpx.Client(timeout=timeout) as client:
                    res = client.post(f"{url}/chat/completions", json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        return data["choices"][0]["message"]["content"]
            except Exception:
                pass
    return None


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Extrai e faz parsing do primeiro objeto JSON contido em uma string ou bloco Markdown, com reparo para vírgulas extras."""
    if not text:
        return None

    def _try_parse(raw: str) -> Optional[Dict[str, Any]]:
        try:
            return json.loads(raw)
        except Exception:
            repaired = re.sub(r",\s*([\]}])", r"\1", raw)
            try:
                return json.loads(repaired)
            except Exception:
                return None

    # 1. Tentar bloco ```json ... ```
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        res = _try_parse(fence_match.group(1))
        if res is not None:
            return res

    # 2. Tentar qualquer par balanceado { ... }
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if json_match:
        res = _try_parse(json_match.group(0))
        if res is not None:
            return res

    return None


def synthesize_structured(
    system_prompt: str,
    user_prompt: str,
    schema_class: Type[T],
    temperature: float = 0.2,
    adapter: Optional[Any] = None,
    fallback_fn: Optional[Callable[[], Any]] = None,
    tier1_local_fn: Optional[Callable[[str, str], Optional[str]]] = None,
    tier2_antigravity_fn: Optional[Callable[[str, str], Optional[str]]] = None,
    tier3_cloud_fn: Optional[Callable[[str, str], Optional[str]]] = None,
) -> Any:
    """
    Cascata de 4 Níveis para síntese estruturada:
    Tier 1 (LM Studio Local) -> Tier 2 (Antigravity CLI) -> Tier 3 (Cloud API Gemini 3.8 Flash) -> Tier 4 (Fallback)
    """
    if adapter is not None:
        set_last_execution_provider("adapter")
        llm = adapter if isinstance(adapter, ResilientLLM) else ResilientLLM(adapter, retry_delay=0.0)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        raw_res = llm.invoke(messages)
        if isinstance(raw_res, schema_class):
            return raw_res
        if hasattr(raw_res, "model_dump"):
            return schema_class.model_validate(raw_res.model_dump())
        if isinstance(raw_res, dict):
            return schema_class.model_validate(raw_res)

        content = raw_res.content if hasattr(raw_res, "content") else str(raw_res)
        parsed = extract_json_from_text(content)
        if parsed is not None:
            try:
                return schema_class.model_validate(parsed)
            except Exception:
                return parsed
        return fallback_fn() if fallback_fn else None

    # TIER 1: IA Local (LM Studio)
    raw_tier1 = None
    if tier1_local_fn is not None:
        raw_tier1 = tier1_local_fn(system_prompt, user_prompt)
    else:
        use_local = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
        if use_local:
            raw_tier1 = invoke_local_lm_studio_http(system_prompt, user_prompt, timeout=15.0)

    if raw_tier1:
        parsed = extract_json_from_text(raw_tier1)
        if parsed is not None:
            set_last_execution_provider("local_lm_studio")
            try:
                return schema_class.model_validate(parsed)
            except Exception:
                return parsed

    # TIER 2: Antigravity CLI Headless
    raw_tier2 = None
    if tier2_antigravity_fn is not None:
        raw_tier2 = tier2_antigravity_fn(system_prompt, user_prompt)
    elif is_antigravity_cli_available():
        print("[LLM Gateway] Tier 1 (LM Studio) não respondeu. Acionando Tier 2: Antigravity CLI...")
        json_instruction = f"{user_prompt}\n\nIMPORTANTE: Retorne APENAS um objeto JSON válido correspondente ao schema solicitado."
        raw_tier2 = invoke_antigravity_cli(prompt=json_instruction, system_prompt=system_prompt, timeout=120.0)

    if raw_tier2:
        parsed = extract_json_from_text(raw_tier2)
        if parsed is not None:
            set_last_execution_provider("antigravity_cli")
            try:
                return schema_class.model_validate(parsed)
            except Exception:
                return parsed

    # TIER 3: Cloud API (Gemini 3.8 Flash / OpenAI)
    raw_tier3 = None
    if tier3_cloud_fn is not None:
        raw_tier3 = tier3_cloud_fn(system_prompt, user_prompt)
    else:
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if google_key or openai_key:
            print("[LLM Gateway] Tier 2 (Antigravity CLI) não disponível. Acionando Tier 3: Cloud API (Gemini 3.8 Flash)...")
            from langchain_openai import ChatOpenAI
            cloud_llm = None
            if google_key:
                cloud_llm = ChatOpenAI(
                    model="gemini-3.8-flash",
                    openai_api_key=google_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    temperature=temperature,
                )
            elif openai_key:
                cloud_llm = ChatOpenAI(model="gpt-4o-mini", temperature=temperature)

            if cloud_llm is not None:
                try:
                    res = cloud_llm.invoke([
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ])
                    raw_tier3 = res.content if hasattr(res, "content") else str(res)
                except Exception as ex_cloud:
                    print(f"[LLM Gateway] Falha no Tier 3 (Cloud API): {ex_cloud}")

    if raw_tier3:
        parsed = extract_json_from_text(raw_tier3)
        if parsed is not None:
            set_last_execution_provider("cloud_gemini_3.8_flash")
            try:
                return schema_class.model_validate(parsed)
            except Exception:
                return parsed

    # TIER 4: Deterministic Fallback
    if fallback_fn is not None:
        set_last_execution_provider("fallback_deterministic")
        return fallback_fn()

    set_last_execution_provider("falha")
    return None


def generate_code(
    system_prompt: str,
    user_prompt: str,
    validator_fn: Optional[Callable[[str], bool]] = None,
    fallback_fn: Optional[Callable[[], str]] = None,
    adapter: Optional[Callable[[str, str], Optional[str]]] = None,
    tier1_local_fn: Optional[Callable[[str, str], Optional[str]]] = None,
    tier2_antigravity_fn: Optional[Callable[[str, str], Optional[str]]] = None,
    tier3_cloud_fn: Optional[Callable[[str, str], Optional[str]]] = None,
) -> Optional[str]:
    """
    Cascata de 4 Níveis para geração de código (LandingPage.jsx, SQL, HTML):
    Tier 1 (LM Studio Local) -> Tier 2 (Antigravity CLI) -> Tier 3 (Cloud API Gemini 3.8 Flash) -> Tier 4 (Fallback)
    """
    if adapter is not None:
        raw_code = adapter(system_prompt, user_prompt)
        cleaned = strip_code_fences(raw_code) if raw_code else None
        if cleaned and (validator_fn is None or validator_fn(cleaned)):
            set_last_execution_provider("adapter")
            return cleaned
        return fallback_fn() if fallback_fn else None

    # TIER 1: IA Local (LM Studio)
    raw_tier1 = None
    if tier1_local_fn is not None:
        raw_tier1 = tier1_local_fn(system_prompt, user_prompt)
    else:
        use_local = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
        if use_local:
            raw_tier1 = invoke_local_lm_studio_http(system_prompt, user_prompt, timeout=15.0)

    if raw_tier1:
        cleaned = strip_code_fences(raw_tier1)
        if cleaned and (validator_fn is None or validator_fn(cleaned)):
            set_last_execution_provider("local_lm_studio")
            return cleaned

    # TIER 2: Antigravity CLI Headless
    raw_tier2 = None
    if tier2_antigravity_fn is not None:
        raw_tier2 = tier2_antigravity_fn(system_prompt, user_prompt)
    elif is_antigravity_cli_available():
        print("[LLM Gateway] Tier 1 (LM Studio) não respondeu. Acionando Tier 2: Antigravity CLI...")
        raw_tier2 = invoke_antigravity_cli(prompt=user_prompt, system_prompt=system_prompt, timeout=120.0)

    if raw_tier2:
        cleaned = strip_code_fences(raw_tier2)
        if cleaned and (validator_fn is None or validator_fn(cleaned)):
            set_last_execution_provider("antigravity_cli")
            return cleaned

    # TIER 3: Cloud API (Gemini 3.8 Flash / OpenAI)
    raw_tier3 = None
    if tier3_cloud_fn is not None:
        raw_tier3 = tier3_cloud_fn(system_prompt, user_prompt)
    else:
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if google_key or openai_key:
            print("[LLM Gateway] Tier 2 (Antigravity CLI) não disponível. Acionando Tier 3: Cloud API (Gemini 3.8 Flash)...")
            from langchain_openai import ChatOpenAI
            cloud_llm = None
            if google_key:
                cloud_llm = ChatOpenAI(
                    model="gemini-3.8-flash",
                    openai_api_key=google_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    temperature=0.0,
                )
            elif openai_key:
                cloud_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)

            if cloud_llm is not None:
                try:
                    res = cloud_llm.invoke([
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ])
                    raw_tier3 = res.content if hasattr(res, "content") else str(res)
                except Exception as ex_cloud:
                    print(f"[LLM Gateway] Falha no Tier 3 (Cloud API): {ex_cloud}")

    if raw_tier3:
        cleaned = strip_code_fences(raw_tier3)
        if cleaned and (validator_fn is None or validator_fn(cleaned)):
            set_last_execution_provider("cloud_gemini_3.8_flash")
            return cleaned

    # TIER 4: Deterministic Fallback
    if fallback_fn is not None:
        set_last_execution_provider("fallback_deterministic")
        return fallback_fn()

    set_last_execution_provider("falha")
    return None


# Compatibilidade retroativa com config.invoke_code_llm
invoke_code_llm = generate_code
