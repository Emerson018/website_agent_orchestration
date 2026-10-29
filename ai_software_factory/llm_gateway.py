import json
import os
import re
import time
from typing import Any, Callable, Dict, Optional, Type, TypeVar
from pydantic import BaseModel

from ai_software_factory.antigravity_runner import (
    build_manual_prompt,
    find_gemini_cli_path,
    invoke_antigravity_cli,
    is_antigravity_cli_available,
)

T = TypeVar("T", bound=BaseModel)

DEFAULT_GEMINI_API_MODEL = "gemini-3.8-flash"

_LAST_EXECUTION_PROVIDER: str = "none"
_LAST_EXECUTION_MODEL_LABEL: str = "Nenhum"
_LAST_MANUAL_PROMPT: str = ""


def get_last_execution_provider() -> str:
    """Retorna o identificador do último provedor de execução (ex: antigravity_cli, google_gemini_api, manual_prompt_generated, adapter)."""
    global _LAST_EXECUTION_PROVIDER
    return _LAST_EXECUTION_PROVIDER


def set_last_execution_provider(provider: str, model_label: Optional[str] = None) -> None:
    """Define o identificador do provedor de execução atual e o rótulo legível do motor/modelo."""
    global _LAST_EXECUTION_PROVIDER, _LAST_EXECUTION_MODEL_LABEL
    _LAST_EXECUTION_PROVIDER = provider
    if model_label:
        _LAST_EXECUTION_MODEL_LABEL = model_label


def get_last_execution_model_label() -> str:
    """Retorna o rótulo legível do motor/modelo que concluiu a última operação."""
    global _LAST_EXECUTION_MODEL_LABEL
    return _LAST_EXECUTION_MODEL_LABEL


def get_last_manual_prompt() -> str:
    """Retorna o último prompt manual gerado para intervenção do usuário."""
    global _LAST_MANUAL_PROMPT
    return _LAST_MANUAL_PROMPT


def set_last_manual_prompt(prompt: str) -> None:
    """Armazena o último prompt manual gerado."""
    global _LAST_MANUAL_PROMPT
    _LAST_MANUAL_PROMPT = prompt


def strip_code_fences(code: str) -> str:
    """Extrai de forma robusta o código contido em blocos markdown (```jsx ... ```) ou remove cercas."""
    if not code:
        return ""
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
    """Informa o provedor principal ativo no ambiente (Gemini CLI / Antigravity IDE -> API Google Gemini gemini-3.8-flash)."""
    if find_gemini_cli_path():
        return {
            "provider": "gemini_cli",
            "label": f"Gemini CLI + API Google Gemini ({DEFAULT_GEMINI_API_MODEL})",
            "model": DEFAULT_GEMINI_API_MODEL,
        }
    if is_antigravity_cli_available():
        return {
            "provider": "antigravity",
            "label": "Antigravity CLI (Headless)",
            "model": "antigravity",
        }
    google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
    if google_key:
        return {
            "provider": "google",
            "label": f"API Google Gemini ({DEFAULT_GEMINI_API_MODEL})",
            "model": DEFAULT_GEMINI_API_MODEL,
        }
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if openai_key:
        return {
            "provider": "openai",
            "label": "API OpenAI (gpt-4o-mini)",
            "model": "gpt-4o-mini",
        }
    return {
        "provider": "manual",
        "label": "Geração de Prompt Manual (Tier 2)",
        "model": None,
    }


