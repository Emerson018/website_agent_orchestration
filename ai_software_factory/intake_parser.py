import json
import re
from typing import Any, Dict, List
from ai_software_factory.niche_profiles import (
    LAYOUT_ARCHETYPES,
    resolve_niche_profile,
    select_layout_archetype,
)


def extract_services_from_context(
    context: str, fallback_services: List[Dict[str, str]]
) -> List[Dict[str, str]]:
    """
    Extrai serviços, pratos, procedimentos ou especialidades reais mencionados nas
    mensagens de WhatsApp, notas de CRM, briefings ou links do cliente.
    """
    if not context or not context.strip():
        return [
            {
                "name": s.get("name", "Atendimento"),
                "price": s.get("price", "Sob consulta"),
                "description": s.get("desc", s.get("description", "")),
                "badge": "Especialidade",
            }
            for s in fallback_services
        ]

    extracted: List[Dict[str, str]] = []
    seen_names = set()

    # Padrão 1: Linhas com preço explícito (ex: "Corte na Tesoura - R$ 65: acabamento na navalha")
    price_line_pattern = re.compile(
        r"(?:^|[\n•\-*])\s*([A-ZÀ-Ú0-9][^\n:|—\-]{2,48}?)\s*(?:[-—:|]\s*)?(R\$\s*\d+(?:[.,]\d{2})?)\s*(?:[-—:|]\s*([^\n]+))?",
        re.MULTILINE,
    )
    for match in price_line_pattern.finditer(context):
        raw_name = match.group(1).strip(" -•*:")
        price = match.group(2).strip()
        desc = (match.group(3) or "").strip(" -•*.")
        norm_name = raw_name.lower()
        if (
            len(raw_name) >= 3
            and norm_name not in seen_names
            and not any(
                skip in norm_name
                for skip in ["setup", "mensal", "total", "investimento", "ficha do cliente"]
            )
        ):
            seen_names.add(norm_name)
            extracted.append(
                {
                    "name": raw_name,
                    "price": price,
                    "description": desc
                    or f"Atendimento de {raw_name} realizado com hora marcada e preparo dedicado.",
                    "badge": "Destaque da Casa",
                }
            )

    # Padrão 2: Itens listados após "Serviços:", "Especialidades:", "Cardápio:", "Procedimentos:"
    section_match = re.search(
        r"(?:servi[çc]os|especialidades|card[áa]pio|procedimentos|cortes|tratamentos)\s*[:\-]\s*([^\n]+)",
        context,
        re.IGNORECASE,
    )
    if section_match and len(extracted) < 3:
        items_raw = re.split(r"[,;/•]|\be\b", section_match.group(1))
        for item in items_raw:
            clean_item = item.strip(" .-*")
            if 3 <= len(clean_item) <= 45 and clean_item.lower() not in seen_names:
                seen_names.add(clean_item.lower())
                extracted.append(
                    {
                        "name": clean_item[:1].upper() + clean_item[1:],
                        "price": "Sob consulta",
                        "description": f"Sessão dedicada de {clean_item.lower()} com agendamento online direto.",
                        "badge": "Sob medida",
                    }
                )
                if len(extracted) >= 4:
                    break

    if len(extracted) >= 2:
        return extracted[:4]

    # Completa com os serviços do perfil do setor contextualizados ao estabelecimento
    result = list(extracted)
    for idx, s in enumerate(fallback_services):
        name = s.get("name", "Atendimento")
        if name.lower() not in seen_names:
            result.append(
                {
                    "name": name,
                    "price": s.get("price", "Sob consulta"),
                    "description": s.get("desc", s.get("description", "")),
                    "badge": "Mais procurado" if idx == 0 else "Hora marcada",
                }
            )
        if len(result) >= 3:
            break
    return result


