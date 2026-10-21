import json
import os
import re
import time
import unicodedata
from typing import Any, Callable, Dict, Optional
import httpx
from dotenv import load_dotenv

# Carrega variáveis de ambiente da raiz e do diretório ai_software_factory
_ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_ROOT_DIR, ".env"))
load_dotenv(os.path.join(_ROOT_DIR, "ai_software_factory", ".env"))


def strip_accents(text: str) -> str:
    if not text:
        return ""
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def resolve_niche_profile(text: str, app_name: str = "AppCustomizado") -> Dict[str, Any]:
    """
    Resolve o Niche Profile e a Design Direction canônica para um segmento de mercado
    com base no Lead Briefing e nome do aplicativo.
    """
    display_name = app_name or "AppCustomizado"
    raw_combined = f"{display_name} {text or ''}".lower()
    norm = strip_accents(raw_combined)

    if re.search(
        r"\b(odont|odontologia|dente|dentes|sorriso|dentista|dentistas|saude|clinica|medico|doutor)\b",
        norm,
    ):
        return {
            "niche_key": "odontologia",
            "niche": "Odontologia & Saúde",
            "rag_niche": "Saúde & Odontologia",
            "palette_name": "Azul Clínico Confiável",
            "vibe": "Clínico, Confiável, Limpo e Acolhedor",
            "primary_color": "#0EA5E9",
            "secondary_color": "#0284C7",
            "bg_color": "#F8FAFC",
            "surface_color": "#FFFFFF",
            "border_color": "#E2E8F0",
            "text_color": "#0F172A",
            "muted_color": "#475569",
            "theme": "light",
            "font_heading": "Plus Jakarta Sans",
            "font_body": "Source Sans 3",
            "border_radius": "rounded-xl",
            "button_style": "flat",
            "shadow": "shadow-sm",
            "photo_style": "Imagens iluminadas, ambientes clínicos limpos e sorrisos naturais",
            "layout_concept": "Layout assimétrico claro (split-hero editorial à esquerda com quadro clínico de horários e especialidades estruturadas em lista de precisão, sem cartões SaaS genéricos).",
            "focal_element": "Cabeçalho tipográfico amplo com contraste sereno sobre superfície branca pura e fotografia clínica luminosa em corte vertical.",
            "design_critique": "Rejeitado o fundo escuro padrão de templates gerados por IA e os eyebrows em CAIXA ALTA; adotado fundo clínico claro (#F8FAFC) com tipografia humanista legível.",
            "copy_tone": "Claro, tranquilizador e direto, descrevendo procedimentos odontológicos reais em linguagem simples.",
            "hero_title": f"Cuidado odontológico preciso na {display_name}",
            "hero_desc": f"Atendimento clínico com hora marcada, diagnóstico transparente e tratamentos planejados para a sua saúde bucal.",
            "hero_img": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Clareamento Dental Clínico",
                    "desc": "Protocolo supervisionado em consultório para recuperar a tonalidade natural com proteção ao esmalte.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Alinhadores Ortodônticos",
                    "desc": "Planejamento digital para correção da mordida e alinhamento com placas transparentes removíveis.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Profilaxia e Check-up Preventivo",
                    "desc": "Exame clínico detalhado, remoção de tártaro por ultrassom e acompanhamento periódico.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#F8FAFC] text-[#0F172A]",
            "card_bg": "bg-white border-[#E2E8F0] shadow-sm",
        }
    elif re.search(
        r"\b(barbe|barba|barbearia|barbeiro|corte|navalha|pampas|homem|cabelo|barber)\b",
        norm,
    ):
        return {
            "niche_key": "barbearia",
            "niche": "Barbearia",
            "rag_niche": "Barbearia & Estilo Masculino",
            "palette_name": "Dourado & Ambar Vintage",
            "vibe": "Vintage, Rústico Premium, Tradicional e Elegante",
            "primary_color": "#D4AF37",
            "secondary_color": "#1E293B",
            "bg_color": "#1C1917",
            "surface_color": "#26221F",
            "border_color": "#38322D",
            "text_color": "#FAFAF9",
            "muted_color": "#A8A29E",
            "theme": "dark",
            "font_heading": "Playfair Display",
            "font_body": "Work Sans",
            "border_radius": "rounded-md",
            "button_style": "shadow",
            "shadow": "shadow-md",
            "photo_style": "Fotografia com iluminação quente, tons ambar, textura de madeira e metais artesanais",
            "layout_concept": "Composição editorial inspirada em alfaiataria e barbearia clássica, com tabela de bancada para serviços e preços alinhados à esquerda.",
            "focal_element": "Quadro de serviços em estilo tabela de barbearia tradicional com filetes em latão (#D4AF37) e serifas de alto contraste.",
            "design_critique": "Substituídos os 3 cartões SaaS arredondados idênticos por uma apresentação estruturada de serviços com preços diretos e bordas sóbrias.",
            "copy_tone": "Direto, sóbrio e focado no ofício de bancada: navalha, tesoura, toalha quente e pontualidade.",
            "hero_title": f"Corte na tesoura e barba na navalha na {display_name}",
            "hero_desc": f"Cadeira com hora marcada, toalha quente e acabamento preciso sem fila de espera.",
            "hero_img": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Corte na Tesoura ou Máquina",
                    "desc": "Lavagem, corte ajustado ao formato do rosto e finalização na bancada.",
                    "price": "R$ 60",
                    "img": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Barba com Toalha Quente",
                    "desc": "Alinhamento na navalha com óleo essencial, espuma aquecida e loção pós-barba.",
                    "price": "R$ 50",
                    "img": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Cabelo e Barba Completos",
                    "desc": "Sessão completa de corte, barba na navalha e acabamento de contorno.",
                    "price": "R$ 100",
                    "img": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#1C1917] text-[#FAFAF9]",
            "card_bg": "bg-[#26221F] border-[#38322D]",
        }
    elif re.search(
        r"\b(estetic|estetica|beleza|salao|hair|unha|unhas|spa|maquiagem|sobrancelha)\b",
        norm,
    ):
        return {
            "niche_key": "estetica",
            "niche": "Estética & Beleza",
            "rag_niche": "Estética & Beleza",
            "palette_name": "Rose & Gold Elegante",
            "vibe": "Sofisticado, Minimalista, Delicado e Relaxante",
            "primary_color": "#EC4899",
            "secondary_color": "#F472B6",
            "bg_color": "#FFF1F2",
            "surface_color": "#FFFFFF",
            "border_color": "#FECDD3",
            "text_color": "#1C1917",
            "muted_color": "#57534E",
            "theme": "light",
            "font_heading": "Cormorant Garamond",
            "font_body": "DM Sans",
            "border_radius": "rounded-2xl",
            "button_style": "shadow",
            "shadow": "shadow-sm",
            "photo_style": "Estética clean, detalhes delicados, tons pastel e iluminação de estúdio profissional",
            "layout_concept": "Layout de ateliê com respiro generoso, tipografia serifada editorial e vitrine assimétrica de protocolos faciais e corporais.",
            "focal_element": "Abertura editorial em duas colunas com retrato luminoso e título em Cormorant Garamond.",
            "design_critique": "Evitado o padrão escuro ou saturado de templates SaaS; adotada superfície luminosa (#FFF1F2 / #FFFFFF) com hierarquia tipográfica suave.",
            "copy_tone": "Acolhedor, claro e objetivo sobre cada protocolo de cuidado facial e corporal.",
            "hero_title": f"Cuidado facial e corporal com hora marcada na {display_name}",
            "hero_desc": f"Protocolos de pele, massoterapia e estética realizados em sessões individuais planejadas para você.",
            "hero_img": "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Limpeza de Pele Profunda",
                    "desc": "Higienização, extração suave e máscara calmante adaptada ao seu tipo de pele.",
                    "price": "R$ 150",
                    "img": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Massagem Relaxante Corporal",
                    "desc": "Sessão manual com óleos vegetais para alívio de tensão muscular e descanso.",
                    "price": "R$ 130",
                    "img": "https://images.unsplash.com/photo-1512290900672-1f4a4340d21a?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Protocolo Facial Revitalizante",
                    "desc": "Hidratação intensiva e estímulo de colágeno com dermocosméticos específicos.",
                    "price": "Consulte",
                    "img": "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#FFF1F2] text-[#1C1917]",
            "card_bg": "bg-white border-[#FECDD3] shadow-sm",
        }
    elif re.search(
        r"\b(fogao|campeiro|restaurante|gourmet|comida|pizz|pizzaria|hambur|hamburgueria|cafe|doce|carne|churrasco|culinaria|alimento|refeicao|buffet|marmita|prato)\b",
        norm,
    ):
        return {
            "niche_key": "gastronomia",
            "niche": "Gastronomia",
            "rag_niche": "Gastronomia & Alimentação",
            "palette_name": "Gastronômico Vibrante",
            "vibe": "Artesanal, Regional, Apetitoso e Acolhedor",
            "primary_color": "#EAB308",
            "secondary_color": "#DC2626",
            "bg_color": "#1C1917",
            "surface_color": "#292524",
            "border_color": "#44403C",
            "text_color": "#FAFAF9",
            "muted_color": "#D6D3D1",
            "theme": "dark",
            "font_heading": "Fraunces",
            "font_body": "DM Sans",
            "border_radius": "rounded-xl",
            "button_style": "gradient",
            "shadow": "shadow-lg",
            "photo_style": "Fotografia gastronômica detalhada, contraste marcante e elementos artesanais da culinária",
            "layout_concept": "Apresentação inspirada em cardápio de casa de fogo e brasa, combinando fotografia de prato em destaque com seção de especialidades da cozinha e reserva de mesa.",
            "focal_element": "Vitrine gastronômica estilo menu da casa destacando os cortes e pratos com valores claros e reserva direta de mesa.",
            "design_critique": "Eliminados rótulos genéricos de marketing e estrutura SaaS; o layout prioriza os pratos reais, horários da cozinha e reserva de mesa em poucos cliques.",
            "copy_tone": "Sensorial, direto e focado nos ingredientes, ponto de cocção e hospitalidade da mesa.",
            "hero_title": f"Cozinha de brasa e receitas de família no {display_name}",
            "hero_desc": f"Cortes selecionados, acompanhamentos feitos no dia e mesa garantida para você e seus convidados.",
            "hero_img": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Pratos Típicos da Casa",
                    "desc": "Receitas tradicionais preparadas no fogão com ingredientes frescos do dia.",
                    "price": "R$ 48",
                    "img": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Cortes Assados na Brasa",
                    "desc": "Carnes nobres assadas lentamente e servidas no ponto da sua preferência.",
                    "price": "R$ 85",
                    "img": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Reserva de Mesa para Grupos",
                    "desc": "Escolha o horário e a quantidade de lugares antes de sair de casa.",
                    "price": "Sem taxa",
                    "img": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#1C1917] text-[#FAFAF9]",
            "card_bg": "bg-[#292524] border-[#44403C]",
        }
    elif re.search(
        r"\b(pet|petshop|veterinar|veterinaria|veterinario|vet|cao|caes|gato|gatos|animal|animais|banho|tosa)\b",
        norm,
    ):
        return {
            "niche_key": "pet",
            "niche": "Pet & Veterinária",
            "rag_niche": "Petshop & Clínica Veterinária",
            "palette_name": "Laranja Amigável",
            "vibe": "Alegre, Amigável, Vibrante e Confiável",
            "primary_color": "#F97316",
            "secondary_color": "#EA580C",
            "bg_color": "#FAFAF9",
            "surface_color": "#FFFFFF",
            "border_color": "#FED7AA",
            "text_color": "#1C1917",
            "muted_color": "#57534E",
            "theme": "light",
            "font_heading": "Outfit",
            "font_body": "Plus Jakarta Sans",
            "border_radius": "rounded-2xl",
            "button_style": "flat",
            "shadow": "shadow-md",
            "photo_style": "Fotografia espontânea de animais saudáveis, ambiente alegre e colorido",
            "layout_concept": "Layout claro e caloroso com foco em cuidados por porte e pelagem, facilitando o agendamento rápido de banho, tosa e consulta veterinária.",
            "focal_element": "Bloco principal acolhedor com fotografia viva e guia direto de serviços de higiene e saúde animal.",
            "design_critique": "Evitado tema escuro inadequado para clínica e banho pet; utilizado fundo claro (#FAFAF9) com contraste aconchegante e leitura rápida no celular.",
            "copy_tone": "Próximo, cuidadoso e prático para tutores que buscam segurança para cães e gatos.",
            "hero_title": f"Banho, tosa e cuidado veterinário na {display_name}",
            "hero_desc": f"Atendimento tranquilo com hora marcada para cães e gatos, produtos seguros e equipe atenciosa.",
            "hero_img": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Banho e Tosa Higiênica ou na Tesoura",
                    "desc": "Banho morno com secagem silenciosa, corte de unhas e limpeza de ouvidos.",
                    "price": "R$ 70",
                    "img": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Consulta Veterinária e Vacinação",
                    "desc": "Avaliação clínica completa, atualização de vacinas e orientação preventiva.",
                    "price": "R$ 120",
                    "img": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Hidratação e Desembolo de Pelagem",
                    "desc": "Cuidado específico para pelos longos ou sensíveis com escovação delicada.",
                    "price": "R$ 90",
                    "img": "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#FAFAF9] text-[#1C1917]",
            "card_bg": "bg-white border-[#FED7AA] shadow-sm",
        }
    else:
        return {
            "niche_key": "servicos",
            "niche": "Serviços Especializados",
            "rag_niche": "Serviços Gerais & Tecnologia",
            "palette_name": "Indigo Tech Moderno",
            "vibe": "Moderno, Tecnológico, Dinâmico e Profissional",
            "primary_color": "#6366F1",
            "secondary_color": "#4F46E5",
            "bg_color": "#0F172A",
            "surface_color": "#1E293B",
            "border_color": "#334155",
            "text_color": "#F8FAFC",
            "muted_color": "#94A3B8",
            "theme": "dark",
            "font_heading": "Space Grotesk",
            "font_body": "Plus Jakarta Sans",
            "border_radius": "rounded-xl",
            "button_style": "flat",
            "shadow": "shadow-sm",
            "photo_style": "Interface vetorial minimalista, ícones limpos e estética digital de alta precisão",
            "layout_concept": "Grade assimétrica objetiva com foco em serviços sob hora marcada, endereço e canais diretos de atendimento.",
            "focal_element": "Painel tipográfico de abertura com chamada direta para reserva de horário online.",
            "design_critique": "Removidos jargões genéricos de IA e decorações supérfluas; foco em clareza de escopo, horários e reserva.",
            "copy_tone": "Objetivo, claro e orientado à ação do cliente.",
            "hero_title": f"Atendimento com hora marcada na {display_name}",
            "hero_desc": f"Escolha o serviço e reserve o melhor dia e horário diretamente pelo navegador.",
            "hero_img": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {
                    "name": "Atendimento Individual",
                    "desc": "Sessão dedicada com horário reservado exclusivamente para a sua demanda.",
                    "price": "Sob consulta",
                    "img": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Avaliação e Diagnóstico",
                    "desc": "Análise técnica detalhada com apresentação de etapas e prazos claros.",
                    "price": "Sob consulta",
                    "img": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
                },
                {
                    "name": "Agendamento Online Direto",
                    "desc": "Seleção imediata de data e horário disponível com confirmação automática.",
                    "price": "Online",
                    "img": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
                },
            ],
            "theme_bg": "bg-[#0F172A] text-[#F8FAFC]",
            "card_bg": "bg-[#1E293B] border-[#334155] shadow-lg",
        }


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


