import os
from typing import Any, Callable, Dict, Optional
from dotenv import load_dotenv

# Carrega variáveis de ambiente da raiz e do diretório ai_software_factory
_ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_ROOT_DIR, ".env"))
load_dotenv(os.path.join(_ROOT_DIR, "ai_software_factory", ".env"))

# Re-exporta Módulos Canônicos de Domínio (Niche Profiles e Intake)
from ai_software_factory.niche_profiles import resolve_niche_profile, strip_accents
from ai_software_factory.intake_parser import (
    extract_branding_from_report,
    parse_lead_briefing,
)

# Re-exporta Seam de LLM e Gateway Resiliente
from ai_software_factory.llm_gateway import (
    ResilientLLM,
    describe_active_llm,
    extract_json_from_text,
    generate_code,
    get_llm,
    invoke_code_llm,
    invoke_local_lm_studio_http,
    strip_code_fences,
    synthesize_structured,
)

__all__ = [
    "strip_accents",
    "resolve_niche_profile",
    "parse_lead_briefing",
    "extract_branding_from_report",
    "ResilientLLM",
    "describe_active_llm",
    "get_llm",
    "strip_code_fences",
    "invoke_local_lm_studio_http",
    "invoke_code_llm",
    "synthesize_structured",
    "generate_code",
    "extract_json_from_text",
]
