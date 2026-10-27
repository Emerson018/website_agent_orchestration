import os
import pytest
from unittest.mock import patch, MagicMock
from ai_software_factory import antigravity_runner


def test_antigravity_cli_availability_detection():
    # When agy or antigravity is present
    with patch("shutil.which", return_value="E:\\Antigravity\\bin\\antigravity.cmd"):
        assert antigravity_runner.is_antigravity_cli_available() is True

    # When CLI is absent
    with patch("shutil.which", return_value=None), patch("os.path.exists", return_value=False), patch.dict(os.environ, {"ANTIGRAVITY_CLI_PATH": ""}):
        assert antigravity_runner.is_antigravity_cli_available() is False


def test_antigravity_cli_env_override():
    with patch.dict(os.environ, {"ANTIGRAVITY_CLI_PATH": "C:\\custom\\antigravity.exe"}):
        with patch("os.path.exists", return_value=True):
            assert antigravity_runner.find_antigravity_cli_path() == "C:\\custom\\antigravity.exe"


def test_invoke_antigravity_cli_with_runner_adapter():
    def mock_runner(cmd, timeout):
        assert "--print" in cmd
        assert "--dangerously-skip-permissions" in cmd
        return "```jsx\nexport default function App() { return <div>Antigravity Generated</div>; }\n```"

    result = antigravity_runner.invoke_antigravity_cli(
        prompt="Gere uma landing page",
        system_prompt="Voce e um dev senior",
        timeout=30.0,
        runner_fn=mock_runner,
    )

    assert result is not None
    assert "Antigravity Generated" in result
    assert "```" not in result  # Markdown fences stripped


def test_invoke_antigravity_cli_timeout_handling():
    def hanging_runner(cmd, timeout):
        raise TimeoutError("CLI timed out")

    result = antigravity_runner.invoke_antigravity_cli(
        prompt="Gere landing page",
        timeout=5.0,
        runner_fn=hanging_runner,
    )
    assert result is None


def test_build_manual_prompt_contains_all_directives():
    prompt = antigravity_runner.build_manual_prompt(
        system_prompt="Sistema Sênior Frontend",
        user_prompt="Construa LandingPage.jsx para Barbearia com cor primária #D4AF37",
        target_file="LandingPage.jsx",
        extra_context="Briefing: Atendimento com toalha quente",
    )
    assert "# [MANUAL TASK] Geração de LandingPage.jsx" in prompt
    assert "Sistema Sênior Frontend" in prompt
    assert "Barbearia com cor primária #D4AF37" in prompt
    assert "Briefing: Atendimento com toalha quente" in prompt
    assert "chat do Antigravity" in prompt