class ResilientLLM:
    """
    Wrapper resiliente que intercepta erros de Rate Limit (HTTP 429 / RESOURCE_EXHAUSTED)
    e realiza retentativas com backoff configurável.
    """

    def __init__(self, target_llm: Any, max_attempts: int = 10, retry_delay: float = 35.0):
        self.__dict__["target_llm"] = target_llm
        self.__dict__["max_attempts"] = max_attempts
        self.__dict__["retry_delay"] = retry_delay

    def invoke(self, input_data: Any, config: Any = None, **kwargs: Any) -> Any:
        for i in range(self.max_attempts):
            try:
                if config is not None:
                    return self.target_llm.invoke(input_data, config=config, **kwargs)
                return self.target_llm.invoke(input_data, **kwargs)
            except Exception as e:
                erro_str = str(e)
                is_rate_limit = (
                    "429" in erro_str
                    or "RESOURCE_EXHAUSTED" in erro_str
                    or "quota" in erro_str.lower()
                )
                is_not_found = "404" in erro_str or "not found" in erro_str.lower()

                if is_rate_limit and not is_not_found and i < self.max_attempts - 1:
                    print(
                        f"\n[Rate Limit] Limite de cota detectado. Aguardando {self.retry_delay}s "
                        f"(Tentativa {i + 1}/{self.max_attempts})..."
                    )
                    if self.retry_delay > 0:
                        time.sleep(self.retry_delay)
                else:
                    raise e
        return self.target_llm.invoke(input_data, **kwargs)

    def bind_tools(self, tools: Any, **kwargs: Any) -> "ResilientLLM":
        bound_runnable = self.target_llm.bind_tools(tools, **kwargs)
        return ResilientLLM(
            bound_runnable, max_attempts=self.max_attempts, retry_delay=self.retry_delay
        )

    def with_structured_output(self, schema: Any, **kwargs: Any) -> "ResilientLLM":
        bound_runnable = self.target_llm.with_structured_output(schema, **kwargs)
        return ResilientLLM(
            bound_runnable, max_attempts=self.max_attempts, retry_delay=self.retry_delay
        )

    def __getattr__(self, name: str) -> Any:
        return getattr(self.target_llm, name)