def get_llm(
    temperature: float = 0.0,
    model_openai: str = "gpt-4o-mini",
    model_gemini: str = DEFAULT_GEMINI_API_MODEL,
    adapter: Optional[Any] = None,
) -> Optional[ResilientLLM]:
    """Retorna adaptador ResilientLLM configurado prioritariamente com Google Gemini (`gemini-3.8-flash`)."""
    if adapter is not None:
        return (
            adapter
            if isinstance(adapter, ResilientLLM)
            else ResilientLLM(adapter, retry_delay=0.0)
        )

    google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()

    if google_key or openai_key:
        from langchain_openai import ChatOpenAI
        if google_key:
            llm = ChatOpenAI(
                model=model_gemini,
                openai_api_key=google_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                temperature=temperature,
                max_retries=1,
                timeout=30.0,
            )
        else:
            llm = ChatOpenAI(model=model_openai, temperature=temperature, max_retries=1, timeout=30.0)
        return ResilientLLM(llm, max_attempts=2, retry_delay=2.0)

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

    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        res = _try_parse(fence_match.group(1))
        if res is not None:
            return res

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
    tier1_antigravity_fn: Optional[Callable[[str, str], Optional[str]]] = None,
    tier2_manual_prompt_fn: Optional[Callable[[str, str], Optional[str]]] = None,
) -> Any:
    """
    Cadeia de execução Gemini para síntese estruturada (`BrandDesignSpec` / `ClientConfig`):
    1. Adaptador injetado (Testes/Custom)
    2. Tier 1A: Gemini CLI / Antigravity CLI (Headless)
    3. Tier 1B: API Oficial Google Gemini (`gemini-3.8-flash`)
    4. Tier 2: Geração do Prompt Completo para Intervenção Manual + Extração Analítica Contextual
    """
    if adapter is not None:
        set_last_execution_provider("adapter", "Adaptador LLM Injetado")
        set_last_manual_prompt("")
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

    # TIER 1A: Gemini CLI / Antigravity CLI Headless
    raw_tier1 = None
    if tier1_antigravity_fn is not None:
        raw_tier1 = tier1_antigravity_fn(user_prompt, system_prompt)
    elif is_antigravity_cli_available():
        print("[LLM Gateway] Acionando Tier 1A: Gemini CLI / Antigravity CLI...")
        json_instruction = (
            f"{user_prompt}\n\n"
            f"IMPORTANTE: Retorne APENAS um objeto JSON válido correspondente ao schema {schema_class.__name__}."
        )
        raw_tier1 = invoke_antigravity_cli(
            prompt=json_instruction, system_prompt=system_prompt, timeout=60.0
        )

    if raw_tier1:
        parsed = extract_json_from_text(raw_tier1)
        if parsed is not None:
            cli_label = "Gemini CLI (Headless)" if find_gemini_cli_path() else "Antigravity CLI (Headless)"
            set_last_execution_provider("antigravity_cli", cli_label)
            set_last_manual_prompt("")
            try:
                return schema_class.model_validate(parsed)
            except Exception:
                return parsed

    # TIER 1B: API Oficial Google Gemini (gemini-3.8-flash) quando executando em produção
    if tier1_antigravity_fn is None and os.environ.get("GOOGLE_API_KEY", "").strip():
        try:
            print(f"[LLM Gateway] Acionando Tier 1B: API Google Gemini ({DEFAULT_GEMINI_API_MODEL})...")
            api_llm = get_llm(temperature=temperature, model_gemini=DEFAULT_GEMINI_API_MODEL)
            if api_llm is not None:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            f"{user_prompt}\n\n"
                            f"IMPORTANTE: Retorne ESTRITAMENTE um objeto JSON válido correspondente ao schema {schema_class.__name__}."
                        ),
                    },
                ]
                raw_api_res = api_llm.invoke(messages)
                content = raw_api_res.content if hasattr(raw_api_res, "content") else str(raw_api_res)
                parsed = extract_json_from_text(content)
                if parsed is not None:
                    set_last_execution_provider(
                        "google_gemini_api",
                        f"API Google Gemini ({DEFAULT_GEMINI_API_MODEL})",
                    )
                    set_last_manual_prompt("")
                    try:
                        return schema_class.model_validate(parsed)
                    except Exception:
                        return parsed
        except Exception as api_err:
            print(f"[LLM Gateway] Aviso na chamada API Google Gemini ({DEFAULT_GEMINI_API_MODEL}): {api_err}")

    # TIER 2: Geração do Prompt Completo para Intervenção Manual + Extração Analítica Contextual
    print(
        f"[LLM Gateway] Tier 1 não concluiu resposta estruturada. "
        f"Acionando Tier 2: Gerando prompt estruturado e síntese contextual para {schema_class.__name__}..."
    )
    if tier2_manual_prompt_fn is not None:
        manual_prompt = tier2_manual_prompt_fn(user_prompt, system_prompt) or ""
    else:
        manual_prompt = build_manual_prompt(
            system_prompt=system_prompt,
            user_prompt=f"{user_prompt}\n\nRetorne o resultado estritamente no formato JSON correspondente ao schema {schema_class.__name__}.",
            target_file=f"{schema_class.__name__}.json",
        )

    set_last_execution_provider(
        "manual_prompt_generated",
        f"Motor Analítico Contextual + Gemini ({DEFAULT_GEMINI_API_MODEL})",
    )
    set_last_manual_prompt(manual_prompt)

    if fallback_fn is not None:
        return fallback_fn()

    return None


