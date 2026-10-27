import json
import os
import pytest
from unittest.mock import patch, MagicMock
from ai_software_factory import chat_worker


def test_fetch_pending_project_when_queue_has_item(tmp_path):
    queue_file = tmp_path / "local_projetos.json"
    dummy_projects = [
        {"id": 101, "status": "concluido", "mensagem_lead": "Lead 1"},
        {"id": 102, "status": "aguardando_agente", "mensagem_lead": "Lead Barbearia"},
    ]
    queue_file.write_text(json.dumps(dummy_projects), encoding="utf-8")

    with patch.object(chat_worker, "LOCAL_PROJETOS_PATH", str(queue_file)):
        pending = chat_worker.fetch_pending_project()
        assert pending is not None
        assert pending["id"] == 102
        assert pending["mensagem_lead"] == "Lead Barbearia"


def test_complete_project_updates_status_and_metadata(tmp_path):
    queue_file = tmp_path / "local_projetos.json"
    dummy_projects = [
        {"id": 201, "status": "aguardando_agente", "mensagem_lead": "Lead Cafe", "resultado_json": {}}
    ]
    queue_file.write_text(json.dumps(dummy_projects), encoding="utf-8")

    with patch.object(chat_worker, "LOCAL_PROJETOS_PATH", str(queue_file)):
        reqs = {"app_name": "Café Especial", "primary_color": "#78350F"}
        ok = chat_worker.complete_project(
            project_id=201,
            customization_requirements=reqs,
            target_project_path="workspace/cafe_especial",
        )
        assert ok is True

        updated_list = json.loads(queue_file.read_text(encoding="utf-8"))
        updated_item = updated_list[0]
        assert updated_item["status"] == "concluido"
        assert updated_item["resultado_json"]["customization_requirements"]["app_name"] == "Café Especial"
        assert updated_item["resultado_json"]["provedor_execucao"] == "antigravity_chat_agent"