def describe_active_llm() -> Dict[str, Any]:
    """Informa qual provedor LLM está configurado no ambiente atual."""
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")

    if use_local:
        return {
            "provider": "local",
            "label": f"LM Studio Local ({local_model} em {local_url})",
            "model": local_model,
            "base_url": local_url,
        }
    if openai_key:
        return {
            "provider": "openai",
            "label": "API OpenAI (gpt-4o-mini)",
            "model": "gpt-4o-mini",
        }
    if google_key:
        return {
            "provider": "google",
            "label": "API Google Gemini (gemini-2.5-flash)",
            "model": "gemini-2.5-flash",
        }
    return {
        "provider": "none",
        "label": "Fallback Heurístico Local (Motor Python)",
        "model": None,
    }


def get_llm(
    temperature: float = 0.0,
    model_openai: str = "gpt-4o-mini",
    model_gemini: str = "gemini-2.5-flash",
    adapter: Optional[Any] = None,
) -> Optional[ResilientLLM]:
    """
    Retorna a instância unificada de LLM encapsulada em ResilientLLM, ou None se
    nenhum provedor estiver configurado. Aceita um adapter injetado para testes.
    """
    if adapter is not None:
        return (
            adapter
            if isinstance(adapter, ResilientLLM)
            else ResilientLLM(adapter, retry_delay=0.0)
        )

    info = describe_active_llm()
    provider = info["provider"]
    if provider == "none":
        return None

    from langchain_openai import ChatOpenAI

    if provider == "local":
        llm = ChatOpenAI(
            model=info["model"],
            openai_api_key=os.environ.get("LOCAL_LLM_API_KEY", "lm-studio") or "lm-studio",
            base_url=info["base_url"],
            temperature=temperature,
        )
    elif provider == "openai":
        llm = ChatOpenAI(model=model_openai, temperature=temperature)
    else:
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        llm = ChatOpenAI(
            model=model_gemini,
            openai_api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=temperature,
        )

    return ResilientLLM(llm)


