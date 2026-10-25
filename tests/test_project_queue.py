import unittest
from ai_software_factory import project_queue


class FakeQueueStore:
    def __init__(self, items):
        self.items = {item["id"]: dict(item) for item in items}

    def fetch_next(self, project_id=None):
        if project_id is not None:
            return self.items.get(project_id)
        for item in self.items.values():
            if item.get("status") == "pendente":
                return item
        return None

    def update(self, project_id, patch):
        self.items[project_id].update(patch)


class TestProjectQueue(unittest.TestCase):
    def test_process_queue_item_preserves_crm_ownership_metadata_and_stores_workspace_path(self):
        store = FakeQueueStore(
            [
                {
                    "id": 42,
                    "status": "pendente",
                    "mensagem_lead": "Negócio chamado 'Sorriso Perfeito'",
                    "supabase_url": "https://tenant.supabase.co",
                    "supabase_anon_key": "anon-123",
                    "resultado_json": {
                        "account_id": "acc-1",
                        "user_id": "usr-1",
                        "contact_id": "cnt-99",
                        "project_name": "Sorriso Perfeito",
                    },
                }
            ]
        )

        def fake_workflow_runner(initial_state):
            return {
                "build_success": True,
                "target_project_path": "workspace/sorriso_perfeito",
                "customization_requirements": {
                    "app_name": "Sorriso Perfeito",
                    "primary_color": "#0EA5E9",
                },
            }

        res = project_queue.process_queue_item(store, fake_workflow_runner, project_id=42)
        self.assertEqual(res["status"], "sucesso")

        updated_row = store.items[42]
        self.assertEqual(updated_row["status"], "concluido")
        # Must preserve CRM ownership & contact link while adding build output
        self.assertEqual(updated_row["resultado_json"]["contact_id"], "cnt-99")
        self.assertEqual(updated_row["resultado_json"]["account_id"], "acc-1")
        self.assertEqual(updated_row["resultado_json"]["project_name"], "Sorriso Perfeito")
        self.assertEqual(updated_row["resultado_json"]["primary_color"], "#0EA5E9")
        self.assertEqual(
            updated_row["resultado_json"]["target_project_path"],
            "workspace/sorriso_perfeito",
        )

    def test_process_queue_item_records_execution_provider_in_resultado_json(self):
        store = FakeQueueStore(
            [
                {
                    "id": 101,
                    "status": "pendente",
                    "mensagem_lead": "Hamburgueria Marcianos",
                    "resultado_json": {"project_name": "Marcianos"},
                }
            ]
        )

        def fake_workflow_runner(initial_state):
            return {
                "build_success": True,
                "target_project_path": "workspace/Marcianos",
                "customization_requirements": {"app_name": "Marcianos"},
                "provedor_execucao": "antigravity_cli",
            }

        res = project_queue.process_queue_item(store, fake_workflow_runner, project_id=101)
        self.assertEqual(res["status"], "sucesso")
        updated_row = store.items[101]
        self.assertEqual(updated_row["resultado_json"]["provedor_execucao"], "antigravity_cli")

    def test_process_queue_item_transitions_to_falha_critica_on_build_failure(self):
        store = FakeQueueStore(
            [
                {
                    "id": 102,
                    "status": "pendente",
                    "mensagem_lead": "Lead com erro",
                    "resultado_json": {"project_name": "ErroTest"},
                }
            ]
        )

        def failing_workflow_runner(initial_state):
            return {
                "build_success": False,
                "execution_logs": ["Erro no build"],
            }

        with self.assertRaises(RuntimeError):
            project_queue.process_queue_item(store, failing_workflow_runner, project_id=102)

        updated_row = store.items[102]
        self.assertEqual(updated_row["status"], "falha_critica")
        self.assertIn("error_details", updated_row["resultado_json"])


if __name__ == "__main__":
    unittest.main()
