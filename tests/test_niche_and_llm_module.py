import unittest
import config


class FakeRateLimitedLLM:
    def __init__(self, fail_times=2, response="ok"):
        self.calls = 0
        self.fail_times = fail_times
        self.response = response

    def invoke(self, input_data, config=None, **kwargs):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise RuntimeError("HTTP 429 RESOURCE_EXHAUSTED quota exceeded")
        return self.response


class TestNicheAndLlmModule(unittest.TestCase):
    def test_resolve_niche_profile_dentistry_and_design_direction_tokens(self):
        briefing = "Clínica Sorriso Perfeito com avaliação digital e notificação automática."
        profile = config.resolve_niche_profile(briefing, app_name="Sorriso Perfeito")

        self.assertEqual(profile["niche_key"], "odontologia")
        self.assertEqual(profile["primary_color"], "#0EA5E9")
        self.assertEqual(profile["bg_color"], "#F8FAFC")
        self.assertEqual(profile["surface_color"], "#FFFFFF")
        self.assertEqual(profile["text_color"], "#0F172A")
        self.assertEqual(profile["muted_color"], "#475569")
        self.assertEqual(profile["theme"], "light")
        self.assertEqual(profile["font_heading"], "Plus Jakarta Sans")
        self.assertEqual(profile["font_body"], "Source Sans 3")
        self.assertTrue(len(profile["layout_concept"]) > 10)
        self.assertTrue(len(profile["focal_element"]) > 10)
        self.assertEqual(len(profile["services"]), 3)

    def test_parse_lead_briefing_extracts_explicit_fields_and_full_design_direction(self):
        lead_raw = {
            "mensagem": (
                "Temos um negócio chamado 'Barbearia dos Pampas'.\n"
                "Cor Primária: #B45309\n"
                "Telefone: (51) 98888-7777\n"
                "Endereço: Rua da Praia, 500\n"
                "Horários: Terça a Sábado das 10h às 20h"
            )
        }
        reqs = config.parse_lead_briefing(lead_raw)
        self.assertEqual(reqs["app_name"], "Barbearia dos Pampas")
        self.assertEqual(reqs["primary_color"], "#B45309")
        self.assertEqual(reqs["secondary_color"], "#1A1A1A")
        self.assertEqual(reqs["bg_color"], "#1C1917")
        self.assertEqual(reqs["surface_color"], "#26221F")
        self.assertEqual(reqs["font_heading"], "Playfair Display")
        self.assertEqual(reqs["phone"], "(51) 98888-7777")
        self.assertEqual(reqs["address"], "Rua da Praia, 500")
        self.assertEqual(reqs["working_hours"], "Terça a Sábado das 10h às 20h")

    def test_extract_branding_from_report_json_and_fallback(self):
        report_with_json = """
### ⚙️ 3. Configuração de Arquitetura
```json
{
  "tema": "light",
  "paleta_cores": {
    "cor_primaria_hex": "#10B981",
    "cor_secundaria_hex": "#065F46",
    "cor_fundo_hex": "#ECFDF5",
    "cor_superficie_hex": "#FFFFFF",
    "cor_texto_hex": "#064E3B",
    "cor_texto_secundario_hex": "#047857"
  },
  "tipografia": {
    "fonte_titulos": "Fraunces",
    "fonte_corpo": "DM Sans"
  },
  "direcao_design": {
    "conceito_layout": "Grade editorial botânica",
    "elemento_focal": "Tipografia Fraunces sobre fundo verde claro",
    "critica_anti_cliche": "Sem cards SaaS idênticos",
    "tom_escrita": "Voz ativa e direta"
  }
}
```
"""
        branding = config.extract_branding_from_report(report_with_json, "Clínica Vida")
        self.assertEqual(branding["primary_color_hex"], "#10B981")
        self.assertEqual(branding["secondary_color_hex"], "#065F46")
        self.assertEqual(branding["bg_color_hex"], "#ECFDF5")
        self.assertEqual(branding["surface_color_hex"], "#FFFFFF")
        self.assertEqual(branding["font_heading"], "Fraunces")
        self.assertEqual(branding["font_body"], "DM Sans")
        self.assertEqual(branding["layout_concept"], "Grade editorial botânica")

        fallback_branding = config.extract_branding_from_report("Relatório sem json", "Pet Feliz")
        self.assertEqual(fallback_branding["primary_color_hex"], "#F97316")
        self.assertEqual(fallback_branding["palette_name"], "Laranja Amigável")

    def test_resilient_llm_retries_on_429_and_succeeds(self):
        fake = FakeRateLimitedLLM(fail_times=2, response="recovered")
        resilient = config.ResilientLLM(fake, max_attempts=4, retry_delay=0.0)
        result = resilient.invoke("hello")
        self.assertEqual(result, "recovered")
        self.assertEqual(fake.calls, 3)

    def test_invoke_code_llm_strips_markdown_fences_via_injected_adapter(self):
        def fake_adapter(sys_prompt: str, usr_prompt: str) -> str:
            return "```jsx\nimport React from 'react';\nexport default function LandingPage() { return <div />; }\n```"

        code = config.invoke_code_llm("sys", "user", adapter=fake_adapter)
        self.assertEqual(
            code,
            "import React from 'react';\nexport default function LandingPage() { return <div />; }",
        )


if __name__ == "__main__":
    unittest.main()
