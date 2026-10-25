import os
import pytest
from unittest.mock import patch, MagicMock
from pydantic import BaseModel
from ai_software_factory import llm_gateway


class SimpleSchema(BaseModel):
    title: str
    status: str


def test_describe_active_llm_supports_gemini_38_flash():
    with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-google-key", "OPENAI_API_KEY": "", "USE_LOCAL_LLM": "false"}):
        info = llm_gateway.describe_active_llm()
        assert info["provider"] == "google"
        assert info["model"] == "gemini-3.8-flash"


def test_generate_code_tier_1_local_success():
    llm_gateway.set_last_execution_provider("none")
    with patch("ai_software_factory.llm_gateway.invoke_local_lm_studio_http", return_value="export default function App() {}"):
        code = llm_gateway.generate_code(
            system_prompt="sys",
            user_prompt="usr",
            tier1_local_fn=lambda s, u: "export default function App() {}",
        )
        assert code == "export default function App() {}"
        assert llm_gateway.get_last_execution_provider() == "local_lm_studio"


def test_generate_code_tier_2_antigravity_cli_fallback():
    llm_gateway.set_last_execution_provider("none")
    # Tier 1 fails (returns None)
    # Tier 2 succeeds
    code = llm_gateway.generate_code(
        system_prompt="sys",
        user_prompt="usr",
        tier1_local_fn=lambda s, u: None,
        tier2_antigravity_fn=lambda s, u: "export default function AgApp() {}",
    )
    assert code == "export default function AgApp() {}"
    assert llm_gateway.get_last_execution_provider() == "antigravity_cli"


def test_generate_code_tier_3_cloud_api_fallback():
    llm_gateway.set_last_execution_provider("none")
    # Tier 1 fails
    # Tier 2 fails
    # Tier 3 succeeds
    code = llm_gateway.generate_code(
        system_prompt="sys",
        user_prompt="usr",
        tier1_local_fn=lambda s, u: None,
        tier2_antigravity_fn=lambda s, u: None,
        tier3_cloud_fn=lambda s, u: "export default function CloudApp() {}",
    )
    assert code == "export default function CloudApp() {}"
    assert llm_gateway.get_last_execution_provider() == "cloud_gemini_3.8_flash"


def test_generate_code_tier_4_deterministic_fallback_when_all_fail():
    llm_gateway.set_last_execution_provider("none")
    code = llm_gateway.generate_code(
        system_prompt="sys",
        user_prompt="usr",
        tier1_local_fn=lambda s, u: None,
        tier2_antigravity_fn=lambda s, u: None,
        tier3_cloud_fn=lambda s, u: None,
        fallback_fn=lambda: "export default function FallbackApp() {}",
    )
    assert code == "export default function FallbackApp() {}"
    assert llm_gateway.get_last_execution_provider() == "fallback_deterministic"


def test_synthesize_structured_tiered_progression():
    llm_gateway.set_last_execution_provider("none")
    # Test Tier 2 antigravity fallback for structured output
    result = llm_gateway.synthesize_structured(
        system_prompt="sys",
        user_prompt="usr",
        schema_class=SimpleSchema,
        tier1_local_fn=lambda s, u: None,
        tier2_antigravity_fn=lambda s, u: '{"title": "AG Title", "status": "active"}',
    )
    assert isinstance(result, SimpleSchema)
    assert result.title == "AG Title"
    assert llm_gateway.get_last_execution_provider() == "antigravity_cli"
