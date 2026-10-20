import os
import tempfile
import unittest
from ai_software_factory import workspace_provisioner


class TestWorkspaceProvisioner(unittest.TestCase):
    def test_sanitize_and_resolve_workspace_path_case_insensitive(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            existing = os.path.join(tmpdir, "Sorriso_Perfeito")
            os.makedirs(existing)

            slug = workspace_provisioner.sanitize_workspace_slug("Sorriso Perfeito!")
            self.assertEqual(slug, "sorriso_perfeito")

            resolved = workspace_provisioner.resolve_workspace_path(
                "Sorriso Perfeito", workspace_root=tmpdir
            )
            self.assertEqual(os.path.normcase(resolved), os.path.normcase(existing))

    def test_validate_and_sanitize_sql_blocks_destructive_ddl(self):
        safe_sql = "CREATE TABLE IF NOT EXISTS agendamentos (id serial primary key);"
        self.assertEqual(workspace_provisioner.validate_and_sanitize_sql(safe_sql), safe_sql)

        dangerous_sql = "DROP TABLE agendamentos;"
        sanitized = workspace_provisioner.validate_and_sanitize_sql(dangerous_sql)
        self.assertTrue(sanitized.startswith("-- SQL descartado"))

    def test_deploy_tenant_database_uses_canonical_sql_param_and_sanitizes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_dir = os.path.join(tmpdir, "database")
            os.makedirs(db_dir)
            with open(os.path.join(db_dir, "base_schema.sql"), "w", encoding="utf-8") as f:
                f.write("CREATE TABLE clientes (id uuid primary key);")
            with open(os.path.join(db_dir, "ai_extension_schema.sql"), "w", encoding="utf-8") as f:
                f.write("DROP TABLE clientes;")

            recorded_calls = []

            def fake_rpc_adapter(url: str, key: str, payload: dict):
                recorded_calls.append((url, key, payload))

            result = workspace_provisioner.deploy_tenant_database(
                project_path=tmpdir,
                supabase_url="my-tenant-id",
                supabase_key="service-role-secret",
                rpc_adapter=fake_rpc_adapter,
            )

            self.assertTrue(result["success"])
            # Normalizes bare project ref to https://<ref>.supabase.co
            self.assertEqual(recorded_calls[0][0], "https://my-tenant-id.supabase.co")
            # Uses canonical {"sql": ...} parameter
            self.assertEqual(
                recorded_calls[0][2],
                {"sql": "CREATE TABLE clientes (id uuid primary key);"},
            )
            # Second file had DROP TABLE so it was sanitized to a comment and not executed as destructive SQL
            self.assertEqual(len(recorded_calls), 1)


if __name__ == "__main__":
    unittest.main()
