import json
import os
import re
import time
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def strip_code_fences(code: str) -> str:
    """Remove blocos de formatação markdown (```jsx ... ```) de uma string de código."""
    if not code:
        return ""
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
    if openai_key:
        return {
            "provider": "openai",
            "label": "API OpenAI (gpt-4o-mini)",
            "model": "gpt-4o-mini",
        }
    if google_key:
        return {
            "provider": "google",
            "label": "API Google Gemini (gemini-2.5-flash)",
            "model": "gemini-2.5-flash",
        }
    return {
        "provider": "none",
        "label": "Fallback Heurístico Local (Motor Python)",
        "model": None,
    }


def get_llm(
    temperature: float = 0.0,
    model_openai: str = "gpt-4o-mini",
    model_gemini: str = "gemini-2.5-flash",
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
    elif provider == "openai":
        llm = ChatOpenAI(model=model_openai, temperature=temperature)
    else:
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        llm = ChatOpenAI(
            model=model_gemini,
            openai_api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=temperature,
        )

    return ResilientLLM(llm)


def invoke_local_lm_studio_http(
    system_prompt: str, user_prompt: str, timeout: float = 120.0
) -> Optional[str]:
    """Chama o LM Studio local via HTTP direto com timeout estendido para geração de código JSX."""
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
    local_api_key = os.environ.get("LOCAL_LLM_API_KEY", "").strip()

    urls_to_try = [local_url, "http://127.0.0.1:1234/v1", "http://localhost:1234/v1"]
    seen = set()
    urls_unique = [x for x in urls_to_try if not (x in seen or seen.add(x))]

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

    for url in urls_unique:
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
            # Tentar reparo básico: remover vírgulas no final antes de fechar chaves/colchetes
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
) -> Any:
    """
    Seam aprofundada para obtenção de saídas estruturadas a partir de LLMs.
    Absorve seleção de provedor, limitações do LM Studio local (sem structured output nativo),
    parsing resiliente de JSON, rate limits e fallback determinístico.
    """
    llm = get_llm(temperature=temperature, adapter=adapter)
    if llm is None:
        if fallback_fn is not None:
            return fallback_fn()
        return None

    llm_info = describe_active_llm()
    is_local = (llm_info.get("provider") == "local") and (adapter is None)

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        def _invoke_and_extract() -> Optional[Any]:
            raw_res = llm.invoke(messages)
            content = raw_res.content if hasattr(raw_res, "content") else str(raw_res)
            parsed = extract_json_from_text(content)
            if parsed is not None:
                try:
                    return schema_class.model_validate(parsed)
                except Exception:
                    return parsed
            return None

        if is_local:
            extracted = _invoke_and_extract()
            if extracted is not None:
                return extracted
            if fallback_fn is not None:
                return fallback_fn()
            return None
        else:
            try:
                structured_llm = llm.with_structured_output(schema_class)
                res = structured_llm.invoke(messages)
                if isinstance(res, schema_class):
                    return res
                if hasattr(res, "model_dump"):
                    return schema_class.model_validate(res.model_dump())
                if isinstance(res, dict):
                    return schema_class.model_validate(res)
                # Se o adapter/modelo retornou texto ou wrapper de texto
                content = res.content if hasattr(res, "content") else str(res)
                parsed = extract_json_from_text(content)
                if parsed:
                    return schema_class.model_validate(parsed)
                return res
            except Exception as ex_structured:
                # Fallback: tentar chamada direta com parsing resiliente de texto
                extracted = _invoke_and_extract()
                if extracted is not None:
                    return extracted
                raise ex_structured

    except Exception as e:
        print(f"[LLM Gateway] Falha na síntese estruturada: {e}")
        if fallback_fn is not None:
            return fallback_fn()
        raise e


def generate_code(
    system_prompt: str,
    user_prompt: str,
    validator_fn: Optional[Callable[[str], bool]] = None,
    fallback_fn: Optional[Callable[[], str]] = None,
    adapter: Optional[Callable[[str, str], Optional[str]]] = None,
) -> Optional[str]:
    """
    Seam aprofundada para geração de código limpo (JSX, HTML, SQL).
    Absorve LM Studio HTTP direto, LLM em nuvem, limpeza de cercas Markdown,
    validação semântica e fallback determinístico.
    """
    raw_code: Optional[str] = None
    if adapter is not None:
        raw_code = adapter(system_prompt, user_prompt)
    else:
        use_local = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
        if use_local:
            raw_code = invoke_local_lm_studio_http(system_prompt, user_prompt)

        if not raw_code:
            llm = get_llm(temperature=0.0)
            if llm is not None and describe_active_llm()["provider"] != "local":
                try:
                    res = llm.invoke(
                        [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ]
                    )
                    raw_code = res.content if hasattr(res, "content") else str(res)
                except Exception as e:
                    print(f"[LLM Gateway] Falha ao chamar LLM em nuvem para código: {e}")

    cleaned = strip_code_fences(raw_code) if raw_code else None

    if cleaned and validator_fn is not None:
        if not validator_fn(cleaned):
            print("[LLM Gateway] Código gerado não atendeu aos critérios de validação.")
            if fallback_fn is not None:
                return fallback_fn()
            return None

    if not cleaned and fallback_fn is not None:
        return fallback_fn()

    return cleaned


# Compatibilidade retroativa com config.invoke_code_llm
invoke_code_llm = generate_code