def generate_code(
    system_prompt: str,
    user_prompt: str,
    validator_fn: Optional[Callable[[str], bool]] = None,
    fallback_fn: Optional[Callable[[], str]] = None,
    adapter: Optional[Callable[[str, str], Optional[str]]] = None,
    tier1_antigravity_fn: Optional[Callable[[str, str], Optional[str]]] = None,
    tier2_manual_prompt_fn: Optional[Callable[[str, str], Optional[str]]] = None,
) -> Optional[str]:
    """
    Cadeia de execução Gemini para geração de código (`LandingPage.jsx`):
    1. Adaptador injetado
    2. Tier 1A: Gemini CLI / Antigravity CLI (Headless)
    3. Tier 1B: API Oficial Google Gemini (`gemini-3.8-flash`)
    4. Tier 2: Geração do Prompt Estruturado para IDE + Gerador Multi-Arquétipo
    """
    if adapter is not None:
        raw_code = adapter(system_prompt, user_prompt)
        cleaned = strip_code_fences(raw_code) if raw_code else None
        if cleaned and (validator_fn is None or validator_fn(cleaned)):
            set_last_execution_provider("adapter", "Adaptador de Código Injetado")
            set_last_manual_prompt("")
            return cleaned
        return fallback_fn() if fallback_fn else None

    # TIER 1A: Gemini CLI / Antigravity CLI Headless
    raw_tier1 = None
    if tier1_antigravity_fn is not None:
        raw_tier1 = tier1_antigravity_fn(user_prompt, system_prompt)
    elif is_antigravity_cli_available():
        print("[LLM Gateway] Acionando Tier 1A: Gemini CLI / Antigravity CLI para geração de código...")
        raw_tier1 = invoke_antigravity_cli(
            prompt=user_prompt, system_prompt=system_prompt, timeout=90.0
        )

    if raw_tier1:
        cleaned = strip_code_fences(raw_tier1)
        if cleaned and (validator_fn is None or validator_fn(cleaned)):
            cli_label = "Gemini CLI (Headless)" if find_gemini_cli_path() else "Antigravity CLI (Headless)"
            set_last_execution_provider("antigravity_cli", cli_label)
            set_last_manual_prompt("")
            return cleaned

    # TIER 1B: API Oficial Google Gemini (gemini-3.8-flash)
    if tier1_antigravity_fn is None and os.environ.get("GOOGLE_API_KEY", "").strip():
        try:
            print(f"[LLM Gateway] Acionando Tier 1B: API Google Gemini ({DEFAULT_GEMINI_API_MODEL}) para geração de código...")
            api_llm = get_llm(temperature=0.2, model_gemini=DEFAULT_GEMINI_API_MODEL)
            if api_llm is not None:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
                raw_api_res = api_llm.invoke(messages)
                content = raw_api_res.content if hasattr(raw_api_res, "content") else str(raw_api_res)
                cleaned = strip_code_fences(content)
                if cleaned and (validator_fn is None or validator_fn(cleaned)):
                    set_last_execution_provider(
                        "google_gemini_api",
                        f"API Google Gemini ({DEFAULT_GEMINI_API_MODEL})",
                    )
                    set_last_manual_prompt("")
                    return cleaned
        except Exception as api_err:
            print(f"[LLM Gateway] Aviso na geração de código via API Google Gemini ({DEFAULT_GEMINI_API_MODEL}): {api_err}")

    # TIER 2: Geração do Prompt Completo para Intervenção Manual + Gerador Multi-Arquétipo
    print(
        "[LLM Gateway] Tier 1 indisponível ou não concluiu código válido. "
        "Acionando Tier 2: Gerando prompt estruturado e arquétipo customizado..."
    )
    if tier2_manual_prompt_fn is not None:
        manual_prompt = tier2_manual_prompt_fn(user_prompt, system_prompt) or ""
    else:
        manual_prompt = build_manual_prompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            target_file="LandingPage.jsx",
        )

    set_last_execution_provider(
        "manual_prompt_generated",
        f"Gerador Multi-Arquétipo + Prompt Gemini ({DEFAULT_GEMINI_API_MODEL})",
    )
    set_last_manual_prompt(manual_prompt)

    if fallback_fn is not None:
        return fallback_fn()

    return None


# Compatibilidade retroativa com aliases legados
invoke_code_llm = generate_code