def extract_contextual_brand_insights(
    contact_name: str, context: str, profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analisa o conteúdo consolidado do cliente (ficha, conversas do WhatsApp, notas,
    links raspados e documentos) para construir uma especificação de marca autoral,
    específica e livre de frases genéricas.
    """
    clean_name = (contact_name or "Estabelecimento").strip()
    raw_text = (context or "").strip()

    archetype_info = select_layout_archetype(
        clean_name, raw_text, profile.get("niche_key", "servicos")
    )
    real_services = extract_services_from_context(raw_text, profile.get("services", []))

    # Extrai trechos relevantes enviados pelo cliente ou anotados no CRM
    meaningful_snippets: List[str] = []
    for line in raw_text.splitlines():
        cleaned = re.sub(r"^\[[^\]]+\]:\s*", "", line).strip()
        if (
            len(cleaned) >= 18
            and not cleaned.startswith("Nome:")
            and not cleaned.startswith("http")
            and "Ficha do Cliente" not in cleaned
        ):
            meaningful_snippets.append(cleaned)

    context_summary = (
        " ".join(meaningful_snippets[:3])[:320].strip()
        if meaningful_snippets
        else ""
    )

    service_names = [s["name"] for s in real_services[:3]]
    services_joined = ", ".join(service_names[:-1]) + f" e {service_names[-1]}" if len(service_names) > 1 else (service_names[0] if service_names else "atendimento especializado")

    brand_essence = (
        f"{clean_name} posiciona-se no segmento de {profile['niche']} combinando "
        f"domínio técnico em {services_joined} com uma atmosfera {profile['vibe'].lower()}. "
        + (f"Contexto capturado do cliente: {context_summary}" if context_summary else "")
    ).strip()

    value_proposition = (
        f"Oferecer {services_joined} no {clean_name} com agendamento digital sem fila de espera, "
        f"preparo prévio da equipe e transparência de valores e horários."
    )

    target_audience = (
        f"Clientes de {clean_name} que buscam {services_joined.lower()} com pontualidade, "
        f"atendimento personalizado e confirmação imediata pelo celular ou computador."
    )

    brand_pillars = [
        f"Especialização em {service_names[0] if service_names else profile['niche']} com padrão consistente de entrega",
        f"Arquitetura visual {archetype_info['label']} desenhada para leitura rápida e decisão imediata",
        "Reserva online integrada em tempo real com confirmação direta de data e horário",
    ]

    return {
        "app_name": clean_name,
        "niche": profile["niche"],
        "rag_niche": profile["rag_niche"],
        "primary_color": profile["primary_color"],
        "secondary_color": profile["secondary_color"],
        "bg_color": profile["bg_color"],
        "surface_color": profile["surface_color"],
        "border_color": profile.get("border_color", "#2E2924"),
        "text_color": profile["text_color"],
        "muted_color": profile["muted_color"],
        "theme": profile["theme"],
        "font_heading": profile["font_heading"],
        "font_body": profile["font_body"],
        "tagline": profile["hero_title"],
        "brand_essence": brand_essence,
        "value_proposition": value_proposition,
        "target_audience": target_audience,
        "brand_pillars": brand_pillars,
        "real_services": real_services,
        "color_reasoning": (
            f"Paleta '{profile['palette_name']}' ({profile['primary_color']} sobre {profile['bg_color']}) "
            f"calibrada para sustentar a identidade de {clean_name} em tema {profile['theme']}."
        ),
        "layout_archetype": archetype_info["id"],
        "layout_concept": f"{archetype_info['label']}: {archetype_info['description']}",
        "focal_element": profile["focal_element"],
        "design_critique": profile["design_critique"],
        "copy_tone": profile["copy_tone"],
        "section_blueprint": archetype_info["section_blueprint"],
        "recommended_sections": archetype_info["section_blueprint"],
    }


def parse_lead_briefing(lead_raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai os campos estruturados de um Lead Briefing e constrói o BrandDesignSpec
    completo aplicando extração contextual, arquétipo de layout único e dados da análise de marca.
    """
    mensagem = lead_raw.get("mensagem", "") or ""
    briefing_payload = lead_raw.get("briefing_payload") or {}
    brand_spec_payload = (
        briefing_payload.get("brand_direction")
        or briefing_payload.get("branding")
        or {}
    )

    match_name = (
        re.search(r"negócio chamado '([^']+)'", mensagem)
        or re.search(r"Estabelecimento / Marca\*\*:\s*'([^']+)'", mensagem)
        or re.search(r"chamada '([^']+)'", mensagem)
        or re.search(r"chamado '([^']+)'", mensagem)
    )
    app_name = (
        lead_raw.get("app_name")
        or briefing_payload.get("project_name")
        or (match_name.group(1) if match_name else "AppCustomizado")
    )

    profile = resolve_niche_profile(mensagem, app_name=app_name)
    contextual = extract_contextual_brand_insights(app_name, mensagem, profile)
    extracted_from_text = extract_branding_from_report(mensagem, contact_name=app_name)

    match_primary = re.search(
        r"(?:Cor principal|Cor Primária|Cor Primaria|cor_primaria_hex)[^#\n\r]*:\s*\"?(#[a-fA-F0-9]{6})",
        mensagem,
        re.IGNORECASE,
    ) or re.search(r"#[a-fA-F0-9]{6}", mensagem)

    if lead_raw.get("primary_color"):
        primary_color = lead_raw["primary_color"]
    elif brand_spec_payload.get("primary_color") or brand_spec_payload.get("primary_color_hex"):
        primary_color = brand_spec_payload.get("primary_color") or brand_spec_payload.get("primary_color_hex")
    elif match_primary:
        primary_color = (
            match_primary.group(1) if match_primary.groups() else match_primary.group(0)
        )
    else:
        primary_color = profile["primary_color"]

    match_secondary = re.search(
        r"(?:Cor secundária|Cor Secundaria|cor_secundaria_hex)[^#\n\r]*:\s*\"?(#[a-fA-F0-9]{6})",
        mensagem,
        re.IGNORECASE,
    )
    if lead_raw.get("secondary_color"):
        secondary_color = lead_raw["secondary_color"]
    elif brand_spec_payload.get("secondary_color") or brand_spec_payload.get("secondary_color_hex"):
        secondary_color = brand_spec_payload.get("secondary_color") or brand_spec_payload.get("secondary_color_hex")
    elif match_secondary:
        secondary_color = match_secondary.group(1)
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

    layout_archetype = (
        lead_raw.get("layout_archetype")
        or brand_spec_payload.get("layout_archetype")
        or extracted_from_text.get("layout_archetype")
        or contextual["layout_archetype"]
    )
    archetype_obj = LAYOUT_ARCHETYPES.get(layout_archetype, LAYOUT_ARCHETYPES["editorial_asymmetric"])

    return {
        "app_name": app_name,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "bg_color": lead_raw.get("bg_color")
        or brand_spec_payload.get("bg_color")
        or brand_spec_payload.get("bg_color_hex")
        or extracted_from_text.get("bg_color_hex")
        or profile["bg_color"],
        "surface_color": lead_raw.get("surface_color")
        or brand_spec_payload.get("surface_color")
        or brand_spec_payload.get("surface_color_hex")
        or extracted_from_text.get("surface_color_hex")
        or profile["surface_color"],
        "text_color": lead_raw.get("text_color")
        or brand_spec_payload.get("text_color")
        or brand_spec_payload.get("text_color_hex")
        or extracted_from_text.get("text_color_hex")
        or profile["text_color"],
        "muted_color": lead_raw.get("muted_color")
        or brand_spec_payload.get("muted_color")
        or brand_spec_payload.get("muted_color_hex")
        or extracted_from_text.get("muted_color_hex")
        or profile["muted_color"],
        "theme": lead_raw.get("theme")
        or brand_spec_payload.get("theme")
        or extracted_from_text.get("theme")
        or profile["theme"],
        "font_heading": lead_raw.get("font_heading")
        or brand_spec_payload.get("font_heading")
        or extracted_from_text.get("font_heading")
        or profile["font_heading"],
        "font_body": lead_raw.get("font_body")
        or brand_spec_payload.get("font_body")
        or extracted_from_text.get("font_body")
        or profile["font_body"],
        "logo_url": logo_url,
        "address": address,
        "working_hours": working_hours,
        "phone": phone,
        "niche": lead_raw.get("niche") or brand_spec_payload.get("niche") or profile["niche"],
        "tagline": lead_raw.get("tagline") or brand_spec_payload.get("tagline") or profile["hero_title"],
        "brand_essence": lead_raw.get("brand_essence")
        or brand_spec_payload.get("brand_essence")
        or extracted_from_text.get("brand_essence")
        or contextual["brand_essence"],
        "value_proposition": lead_raw.get("value_proposition")
        or brand_spec_payload.get("value_proposition")
        or extracted_from_text.get("value_proposition")
        or contextual["value_proposition"],
        "target_audience": lead_raw.get("target_audience")
        or brand_spec_payload.get("target_audience")
        or extracted_from_text.get("target_audience")
        or contextual["target_audience"],
        "brand_pillars": lead_raw.get("brand_pillars")
        or brand_spec_payload.get("brand_pillars")
        or extracted_from_text.get("brand_pillars")
        or contextual["brand_pillars"],
        "real_services": lead_raw.get("real_services")
        or brand_spec_payload.get("real_services")
        or extracted_from_text.get("real_services")
        or contextual["real_services"],
        "color_reasoning": lead_raw.get("color_reasoning")
        or brand_spec_payload.get("color_reasoning")
        or contextual["color_reasoning"],
        "layout_archetype": layout_archetype,
        "layout_concept": lead_raw.get("layout_concept")
        or brand_spec_payload.get("layout_concept")
        or extracted_from_text.get("layout_concept")
        or contextual["layout_concept"],
        "focal_element": lead_raw.get("focal_element")
        or brand_spec_payload.get("focal_element")
        or extracted_from_text.get("focal_element")
        or profile["focal_element"],
        "design_critique": lead_raw.get("design_critique")
        or brand_spec_payload.get("design_critique")
        or extracted_from_text.get("design_critique")
        or profile["design_critique"],
        "copy_tone": lead_raw.get("copy_tone")
        or brand_spec_payload.get("copy_tone")
        or extracted_from_text.get("copy_tone")
        or profile["copy_tone"],
        "section_blueprint": lead_raw.get("section_blueprint")
        or brand_spec_payload.get("section_blueprint")
        or archetype_obj["section_blueprint"],
        "recommended_sections": lead_raw.get("recommended_sections")
        or brand_spec_payload.get("section_blueprint")
        or archetype_obj["section_blueprint"],
    }


def extract_branding_from_report(report: str, contact_name: str = "") -> Dict[str, Any]:
    """
    Extrai a Design Direction completa (paleta de 6 cores, tema, tipografia, arquétipo de layout,
    essência e serviços reais) de um Dossiê de Marca (Markdown ou JSON), recorrendo à análise
    contextual quando ausentes.
    """
    profile = resolve_niche_profile(report or "", app_name=contact_name)
    contextual = extract_contextual_brand_insights(contact_name, report or "", profile)
    palette_name = "Definida via Direção de Marca Gemini"
    primary_hex = None
    secondary_hex = None
    bg_hex = None
    surface_hex = None
    text_hex = None
    muted_hex = None
    theme = None
    font_heading = None
    font_body = None
    layout_archetype = None
    layout_concept = None
    focal_element = None
    design_critique = None
    copy_tone = None
    brand_essence = None
    value_proposition = None
    target_audience = None
    execution_engine = None

    json_match = re.search(r"```json\s*(\{.*?\})\s*```", report or "", re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            theme = data.get("tema") or data.get("theme")
            paleta = data.get("paleta_cores", {})
            primary_hex = paleta.get("cor_primaria_hex") or data.get("primary_color")
            secondary_hex = paleta.get("cor_secundaria_hex") or data.get("secondary_color")
            bg_hex = paleta.get("cor_fundo_hex") or data.get("bg_color")
            surface_hex = paleta.get("cor_superficie_hex") or data.get("surface_color")
            text_hex = paleta.get("cor_texto_hex") or data.get("text_color")
            muted_hex = paleta.get("cor_texto_secundario_hex") or data.get("muted_color")

            tipografia = data.get("tipografia", {})
            font_heading = tipografia.get("fonte_titulos") or data.get("font_heading")
            font_body = tipografia.get("fonte_corpo") or data.get("font_body")

            direcao = data.get("direcao_design", {})
            layout_archetype = direcao.get("arquetipo_layout") or data.get("layout_archetype")
            layout_concept = direcao.get("conceito_layout") or data.get("layout_concept")
            focal_element = direcao.get("elemento_focal") or data.get("focal_element")
            design_critique = direcao.get("critica_anti_cliche") or data.get("design_critique")
            copy_tone = direcao.get("tom_escrita") or data.get("copy_tone")
            brand_essence = data.get("essencia_marca") or data.get("brand_essence")
            value_proposition = data.get("proposta_valor") or data.get("value_proposition")
            target_audience = data.get("publico_alvo") or data.get("target_audience")
        except Exception:
            pass

    if not execution_engine:
        eng_match = re.search(r"Motor de IA Utilizado\*\*:\s*`?([^`\n]+)`?", report or "") or re.search(
            r"Motor de Processamento\*\*:\s*`?([^`\n]+)`?", report or ""
        )
        if eng_match:
            execution_engine = eng_match.group(1).strip()

    if not primary_hex:
        primary_match = re.search(
            r"(?:Cor Primária|Primária)[^#\n\r]*:\s*`?(#[a-fA-F0-9]{6})",
            report or "",
            re.IGNORECASE,
        )
        if primary_match:
            primary_hex = primary_match.group(1)

    if not secondary_hex:
        secondary_match = re.search(
            r"(?:Cor Secundária|Secundária)[^#\n\r]*:\s*`?(#[a-fA-F0-9]{6})",
            report or "",
            re.IGNORECASE,
        )
        if secondary_match:
            secondary_hex = secondary_match.group(1)

    if not bg_hex:
        bg_match = re.search(r"Fundo\s*`?(#[a-fA-F0-9]{6})", report or "", re.IGNORECASE)
        if bg_match:
            bg_hex = bg_match.group(1)

    if not surface_hex:
        surf_match = re.search(r"Superfície\s*`?(#[a-fA-F0-9]{6})", report or "", re.IGNORECASE)
        if surf_match:
            surface_hex = surf_match.group(1)

    if not text_hex:
        txt_match = re.search(r"Texto\s*`?(#[a-fA-F0-9]{6})", report or "", re.IGNORECASE)
        if txt_match:
            text_hex = txt_match.group(1)

    if not muted_hex:
        muted_match = re.search(r"Secundário\s*`?(#[a-fA-F0-9]{6})", report or "", re.IGNORECASE)
        if muted_match:
            muted_hex = muted_match.group(1)

    if not theme:
        theme_match = re.search(r"Tema Padrão\*\*:\s*`?(light|dark)`?", report or "", re.IGNORECASE)
        if theme_match:
            theme = theme_match.group(1).lower()

    if not font_heading:
        fh_match = re.search(r"Títulos em\s*\*\*([^*,\n]+)\*\*", report or "") or re.search(
            r"Títulos em\s*([^,\n.]+)", report or ""
        )
        if fh_match:
            font_heading = fh_match.group(1).strip()

    if not font_body:
        fb_match = re.search(r"Corpo em\s*\*\*([^*.\n]+)\*\*", report or "") or re.search(
            r"Corpo em\s*([^.\n]+)", report or ""
        )
        if fb_match:
            font_body = fb_match.group(1).strip()

    if not layout_archetype:
        arch_match = re.search(
            r"Arquétipo de Layout\*\*:\s*`?([a-z_]+)`?", report or "", re.IGNORECASE
        )
        if arch_match and arch_match.group(1) in LAYOUT_ARCHETYPES:
            layout_archetype = arch_match.group(1)

    if not primary_hex:
        primary_hex = profile["primary_color"]
        secondary_hex = secondary_hex or profile["secondary_color"]
        palette_name = profile["palette_name"]

    if not secondary_hex:
        secondary_hex = "#1E293B"

    chosen_archetype = layout_archetype or contextual["layout_archetype"]
    archetype_obj = LAYOUT_ARCHETYPES.get(chosen_archetype, LAYOUT_ARCHETYPES["editorial_asymmetric"])

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
        "layout_archetype": chosen_archetype,
        "layout_concept": layout_concept or contextual["layout_concept"],
        "focal_element": focal_element or profile["focal_element"],
        "design_critique": design_critique or profile["design_critique"],
        "copy_tone": copy_tone or profile["copy_tone"],
        "brand_essence": brand_essence or contextual["brand_essence"],
        "value_proposition": value_proposition or contextual["value_proposition"],
        "target_audience": target_audience or contextual["target_audience"],
        "brand_pillars": contextual["brand_pillars"],
        "real_services": contextual["real_services"],
        "section_blueprint": archetype_obj["section_blueprint"],
        "execution_engine": execution_engine or "API Google Gemini (gemini-3.8-flash)",
    }


extract_brand_direction = extract_branding_from_report
