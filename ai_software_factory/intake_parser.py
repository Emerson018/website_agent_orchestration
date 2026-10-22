import json
import re
from typing import Any, Dict
from ai_software_factory.niche_profiles import resolve_niche_profile


def parse_lead_briefing(lead_raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai os campos estruturados de um Lead Briefing e constrói a Design Direction
    completa aplicando o Niche Profile como base e preservando dados do RAG quando presentes.
    """
    mensagem = lead_raw.get("mensagem", "") or ""

    match_name = (
        re.search(r"negócio chamado '([^']+)'", mensagem)
        or re.search(r"Estabelecimento / Marca\*\*:\s*'([^']+)'", mensagem)
        or re.search(r"chamada '([^']+)'", mensagem)
        or re.search(r"chamado '([^']+)'", mensagem)
    )
    app_name = match_name.group(1) if match_name else lead_raw.get("app_name", "AppCustomizado")

    profile = resolve_niche_profile(mensagem, app_name=app_name)
    rag_extracted = extract_branding_from_report(mensagem, contact_name=app_name)

    match_primary = re.search(
        r"(?:Cor principal|Cor Primária|Cor Primaria|cor_primaria_hex)[^#\n\r]*:\s*\"?(#[a-fA-F0-9]{6})",
        mensagem,
        re.IGNORECASE,
    ) or re.search(r"#[a-fA-F0-9]{6}", mensagem)

    if match_primary:
        primary_color = (
            match_primary.group(1) if match_primary.groups() else match_primary.group(0)
        )
    else:
        primary_color = lead_raw.get("primary_color") or profile["primary_color"]

    match_secondary = re.search(
        r"(?:Cor secundária|Cor Secundaria|cor_secundaria_hex)[^#\n\r]*:\s*\"?(#[a-fA-F0-9]{6})",
        mensagem,
        re.IGNORECASE,
    )
    if match_secondary:
        secondary_color = match_secondary.group(1)
    elif lead_raw.get("secondary_color"):
        secondary_color = lead_raw["secondary_color"]
    else:
        secondary_color = "#000000" if primary_color.upper() == "#FFFFFF" else "#1A1A1A"

    logo_match = re.search(r"https?://[^\s\"']+\.(?:png|jpg|jpeg|webp)", mensagem)
    logo_url = logo_match.group(0) if logo_match else (lead_raw.get("logo_url") or "/logo.png")

    phone_match = (
        re.search(r"Telefone:\s*([^\n\r|]+)", mensagem, re.IGNORECASE)
        or re.search(r"Telefone\s*de\s*Contato:\s*([^\n\r|]+)", mensagem, re.IGNORECASE)
        or re.search(r"WhatsApp/Tel:\s*([^\n\r|]+)", mensagem, re.IGNORECASE)
    )
    phone = (
        phone_match.group(1).strip()
        if phone_match
        else (lead_raw.get("phone") or "(51) 99999-9999")
    )

    address_match = re.search(r"Endereço:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    address = (
        address_match.group(1).strip()
        if address_match
        else (lead_raw.get("address") or "Av. Principal, 1000 - Centro - Porto Alegre/RS")
    )

    hours_match = re.search(r"Funcionamento:\s*([^\n\r]+)", mensagem, re.IGNORECASE) or re.search(
        r"Horários?:\s*([^\n\r]+)", mensagem, re.IGNORECASE
    )
    working_hours = (
        hours_match.group(1).strip()
        if hours_match
        else (lead_raw.get("working_hours") or "Segunda a Sábado das 9h às 18h")
    )

    return {
        "app_name": app_name,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "bg_color": lead_raw.get("bg_color") or rag_extracted.get("bg_color_hex") or profile["bg_color"],
        "surface_color": lead_raw.get("surface_color")
        or rag_extracted.get("surface_color_hex")
        or profile["surface_color"],
        "text_color": lead_raw.get("text_color")
        or rag_extracted.get("text_color_hex")
        or profile["text_color"],
        "muted_color": lead_raw.get("muted_color")
        or rag_extracted.get("muted_color_hex")
        or profile["muted_color"],
        "theme": lead_raw.get("theme") or rag_extracted.get("theme") or profile["theme"],
        "font_heading": lead_raw.get("font_heading")
        or rag_extracted.get("font_heading")
        or profile["font_heading"],
        "font_body": lead_raw.get("font_body")
        or rag_extracted.get("font_body")
        or profile["font_body"],
        "logo_url": logo_url,
        "address": address,
        "working_hours": working_hours,
        "phone": phone,
        "niche": lead_raw.get("niche") or profile["niche"],
        "tagline": lead_raw.get("tagline") or profile["hero_title"],
        "color_reasoning": lead_raw.get("color_reasoning")
        or f"Paleta {profile['palette_name']} ancorada no universo de {profile['niche']}.",
        "layout_concept": lead_raw.get("layout_concept")
        or rag_extracted.get("layout_concept")
        or profile["layout_concept"],
        "focal_element": lead_raw.get("focal_element")
        or rag_extracted.get("focal_element")
        or profile["focal_element"],
        "design_critique": lead_raw.get("design_critique")
        or rag_extracted.get("design_critique")
        or profile["design_critique"],
        "copy_tone": lead_raw.get("copy_tone")
        or rag_extracted.get("copy_tone")
        or profile["copy_tone"],
        "recommended_sections": lead_raw.get("recommended_sections")
        or ["Hero Autoral", "Especialidades e Preços", "Contexto da Casa", "Localização e Horários"],
    }


def extract_branding_from_report(report: str, contact_name: str = "") -> Dict[str, str]:
    """
    Extrai a Design Direction completa (paleta de 6 cores, tema, tipografia e conceito de layout)
    de um relatório RAG (bloco JSON ou Markdown), recorrendo ao Niche Profile quando ausentes.
    """
    profile = resolve_niche_profile(report or "", app_name=contact_name)
    palette_name = "Definida via IA"
    primary_hex = None
    secondary_hex = None
    bg_hex = None
    surface_hex = None
    text_hex = None
    muted_hex = None
    theme = None
    font_heading = None
    font_body = None
    layout_concept = None
    focal_element = None
    design_critique = None
    copy_tone = None

    json_match = re.search(r"```json\s*(\{.*?\})\s*```", report or "", re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            theme = data.get("tema")
            paleta = data.get("paleta_cores", {})
            if paleta.get("cor_primaria_hex"):
                primary_hex = paleta.get("cor_primaria_hex")
            if paleta.get("cor_secundaria_hex"):
                secondary_hex = paleta.get("cor_secundaria_hex")
            if paleta.get("cor_fundo_hex"):
                bg_hex = paleta.get("cor_fundo_hex")
            if paleta.get("cor_superficie_hex"):
                surface_hex = paleta.get("cor_superficie_hex")
            if paleta.get("cor_texto_hex"):
                text_hex = paleta.get("cor_texto_hex")
            if paleta.get("cor_texto_secundario_hex"):
                muted_hex = paleta.get("cor_texto_secundario_hex")

            tipografia = data.get("tipografia", {})
            if tipografia.get("fonte_titulos"):
                font_heading = tipografia.get("fonte_titulos")
            if tipografia.get("fonte_corpo"):
                font_body = tipografia.get("fonte_corpo")

            direcao = data.get("direcao_design", {})
            if direcao.get("conceito_layout"):
                layout_concept = direcao.get("conceito_layout")
            if direcao.get("elemento_focal"):
                focal_element = direcao.get("elemento_focal")
            if direcao.get("critica_anti_cliche"):
                design_critique = direcao.get("critica_anti_cliche")
            if direcao.get("tom_escrita"):
                copy_tone = direcao.get("tom_escrita")
        except Exception:
            pass

    if not primary_hex:
        primary_match = re.search(
            r"(?:Cor Primária|Primária)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})",
            report or "",
            re.IGNORECASE,
        )
        if primary_match:
            primary_hex = primary_match.group(1)

    if not secondary_hex:
        secondary_match = re.search(
            r"(?:Cor Secundária|Secundária)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})",
            report or "",
            re.IGNORECASE,
        )
        if secondary_match:
            secondary_hex = secondary_match.group(1)

    if not primary_hex:
        primary_hex = profile["primary_color"]
        secondary_hex = secondary_hex or profile["secondary_color"]
        palette_name = profile["palette_name"]

    if not secondary_hex:
        secondary_hex = "#1E293B"

    return {
        "palette_name": palette_name,
        "primary_color_hex": primary_hex,
        "secondary_color_hex": secondary_hex,
        "bg_color_hex": bg_hex or profile["bg_color"],
        "surface_color_hex": surface_hex or profile["surface_color"],
        "text_color_hex": text_hex or profile["text_color"],
        "muted_color_hex": muted_hex or profile["muted_color"],
        "theme": theme or profile["theme"],
        "font_heading": font_heading or profile["font_heading"],
        "font_body": font_body or profile["font_body"],
        "layout_concept": layout_concept or profile["layout_concept"],
        "focal_element": focal_element or profile["focal_element"],
        "design_critique": design_critique or profile["design_critique"],
        "copy_tone": copy_tone or profile["copy_tone"],
    }
