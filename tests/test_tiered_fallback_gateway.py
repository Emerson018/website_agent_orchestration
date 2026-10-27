import os
import pytest
from unittest.mock import patch, MagicMock
from pydantic import BaseModel
from ai_software_factory import llm_gateway


class SimpleSchema(BaseModel):
    title: str
    status: str


def test_generate_code_tier_1_antigravity_cli_success():
    llm_gateway.set_last_execution_provider("none")
    llm_gateway.set_last_manual_prompt("")
    code = llm_gateway.generate_code(
        system_prompt="sys",
        user_prompt="usr",
        tier1_antigravity_fn=lambda p, s: "export default function AgApp() { return <div>Ok</div>; }",
    )
    assert "export default function AgApp()" in code
    assert llm_gateway.get_last_execution_provider() == "antigravity_cli"
    assert llm_gateway.get_last_manual_prompt() == ""


def test_generate_code_tier_2_manual_prompt_generation_when_cli_fails():
    llm_gateway.set_last_execution_provider("none")
    llm_gateway.set_last_manual_prompt("")
    
    # Tier 1 fails (returns None) -> Tier 2 generates full manual prompt and executes fallback if available
    code = llm_gateway.generate_code(
        system_prompt="sys",
        user_prompt="usr",
        tier1_antigravity_fn=lambda p, s: None,
        fallback_fn=lambda: "export default function EmergencyFallback() {}",
    )
    assert code == "export default function EmergencyFallback() {}"
    assert llm_gateway.get_last_execution_provider() == "manual_prompt_generated"
    manual_prompt = llm_gateway.get_last_manual_prompt()
    assert "# [MANUAL TASK]" in manual_prompt
    assert "sys" in manual_prompt
    assert "usr" in manual_prompt


def test_synthesize_structured_tier_1_antigravity_cli_success():
    llm_gateway.set_last_execution_provider("none")
    llm_gateway.set_last_manual_prompt("")
    result = llm_gateway.synthesize_structured(
        system_prompt="sys",
        user_prompt="usr",
        schema_class=SimpleSchema,
        tier1_antigravity_fn=lambda p, s: '{"title": "AG Title", "status": "active"}',
    )
    assert isinstance(result, SimpleSchema)
    assert result.title == "AG Title"
    assert llm_gateway.get_last_execution_provider() == "antigravity_cli"


def test_synthesize_structured_tier_2_manual_prompt_when_cli_fails():
    llm_gateway.set_last_execution_provider("none")
    llm_gateway.set_last_manual_prompt("")
    
    fallback_obj = SimpleSchema(title="Fallback Title", status="offline")
    result = llm_gateway.synthesize_structured(
        system_prompt="sys",
        user_prompt="usr",
        schema_class=SimpleSchema,
        tier1_antigravity_fn=lambda p, s: None,
        fallback_fn=lambda: fallback_obj,
    )
    assert result == fallback_obj
    assert llm_gateway.get_last_execution_provider() == "manual_prompt_generated"
    manual_prompt = llm_gateway.get_last_manual_prompt()
    assert "# [MANUAL TASK]" in manual_prompt
    assert "SimpleSchema" in manual_prompt or "JSON" in manual_prompt


def test_lm_studio_is_completely_excluded():
    # Verify that LM Studio is no longer a dependency or tier in llm_gateway
    assert not hasattr(llm_gateway, "invoke_local_lm_studio_http")
