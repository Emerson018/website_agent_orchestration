import asyncio
import os
import subprocess
import tempfile
import unittest
from ai_software_factory import agents, rag_pipeline, skill_loader


class FakeSupabaseQuery:
    def __init__(self, table_name, store):
        self.table_name = table_name
        self.store = store
        self.updated_payload = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def single(self):
        return self

    def update(self, payload):
        self.updated_payload = payload
        self.store.setdefault("updates", []).append(payload)
        return self

    def execute(self):
        class Res:
            pass

        r = Res()
        r.data = self.store.get(self.table_name)
        return r


class FakeSupabaseClient:
    def __init__(self, data):
        self.data = data

    def table(self, name):
        return FakeSupabaseQuery(name, self.data)


class TestAgentsAndRagSeams(unittest.TestCase):
    def test_skill_loader_loads_frontend_design_and_stop_slop(self):
        planning_prompt = skill_loader.get_design_planning_skill_prompt()
        coding_prompt = skill_loader.get_frontend_coding_skill_prompt(
            {
                "theme": "light",
                "primary_color": "#0EA5E9",
                "secondary_color": "#0284C7",
                "bg_color": "#F8FAFC",
                "surface_color": "#FFFFFF",
                "text_color": "#0F172A",
                "muted_color": "#475569",
                "font_heading": "Plus Jakarta Sans",
                "font_body": "Source Sans 3",
                "layout_concept": "Split-hero editorial claro",
                "focal_element": "Tipografia humanista sobre superfície branca",
                "design_critique": "Sem fundo escuro genérico",
                "copy_tone": "Direto e acolhedor",
            }
        )
        self.assertIn("Approach this as the design lead", planning_prompt)
        self.assertIn("Eliminate predictable AI writing patterns", planning_prompt)
        self.assertIn("Spend your boldness in one place", coding_prompt)
        self.assertIn("--surface-color", coding_prompt)
        self.assertIn("Plus Jakarta Sans", coding_prompt)

    def test_generate_fallback_rag_report_uses_canonical_niche_profile_and_design_direction(self):
        report = rag_pipeline.generate_fallback_rag_report(
            "Barbearia Navalha Real", "Corte clássico e barba com toalha quente"
        )
        self.assertIn("Barbearia & Estilo Masculino", report)
        self.assertIn("#D4AF37", report)
        self.assertIn("Playfair Display", report)
        branding = rag_pipeline.extract_branding_from_report(report, "Barbearia Navalha Real")
        self.assertEqual(branding["primary_color_hex"], "#D4AF37")
        self.assertEqual(branding["surface_color_hex"], "#26221F")
        self.assertEqual(branding["font_heading"], "Playfair Display")
        self.assertEqual(branding["font_body"], "Work Sans")
        self.assertTrue(len(branding["layout_concept"]) > 10)
        self.assertTrue(len(branding["focal_element"]) > 10)

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
                f.write("<html><head><title>Old</title></head><body></body></html>")
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

            captured_prompts = {}

            def capturing_code_adapter(sys_p: str, usr_p: str):
                captured_prompts["system"] = sys_p
                captured_prompts["user"] = usr_p
                return "import React from 'react';\nexport default function LandingPage() { return <div>Sorriso</div>; }"

            injected = agents.code_injector_node(
                state,
                code_llm_adapter=capturing_code_adapter,
            )
            state.update(injected)

            # Verify skill_loader was injected into the code generation prompt
            self.assertIn("Approach this as the design lead", captured_prompts["system"])
            self.assertIn("NÃO crie tags `<header>`, `<nav>` ou `<footer>` duplicadas", captured_prompts["system"])

            # Verify CSS semantic tokens and fonts were injected
            css_path = os.path.join(
                state["target_project_path"], "frontend", "src", "index.css"
            )
            with open(css_path, "r", encoding="utf-8") as f:
                css_content = f.read()
            self.assertIn("--primary-color: #0EA5E9;", css_content)
            self.assertIn("--bg-color: #F8FAFC;", css_content)
            self.assertIn("--surface-color: #FFFFFF;", css_content)
            self.assertIn("--font-display: 'Plus Jakarta Sans'", css_content)

            # Verify Google Fonts were injected into index.html
            html_path = os.path.join(
                state["target_project_path"], "frontend", "index.html"
            )
            with open(html_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            self.assertIn("fonts.googleapis.com/css2", html_content)
            self.assertIn("Plus+Jakarta+Sans", html_content)

            # Verify QA validator with stub command runner
            def stub_runner(cmd: str, cwd: str):
                return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="built", stderr="")

            qa_res = agents.qa_validator_node(state, command_runner=stub_runner)
            self.assertTrue(qa_res["build_success"])
            self.assertEqual(qa_res["qa_attempts"], 1)

    def test_fallback_landing_page_uses_semantic_tokens_and_avoids_duplicate_header(self):
        jsx = agents.generate_fallback_landing_page_code(
            app_name="Sorriso Perfeito",
            primary_color="#0EA5E9",
            secondary_color="#0284C7",
            mensagem="Clínica odontológica Sorriso Perfeito",
        )
        self.assertIn("var(--bg-color)", jsx)
        self.assertIn("var(--surface-color)", jsx)
        self.assertNotIn("<header", jsx)
        self.assertNotIn("<footer", jsx)
        self.assertNotIn("→", jsx)

    def test_collect_contact_briefing_and_run_pipeline_without_vector_rag(self):
        fake_store = {
            "contacts": {
                "id": "contact-123",
                "name": "Clínica Sorriso Real",
                "email": "contato@sorrisoreal.com",
                "phone": "(51) 99999-1111",
                "company": "Sorriso Real Odontologia",
                "additional_data": {
                    "texts": [{"label": "Briefing", "text": "Especialistas em clareamento e alinhadores"}],
                    "links": [],
                    "files": [],
                },
            },
            "conversations": [{"id": "conv-1"}],
            "messages": [
                {"sender_type": "contact", "content_text": "Quero um site claro e limpo para minha clínica"}
            ],
            "contact_notes": [{"note_text": "Cliente prefere tons de azul claro"}],
        }
        fake_sb = FakeSupabaseClient(fake_store)

        class StubDesignLLM:
            def with_structured_output(self, schema, **kwargs):
                return self

            def invoke(self, messages, **kwargs):
                return {
                    "app_name": "Clínica Sorriso Real",
                    "primary_color": "#0EA5E9",
                    "secondary_color": "#0284C7",
                    "bg_color": "#F8FAFC",
                    "surface_color": "#FFFFFF",
                    "text_color": "#0F172A",
                    "muted_color": "#475569",
                    "theme": "light",
                    "font_heading": "Plus Jakarta Sans",
                    "font_body": "Source Sans 3",
                }

        asyncio.run(
            rag_pipeline.run_rag_analysis_pipeline(
                contact_id="contact-123",
                supabase_client=fake_sb,
                llm_adapter=StubDesignLLM(),
            )
        )

        updates = fake_store.get("updates", [])
        self.assertTrue(any(u.get("rag_status") == "completed" for u in updates))
        completed_update = [u for u in updates if u.get("rag_status") == "completed"][-1]
        branding = completed_update["additional_data"]["branding"]
        self.assertEqual(branding["theme"], "light")
        self.assertEqual(branding["primary_color_hex"], "#0EA5E9")
        self.assertEqual(branding["surface_color_hex"], "#FFFFFF")
        self.assertFalse(hasattr(rag_pipeline, "get_embed_model"))
        self.assertFalse(hasattr(rag_pipeline, "chunk_text"))


if __name__ == "__main__":
    unittest.main()
