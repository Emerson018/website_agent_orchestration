import os
import re
from typing import Any, Dict, Optional

_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_FRONTEND_DESIGN_SKILL_PATH = os.path.join(
    _ROOT_DIR, ".agents", "skills", "frontend-design", "SKILL.md"
)
_STOP_SLOP_SKILL_PATH = os.path.join(_ROOT_DIR, "stop_slop.md")


def _strip_yaml_frontmatter(markdown_text: str) -> str:
    """Remove o cabeçalho YAML frontmatter (--- ... ---) de um arquivo SKILL.md."""
    if not markdown_text:
        return ""
    return re.sub(r"\A---\s*\r?\n.*?\r?\n---\s*\r?\n?", "", markdown_text, count=1, flags=re.DOTALL).strip()


def load_skill_markdown(abs_or_rel_path: str) -> str:
    """Lê um arquivo Markdown de skill do repositório e retorna o corpo sem frontmatter."""
    path = (
        abs_or_rel_path
        if os.path.isabs(abs_or_rel_path)
        else os.path.join(_ROOT_DIR, abs_or_rel_path)
    )
    if not os.path.exists(path):
        return ""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return _strip_yaml_frontmatter(f.read())
    except Exception:
        return ""


def get_frontend_design_skill() -> str:
    """Carrega o conteúdo oficial de .agents/skills/frontend-design/SKILL.md."""
    return load_skill_markdown(_FRONTEND_DESIGN_SKILL_PATH)


def get_stop_slop_skill() -> str:
    """Carrega o conteúdo oficial de stop_slop.md."""
    return load_skill_markdown(_STOP_SLOP_SKILL_PATH)


def get_web_design_guidelines_summary() -> str:
    """
    Diretrizes essenciais da skill web-design-guidelines aplicáveis na geração
    de código React + Tailwind CSS.
    """
    return (
        "## Web Interface & Accessibility Guidelines (Complemento)\n"
        "- Contraste legível garantido entre `--bg-color`/`--surface-color` e `--text-color`/`--muted-color`.\n"
        "- Estados de foco de teclado explícitos (`focus-visible:outline-none focus-visible:ring-2`).\n"
        "- Áreas de toque em botões e links interativos com altura mínima confortável no mobile (`py-3` / `min-h-[44px]`).\n"
        "- Largura de linha de leitura contínua limitada a menos de 80 caracteres (`max-w-prose` ou `max-w-2xl`).\n"
        "- Respeito a movimento reduzido: evite animações não acionadas pelo usuário espalhadas por todos os cards."
    )


def get_design_planning_skill_prompt() -> str:
    """
    Monta o bloco de instruções da skill `/frontend-design` + `stop-slop` para o
    Passe 1 (Planejamento e Crítica da Design Direction antes de gerar código).
    """
    frontend_skill = get_frontend_design_skill()
    stop_slop = get_stop_slop_skill()

    return (
        "=== SKILL OBRIGATÓRIA: FRONTEND DESIGN (PASSE 1 — DESIGN DIRECTION & AUTO-CRÍTICA) ===\n"
        f"{frontend_skill}\n\n"
        "=== SKILL COMPLEMENTAR: STOP SLOP (ESCRITA HUMANA E DIRETA) ===\n"
        f"{stop_slop}\n\n"
        "=== REGRAS DE EXECUÇÃO DO PASSE 1 (DESIGN DIRECTION) ===\n"
        "1. Fundamente todas as decisões na matéria-prima real do negócio do cliente (materiais, ambiente físico, vocabulário do setor).\n"
        "2. Defina uma paleta semântica de 6 cores HEX (`primary_color`, `secondary_color`, `bg_color`, `surface_color`, `text_color`, `muted_color`) coerente com a polaridade (`theme`: 'light' ou 'dark').\n"
        "3. Escolha deliberadamente `font_heading` e `font_body` (Google Fonts) com personalidade distinta para o nicho.\n"
        "4. Especifique o `layout_concept` (alinhamento, estrutura editorial/assimétrica/grade) e um único `focal_element` memorável ('Spend your boldness in one place').\n"
        "5. Execute a revisão crítica (`design_critique`): rejeite os 5 tells de IA listados na skill (creme #F4F1EA + terracota #D97757 sem relação com o briefing, fundo quase preto genérico para clínicas claras, SaaS-card kit de 3 cards idênticos, eyebrows ALL-CAPS em cada seção e setas '→' anexadas a botões)."
    )


def get_frontend_coding_skill_prompt(
    design_direction: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Monta o bloco de instruções da skill `/frontend-design` + `stop-slop` +
    `web-design-guidelines` para o Passe 2 (Geração e Edição de Código JSX/CSS).
    """
    frontend_skill = get_frontend_design_skill()
    stop_slop = get_stop_slop_skill()
    web_guidelines = get_web_design_guidelines_summary()

    direction_block = ""
    if design_direction:
        direction_block = (
            "\n=== DESIGN DIRECTION APROVADA NO PASSE 1 (OBRIGATÓRIO SEGUIR) ===\n"
            f"- Tema (`theme`): {design_direction.get('theme', 'dark')}\n"
            f"- Paleta Semântica (CSS Variables disponíveis em :root):\n"
            f"  * `--primary-color`: {design_direction.get('primary_color', '#E55A1B')}\n"
            f"  * `--secondary-color`: {design_direction.get('secondary_color', '#1E293B')}\n"
            f"  * `--bg-color`: {design_direction.get('bg_color', '#0E0D0C')}\n"
            f"  * `--surface-color`: {design_direction.get('surface_color', '#181614')}\n"
            f"  * `--text-color`: {design_direction.get('text_color', '#F5F4F0')}\n"
            f"  * `--muted-color`: {design_direction.get('muted_color', '#A8A29E')}\n"
            f"- Tipografia Google Fonts injetada:\n"
            f"  * Display/Títulos (`font-display` / `--font-display`): {design_direction.get('font_heading', 'Playfair Display')}\n"
            f"  * Corpo (`font-sans` / `--font-sans`): {design_direction.get('font_body', 'Inter')}\n"
            f"- Conceito de Layout (`layout_concept`): {design_direction.get('layout_concept', 'Composição autoral orientada ao assunto do negócio')}\n"
            f"- Elemento Focal Único (`focal_element`): {design_direction.get('focal_element', 'Hero tipográfico e imagético característico do setor')}\n"
            f"- Revisão Anti-Clichê (`design_critique`): {design_direction.get('design_critique', 'Evitar SaaS-card kit genérico, eyebrows ALL-CAPS repetitivos e setas em botões')}\n"
            f"- Tom de Voz (`copy_tone`): {design_direction.get('copy_tone', 'Direto, específico e em voz ativa na perspectiva do cliente')}\n"
        )

    return (
        "=== SKILL OBRIGATÓRIA: FRONTEND DESIGN (PASSE 2 — CONSTRUÇÃO DE INTERFACE) ===\n"
        f"{frontend_skill}\n\n"
        "=== SKILL COMPLEMENTAR: STOP SLOP (UX WRITING & COPY) ===\n"
        f"{stop_slop}\n\n"
        f"{web_guidelines}\n"
        f"{direction_block}"
    )
