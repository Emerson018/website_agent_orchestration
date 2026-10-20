import asyncio
import os
import subprocess
import tempfile
import unittest
from ai_software_factory import agents, rag_pipeline


class TestAgentsAndRagSeams(unittest.TestCase):
    def test_generate_fallback_rag_report_uses_canonical_niche_profile(self):
        report = rag_pipeline.generate_fallback_rag_report(
            "Barbearia Navalha Real", "Corte clássico e barba com toalha quente"
        )
        self.assertIn("Barbearia & Estilo Masculino", report)
        self.assertIn("#D4AF37", report)
        branding = rag_pipeline.extract_branding_from_report(report, "Barbearia Navalha Real")
        self.assertEqual(branding["primary_color_hex"], "#D4AF37")

    def test_code_injector_and_qa_validator_with_injected_seams(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            template_dir = os.path.join(tmpdir, "template")
            os.makedirs(os.path.join(template_dir, "frontend", "src", "pages"))
            os.makedirs(os.path.join(template_dir, "supabase_schema"))

            with open(
                os.path.join(template_dir, "frontend", "src", "App.jsx"),
                "w",
                encoding="utf-8",
            ) as f:
                f.write(
                    "import BookingPage from './pages/BookingPage';\n"
                    "const routes = [{ index: true, element: <BookingPage /> }];"
                )
            with open(
                os.path.join(template_dir, "frontend", "index.html"),
                "w",
                encoding="utf-8",
            ) as f:
                f.write("<html><head><title>Old</title></head></html>")
            with open(
                os.path.join(template_dir, "frontend", "src", "index.css"),
                "w",
                encoding="utf-8",
            ) as f:
                f.write(".custom { color: red; }")
            with open(
                os.path.join(template_dir, "supabase_schema", "base_schema.sql"),
                "w",
                encoding="utf-8",
            ) as f:
                f.write("CREATE TABLE test_table (id int);")

            workspace_root = os.path.join(tmpdir, "workspace")
            state = {
                "lead_raw_json": {"mensagem": "Clínica Sorriso Perfeito"},
                "customization_requirements": {
                    "app_name": "Sorriso Perfeito",
                    "primary_color": "#0EA5E9",
                    "secondary_color": "#0284C7",
                },
                "template_path": template_dir,
                "target_project_path": "",
                "qa_attempts": 0,
                "max_qa_attempts": 3,
                "last_qa_report": {},
                "build_success": False,
                "execution_logs": [],
            }

            cloned = agents.infra_cloner_node(state, workspace_root=workspace_root)
            state.update(cloned)
            self.assertTrue(os.path.isdir(state["target_project_path"]))

            injected = agents.code_injector_node(
                state,
                code_llm_adapter=lambda s, u: "import React from 'react';\nexport default function LandingPage() { return <div>Sorriso</div>; }",
            )
            state.update(injected)

            # Verify CSS theme and LandingPage were injected
            css_path = os.path.join(
                state["target_project_path"], "frontend", "src", "index.css"
            )
            with open(css_path, "r", encoding="utf-8") as f:
                css_content = f.read()
            self.assertIn("--primary-color: #0EA5E9;", css_content)
            self.assertIn("--bg-color: #F8FAFC;", css_content)

            # Verify QA validator with stub command runner
            def stub_runner(cmd: str, cwd: str):
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="built", stderr="")

            qa_res = agents.qa_validator_node(state, command_runner=stub_runner)
            self.assertTrue(qa_res["build_success"])
            self.assertEqual(qa_res["qa_attempts"], 1)


if __name__ == "__main__":
    unittest.main()
