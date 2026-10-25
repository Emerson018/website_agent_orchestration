import pytest
from unittest.mock import patch, MagicMock
from ai_software_factory import antigravity_runner


def test_antigravity_cli_availability_detection():
    # When agy is present in path or specific location
    with patch("shutil.which", return_value="C:\\path\\to\\agy.exe"):
        assert antigravity_runner.is_antigravity_cli_available() is True

    # When agy is absent
    with patch("shutil.which", return_value=None), patch("os.path.exists", return_value=False):
        assert antigravity_runner.is_antigravity_cli_available() is False


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
