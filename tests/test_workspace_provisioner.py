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

    def test_run_frontend_build_installs_when_declared_dependency_missing_from_existing_node_modules(self):
        import json
        import subprocess

        with tempfile.TemporaryDirectory() as tmpdir:
            frontend_dir = os.path.join(tmpdir, "frontend")
            # node_modules already exists (e.g. from an older template snapshot),
            # and has 'react' installed, but 'framer-motion' in package.json is missing.
            os.makedirs(os.path.join(frontend_dir, "node_modules", "react"))
            with open(os.path.join(frontend_dir, "package.json"), "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "name": "20barranove-frontend",
                        "dependencies": {
                            "react": "^18.2.0",
                            "framer-motion": "^14.6.0",
                        },
                    },
                    f,
                )

            executed_commands = []

            def fake_runner(cmd: str, cwd: str) -> subprocess.CompletedProcess:
                executed_commands.append(cmd)
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="ok", stderr="")

            res = workspace_provisioner.run_frontend_build(tmpdir, command_runner=fake_runner)
            self.assertTrue(res["build_success"])
            self.assertEqual(executed_commands, ["npm install", "npm run build"])


    def test_provision_modular_tenant_stack_creates_frontend_and_backend_guardrails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create mock template sources
            mock_frontend = os.path.join(tmpdir, "mock_frontend")
            mock_backend = os.path.join(tmpdir, "mock_backend")
            os.makedirs(os.path.join(mock_frontend, "src"))
            os.makedirs(os.path.join(mock_backend, "routes"))

            with open(os.path.join(mock_frontend, "package.json"), "w", encoding="utf-8") as f:
                f.write('{"name": "frontend"}')
            with open(os.path.join(mock_backend, "security.js"), "w", encoding="utf-8") as f:
                f.write('export function setupSecurityGuardrails() {}')
            with open(os.path.join(mock_backend, "server.js"), "w", encoding="utf-8") as f:
                f.write('import express from "express";')

            dest_root = os.path.join(tmpdir, "workspace")
            project_path = workspace_provisioner.provision_modular_tenant_stack(
                app_name="Pizzaria Bella",
                frontend_template_path=mock_frontend,
                backend_blueprint_path=mock_backend,
                workspace_root=dest_root,
            )

            self.assertTrue(os.path.isdir(os.path.join(project_path, "frontend")))
            self.assertTrue(os.path.isdir(os.path.join(project_path, "backend")))
            self.assertTrue(os.path.isdir(os.path.join(project_path, "database")))
            self.assertTrue(os.path.isfile(os.path.join(project_path, "backend", "security.js")))
            self.assertTrue(os.path.isfile(os.path.join(project_path, "contexto_arquitetura.md")))


if __name__ == "__main__":
    unittest.main()
