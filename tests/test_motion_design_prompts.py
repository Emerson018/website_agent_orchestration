import unittest
from ai_software_factory import skill_loader, agents


class TestMotionDesignPromptAndFallback(unittest.TestCase):
    def test_frontend_coding_skill_prompt_includes_motion_design_guidelines(self):
        prompt = skill_loader.get_frontend_coding_skill_prompt({
            "theme": "dark",
            "primary_color": "#E55A1B",
            "font_heading": "Cabinet Grotesk",
            "font_body": "Plus Jakarta Sans",
        })
        # Deve incluir orientações canônicas de Motion Design System (framer-motion)
        self.assertIn("framer-motion", prompt)
        self.assertIn("whileInView", prompt)
        self.assertIn("whileTap", prompt)
        self.assertIn("scroll-mt", prompt)

    def test_design_planning_skill_prompt_includes_motion_direction(self):
        prompt = skill_loader.get_design_planning_skill_prompt()
        self.assertIn("motion", prompt.lower())

    def test_generate_fallback_landing_page_includes_framer_motion_and_scroll_mt(self):
        code = agents.generate_fallback_landing_page_code(
            app_name="Parrilla Fogo",
            primary_color="#E55A1B",
            secondary_color="#181614",
            mensagem="Restaurante de carnes nobres e hamburgueria",
            is_nextjs=False,
            address="Rua dos Andradas, 500",
            working_hours="Terça a Domingo das 18h às 23h30",
            phone="(51) 98888-7777",
            design_direction={
                "tagline": "Fogo de Chão e Parrilla Autêntica",
                "niche": "Gastronomia & Carnes",
            }
        )
        self.assertIn("from 'framer-motion'", code)
        self.assertIn("motion.", code)
        self.assertIn("scroll-mt-24", code)
        self.assertIn('id="inicio"', code)