def strip_code_fences(code: str) -> str:
    if not code:
        return ""
    cleaned = re.sub(r"^```[a-zA-Z0-9]*\n", "", code.strip())
    cleaned = re.sub(r"\n```$", "", cleaned)
    return cleaned.strip()


def invoke_local_lm_studio_http(
    system_prompt: str, user_prompt: str, timeout: float = 120.0
) -> Optional[str]:
    """Chama o LM Studio local via HTTP direto com timeout estendido para geração de código JSX."""
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
    local_api_key = os.environ.get("LOCAL_LLM_API_KEY", "").strip()

    urls_to_try = [local_url, "http://127.0.0.1:1234/v1", "http://localhost:1234/v1"]
    seen = set()
    urls_unique = [x for x in urls_to_try if not (x in seen or seen.add(x))]

    payload = {
        "model": local_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    headers_list = [{"Content-Type": "application/json"}]
    if local_api_key:
        headers_list.insert(
            0, {"Content-Type": "application/json", "Authorization": f"Bearer {local_api_key}"}
        )
    else:
        headers_list.append(
            {"Content-Type": "application/json", "Authorization": "Bearer lm-studio"}
        )

    for url in urls_unique:
        for headers in headers_list:
            try:
                print(
                    f"[LM Studio] Enviando solicitação ao modelo {local_model} em {url} (Timeout: {timeout}s)..."
                )
                with httpx.Client(timeout=timeout) as client:
                    res = client.post(f"{url}/chat/completions", json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as err:
                print(f"[LM Studio] Não foi possível conectar ou timeout em {url}: {err}")
    return None


def invoke_code_llm(
    system_prompt: str,
    user_prompt: str,
    adapter: Optional[Callable[[str, str], Optional[str]]] = None,
) -> Optional[str]:
    """
    Invoca o provedor de código (adapter injetado, LM Studio HTTP local ou LLM em nuvem)
    e retorna o código limpo sem cercas Markdown.
    """
    raw_code: Optional[str] = None
    if adapter is not None:
        raw_code = adapter(system_prompt, user_prompt)
    else:
        use_local = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
        if use_local:
            raw_code = invoke_local_lm_studio_http(system_prompt, user_prompt)

        if not raw_code:
            llm = get_llm(temperature=0.0)
            if llm is not None and describe_active_llm()["provider"] != "local":
                try:
                    res = llm.invoke(
                        [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ]
                    )
                    raw_code = res.content if hasattr(res, "content") else str(res)
                except Exception as e:
                    print(f"[LLM Gateway] Falha ao chamar LLM em nuvem ({e}).")

    return strip_code_fences(raw_code) if raw_code else None
