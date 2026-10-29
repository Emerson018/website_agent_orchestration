import json
import os
import re
import sys
import tempfile
from typing import Any, Dict, List, Optional
import httpx
from bs4 import BeautifulSoup
import pdfplumber
from PIL import Image
import pytesseract
from supabase import Client, create_client
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
from ai_software_factory import llm_gateway, skill_loader
from ai_software_factory.niche_profiles import (
    LAYOUT_ARCHETYPES,
    resolve_niche_profile,
    select_layout_archetype,
)
from ai_software_factory.intake_parser import (
    extract_brand_direction,
    extract_branding_from_report,
    extract_contextual_brand_insights,
)
from ai_software_factory.schemas import BrandDesignSpec, ClientConfig

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Configurações do Supabase ausentes no arquivo .env.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def extract_text_from_url(url: str, client: httpx.AsyncClient) -> str:
    """Faz o download e extrai o texto principal e metatags ricas de uma URL (websites, Instagram ou Facebook)."""
    try:
        print(f"[Briefing Collector] Scraping link: {url}")

        if "facebook.com" in url.lower() or "instagram.com" in url.lower():
            try:
                headers = {
                    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                }
                resp = await client.get(url, headers=headers, timeout=8.0, follow_redirects=True)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "title"})
                    og_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", property="og:description")
                    og_img = soup.find("meta", property="og:image")

                    title = og_title["content"].strip() if og_title and og_title.get("content") else ""
                    desc = og_desc["content"].strip() if og_desc and og_desc.get("content") else ""
                    img_url = og_img["content"].strip() if og_img and og_img.get("content") else ""

                    bio_match = re.search(r'on Instagram:\s*[\"“\'](.*?)[\"”\']', desc, re.DOTALL)
                    clean_bio = bio_match.group(1).strip() if bio_match else desc

                    parts = [f"### [Rede Social Oficial do Estabelecimento — {url}]"]
                    if title:
                        parts.append(f"- Nome / Perfil: {title}")
                    if clean_bio:
                        parts.append(f"- Biografia / Proposta e Serviços: {clean_bio}")
                    if img_url:
                        parts.append(f"- Foto de Perfil / Logo Oficial (Asset URL): {img_url}")
                    if desc and desc != clean_bio:
                        parts.append(f"- Dados adicionais do perfil: {desc}")

                    result = "\n".join(parts)
                    print(f"[Briefing Collector] Sucesso na raspagem de metatags sociais de {url}: {title}")
                    return result
            except Exception as soc_err:
                print(f"[Briefing Collector] Fallback para rede social {url}: {soc_err}")

            match_profile = re.search(
                r"(?:facebook\.com|instagram\.com)/([^/?#]+)", url, re.IGNORECASE
            )
            profile_name = match_profile.group(1) if match_profile else "Perfil Social"
            return f"Link de Rede Social do Estabelecimento: {url} (Nome do Perfil/Página: {profile_name})"

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        response = await client.get(url, headers=headers, timeout=8.0, follow_redirects=True)
        if response.status_code != 200:
            return f"[Link de Referência {url} - Status HTTP {response.status_code}]"

        soup = BeautifulSoup(response.text, "html.parser")

        # Captura metatags essenciais de marca antes de limpar o DOM
        og_title = soup.find("meta", property="og:title") or soup.find("title")
        og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
        og_img = soup.find("meta", property="og:image")

        site_title = (
            og_title.get_text().strip()
            if (og_title and hasattr(og_title, "get_text") and not og_title.get("content"))
            else (og_title["content"].strip() if og_title and og_title.get("content") else "")
        )
        site_desc = og_desc["content"].strip() if og_desc and og_desc.get("content") else ""
        site_img = og_img["content"].strip() if og_img and og_img.get("content") else ""

        for script in soup(["script", "style", "meta", "noscript", "header", "footer", "nav"]):
            script.extract()

        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        extracted_body = " ".join(chunk for chunk in chunks if chunk)

        meta_summary = []
        if site_title:
            meta_summary.append(f"Título da Página: {site_title}")
        if site_desc:
            meta_summary.append(f"Descrição da Marca: {site_desc}")
        if site_img:
            meta_summary.append(f"Logo/Imagem de Destaque: {site_img}")

        prefix = "\n".join(meta_summary) + "\n\nConteúdo:\n" if meta_summary else ""
        extracted = (prefix + extracted_body).strip()
        return extracted if extracted else f"[Link de Referência Visitado: {url}]"
    except Exception as e:
        print(f"[Briefing Collector] Erro ou timeout ao raspar a URL {url}: {str(e)}")
        return f"[Link de Referência do Cliente: {url}]"


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extrai texto de um arquivo PDF local usando pdfplumber."""
    text_content = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text_content.append(extracted)
    except Exception as e:
        return f"[Erro ao processar PDF: {str(e)}]"
    return "\n".join(text_content)


def extract_text_from_image(image_path: str) -> str:
    """Extrai texto de uma imagem usando pytesseract (OCR)."""
    try:
        img = Image.open(image_path)
        return pytesseract.image_to_string(img, lang="por+eng")
    except Exception as e:
        return f"[Erro no OCR da imagem: {str(e)}]"


async def download_and_extract_file(file_url: str, client: httpx.AsyncClient) -> str:
    """Baixa o arquivo da URL do Supabase Storage e extrai o texto com base na extensão."""
    try:
        suffix = ""
        lower_url = file_url.lower()
        if ".pdf" in lower_url:
            suffix = ".pdf"
        elif ".png" in lower_url:
            suffix = ".png"
        elif ".jpg" in lower_url or ".jpeg" in lower_url:
            suffix = ".jpg"
        elif ".webp" in lower_url:
            suffix = ".webp"

        async with client.stream("GET", file_url, timeout=30.0) as response:
            if response.status_code != 200:
                return f"[Erro ao baixar arquivo {file_url} (Status: {response.status_code})]"

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                async for chunk in response.aiter_bytes():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name

        try:
            if suffix == ".pdf":
                return extract_text_from_pdf(tmp_path)
            if suffix in [".png", ".jpg", ".webp"]:
                return extract_text_from_image(tmp_path)
            with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        return f"[Erro no arquivo {file_url} - {str(e)}]"


async def collect_contact_briefing(
    contact_id: str,
    supabase_client: Optional[Any] = None,
    http_client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """
    Módulo Profundo de Coleta de Lead Briefing:
    Consolida ficha cadastral, histórico de conversas do WhatsApp, notas internas do CRM,
    textos adicionais, links raspados e arquivos PDF/imagem em um único dossiê contextual.
    """
    supabase = supabase_client or get_supabase()
    res = (
        supabase.table("contacts")
        .select("id, name, email, phone, company, additional_data")
        .eq("id", contact_id)
        .single()
        .execute()
    )
    contact = res.data
    if not contact:
        raise ValueError(f"Contato com ID {contact_id} não encontrado.")

    name = contact.get("name") or "Cliente Anonimo"
    additional_data = contact.get("additional_data") or {}

    files = additional_data.get("files") or []
    links = additional_data.get("links") or []
    texts = additional_data.get("texts") or []

    extracted_texts: List[str] = []
    card_info = f"[Ficha do Cliente]: Nome: {name}"
    if contact.get("email"):
        card_info += f" | E-mail: {contact.get('email')}"
    if contact.get("phone"):
        card_info += f" | Telefone: {contact.get('phone')}"
    if contact.get("company"):
        card_info += f" | Empresa: {contact.get('company')}"
    extracted_texts.append(card_info)

    try:
        conv_res = (
            supabase.table("conversations")
            .select("id")
            .eq("contact_id", contact_id)
            .execute()
        )
        conv_ids = [c["id"] for c in (conv_res.data or []) if "id" in c]
        if conv_ids:
            msg_res = (
                supabase.table("messages")
                .select("content_text, sender_type")
                .in_("conversation_id", conv_ids)
                .order("created_at", desc=False)
                .execute()
            )
            if msg_res.data:
                chat_msgs = [
                    f"[{m.get('sender_type', 'chat')}]: {m.get('content_text', '')}"
                    for m in msg_res.data
                    if m.get("content_text")
                ]
                if chat_msgs:
                    extracted_texts.append(
                        "[Histórico de Mensagens / Lead]:\n" + "\n".join(chat_msgs)
                    )
    except Exception as msg_err:
        print(f"[Briefing Collector] Aviso ao buscar mensagens do chat: {msg_err}")

    try:
        notes_res = (
            supabase.table("contact_notes")
            .select("note_text")
            .eq("contact_id", contact_id)
            .execute()
        )
        if notes_res.data:
            note_list = [
                n.get("note_text") for n in notes_res.data if n.get("note_text")
            ]
            if note_list:
                extracted_texts.append(
                    "[Notas Internas do CRM]:\n" + "\n".join(note_list)
                )
    except Exception as note_err:
        print(f"[Briefing Collector] Aviso ao buscar notas do contato: {note_err}")

    for t in texts:
        label = t.get("label") or "Texto"
        text = t.get("text") or ""
        if text.strip():
            extracted_texts.append(f"[{label}]: {text}")

    async def _scrape_external_resources(client: httpx.AsyncClient):
        for l in links:
            label = l.get("label") or "Link"
            url = l.get("url") or ""
            if url.strip():
                text = await extract_text_from_url(url, client)
                extracted_texts.append(f"[{label} - Fonte: {url}]: {text}")

        for f in files:
            filename = f.get("name") or "Arquivo"
            file_url = f.get("url") or ""
            if file_url.strip():
                text = await download_and_extract_file(file_url, client)
                extracted_texts.append(f"[Arquivo: {filename}]: {text}")

    if links or files:
        if http_client is not None:
            await _scrape_external_resources(http_client)
        else:
            async with httpx.AsyncClient() as client:
                await _scrape_external_resources(client)

    full_text = "\n\n".join(extracted_texts).strip()
    if not full_text:
        full_text = f"[Ficha do Cliente]: Nome: {name}"

    return {
        "contact_id": contact_id,
        "contact_name": name,
        "additional_data": additional_data,
        "full_text": full_text,
    }


def _normalize_services_list(raw_services: Any, fallback_services: List[Dict[str, str]]) -> List[Dict[str, str]]:
    normalized: List[Dict[str, str]] = []
    if isinstance(raw_services, list):
        for item in raw_services:
            if hasattr(item, "model_dump"):
                item = item.model_dump()
            if isinstance(item, dict) and item.get("name"):
                normalized.append(
                    {
                        "name": str(item.get("name")),
                        "price": str(item.get("price") or "Sob consulta"),
                        "description": str(item.get("description") or item.get("desc") or ""),
                        "badge": str(item.get("badge") or "Especialidade"),
                    }
                )
    if normalized:
        return normalized
    return [
        {
            "name": s.get("name", "Atendimento"),
            "price": s.get("price", "Sob consulta"),
            "description": s.get("description") or s.get("desc", ""),
            "badge": s.get("badge", "Especialidade"),
        }
        for s in fallback_services
    ]


def build_brand_design_spec(
    contact_name: str,
    direction: Dict[str, Any],
    profile: Dict[str, Any],
    mecanismo_usado: str,
    context: str = "",
) -> Dict[str, Any]:
    """
    Constrói o objeto canônico `BrandDesignSpec` (JSON tipado) que alimenta diretamente
    a geração do site (`fila_projetos` -> `code_injector_node`), sem depender de regex sobre Markdown.
    """
    contextual = extract_contextual_brand_insights(contact_name, context, profile)
    layout_archetype = (
        direction.get("layout_archetype")
        or contextual.get("layout_archetype")
        or "editorial_asymmetric"
    )
    archetype_obj = LAYOUT_ARCHETYPES.get(
        layout_archetype, LAYOUT_ARCHETYPES["editorial_asymmetric"]
    )

    primary_hex = direction.get("primary_color") or profile["primary_color"]
    secondary_hex = direction.get("secondary_color") or profile["secondary_color"]
    bg_hex = direction.get("bg_color") or profile["bg_color"]
    surface_hex = direction.get("surface_color") or profile["surface_color"]
    text_hex = direction.get("text_color") or profile["text_color"]
    muted_hex = direction.get("muted_color") or profile["muted_color"]
    tema = direction.get("theme") or profile["theme"]
    font_heading = direction.get("font_heading") or profile["font_heading"]
    font_body = direction.get("font_body") or profile["font_body"]

    real_services = _normalize_services_list(
        direction.get("real_services"), contextual["real_services"]
    )
    pillars = direction.get("brand_pillars") or contextual["brand_pillars"]
    blueprint = (
        direction.get("section_blueprint")
        or direction.get("recommended_sections")
        or archetype_obj["section_blueprint"]
    )

    return {
        "app_name": direction.get("app_name") or contact_name,
        "niche": direction.get("niche") or profile["niche"],
        "rag_niche": direction.get("rag_niche") or profile["rag_niche"],
        "palette_name": profile.get("palette_name", "Definida via Direção de Marca Gemini"),
        "primary_color": primary_hex,
        "secondary_color": secondary_hex,
        "bg_color": bg_hex,
        "surface_color": surface_hex,
        "text_color": text_hex,
        "muted_color": muted_hex,
        "primary_color_hex": primary_hex,
        "secondary_color_hex": secondary_hex,
        "bg_color_hex": bg_hex,
        "surface_color_hex": surface_hex,
        "text_color_hex": text_hex,
        "muted_color_hex": muted_hex,
        "theme": tema,
        "font_heading": font_heading,
        "font_body": font_body,
        "tagline": direction.get("tagline") or contextual["tagline"],
        "brand_essence": direction.get("brand_essence") or contextual["brand_essence"],
        "value_proposition": direction.get("value_proposition") or contextual["value_proposition"],
        "target_audience": direction.get("target_audience") or contextual["target_audience"],
        "brand_pillars": pillars,
        "real_services": real_services,
        "color_reasoning": direction.get("color_reasoning") or contextual["color_reasoning"],
        "layout_archetype": layout_archetype,
        "layout_archetype_label": archetype_obj["label"],
        "layout_concept": direction.get("layout_concept") or contextual["layout_concept"],
        "focal_element": direction.get("focal_element") or profile["focal_element"],
        "design_critique": direction.get("design_critique") or profile["design_critique"],
        "copy_tone": direction.get("copy_tone") or profile["copy_tone"],
        "section_blueprint": blueprint,
        "execution_engine": direction.get("execution_engine") or mecanismo_usado,
    }


def render_design_direction_report(
    contact_name: str,
    direction: Dict[str, Any],
    profile: Dict[str, Any],
    mecanismo_usado: str,
    context: str = "",
) -> str:
    """
    Formata o Dossiê Executivo de Marca e Direção de Design exibido no WhatsApp CRM:
    - Informa no topo qual Motor/Modelo Gemini foi utilizado;
    - Apresenta essência autoral, proposta de valor, público-alvo, pilares e serviços reais;
    - Define a paleta de 6 tokens, tipografia, arquétipo estrutural de layout e blueprint de seções;
    - Sem blocos JSON brutos poluindo a leitura humana.
    """
    spec = build_brand_design_spec(
        contact_name=contact_name,
        direction=direction,
        profile=profile,
        mecanismo_usado=mecanismo_usado,
        context=context,
    )

    services_md = "\n".join(
        f"  - **{s['name']}** ({s['price']}) — {s['description']}"
        for s in spec["real_services"]
    )
    pillars_md = "\n".join(f"  - {p}" for p in spec["brand_pillars"])
    blueprint_md = "\n".join(f"  - {sec}" for sec in spec["section_blueprint"])

    return (
        f"### ⚡ 0. Motor de IA Utilizado\n"
        f"- **Motor de Processamento**: `{spec['execution_engine']}`\n"
        f"- **Arquétipo de Layout**: `{spec['layout_archetype']}` ({spec['layout_archetype_label']})\n\n"
        f"---\n\n"
        f"### 🔬 1. Essência da Marca, Posicionamento & Público\n"
        f"- **Segmento / Nicho**: {spec['rag_niche']} ({spec['niche']})\n"
        f"- **Essência & Identidade da Casa**: {spec['brand_essence']}\n"
        f"- **Proposta de Valor**: {spec['value_proposition']}\n"
        f"- **Público-Alvo Específico**: {spec['target_audience']}\n"
        f"- **Diferenciais & Pilares Operacionais**:\n{pillars_md}\n"
        f"- **Serviços & Especialidades Mapeadas**:\n{services_md}\n\n"
        f"---\n\n"
        f"### 🎨 2. Direção Visual & Arquitetura de Interface (`frontend-design`)\n"
        f"- **Tema Padrão**: `{spec['theme']}`\n"
        f"- **Paleta de Cores (6 Tokens)**: Primária `{spec['primary_color']}`, Secundária `{spec['secondary_color']}`, Fundo `{spec['bg_color']}`, Superfície `{spec['surface_color']}`, Texto `{spec['text_color']}`, Secundário `{spec['muted_color']}`.\n"
        f"- **Racional Cromo-Material**: {spec['color_reasoning']}\n"
        f"- **Tipografia**: Títulos em **{spec['font_heading']}**, Corpo em **{spec['font_body']}**.\n"
        f"- **Conceito de Layout**: {spec['layout_concept']}\n"
        f"- **Elemento Focal Único**: {spec['focal_element']}\n"
        f"- **Crítica Anti-Clichê (`frontend-design`)**: {spec['design_critique']}\n"
        f"- **Tom de Escrita UX (`stop-slop`)**: {spec['copy_tone']}\n\n"
        f"---\n\n"
        f"### 📐 3. Blueprint Estrutural da Página (Layout Único)\n"
        f"{blueprint_md}"
    )


render_brand_direction_dossier = render_design_direction_report


async def generate_brand_direction_report(
    contact_name: str, doc_chunks: Any, llm_adapter: Optional[Any] = None
) -> str:
    """
    Sintetiza o BrandDesignSpec e o Dossiê Executivo de Marca para o contato
    usando a cadeia Gemini (CLI/IDE -> API gemini-3.8-flash -> Extrator Contextual Profundo).
    """
    context = (
        "\n\n---\n\n".join(doc_chunks[:15])
        if isinstance(doc_chunks, list)
        else str(doc_chunks or "")
    )
    profile = resolve_niche_profile(context, app_name=contact_name)
    contextual_defaults = extract_contextual_brand_insights(contact_name, context, profile)
    design_skill_block = skill_loader.get_design_planning_skill_prompt()

    system_prompt = (
        "Você é o Design Lead e Estrategista de Marca Sênior responsável por sintetizar o BrandDesignSpec "
        "completo de um estabelecimento comercial a partir do seu Lead Briefing real (conversas de WhatsApp, "
        "notas, links raspados e documentos).\n\n"
        f"{design_skill_block}\n\n"
        "DIRETRIZES DE ESSÊNCIA E UNICIDADE:\n"
        "1. PROIBIDO usar textos genéricos ou clichês de IA. Extraia os serviços reais, preços, atmosfera e diferenciais "
        "diretamente das informações do cliente.\n"
        "2. Escolha um `layout_archetype` que torne este site estruturalmente único entre as opções: "
        "'editorial_asymmetric', 'bento_modular', 'cinematic_immersive', 'swiss_typographic_catalog' ou 'narrative_scrollytelling'.\n"
        "3. RETORNE ESTRITAMENTE UM OBJETO JSON VÁLIDO correspondente ao schema ClientConfig contendo: "
        "app_name, primary_color, secondary_color, bg_color, surface_color, text_color, muted_color, "
        "theme, font_heading, font_body, niche, tagline, brand_essence, value_proposition, target_audience, "
        "brand_pillars, real_services, color_reasoning, layout_archetype, layout_concept, "
        "focal_element, design_critique, copy_tone, section_blueprint."
    )
    user_prompt = (
        f"Cliente / Estabelecimento: {contact_name}\n\n"
        f"Lead Briefing consolidado (Conversas, Notas, Links e Documentos):\n{context}"
    )

    def fallback_action():
        return contextual_defaults

    res_obj = llm_gateway.synthesize_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_class=ClientConfig,
        temperature=0.2,
        adapter=llm_adapter,
        fallback_fn=fallback_action,
    )

    mecanismo_usado = (
        llm_gateway.get_last_execution_model_label()
        or llm_gateway.describe_active_llm()["label"]
    )

    if isinstance(res_obj, ClientConfig):
        parsed_dir = res_obj.model_dump()
    elif isinstance(res_obj, dict):
        parsed_dir = res_obj
    else:
        parsed_dir = contextual_defaults

    merged_dir = dict(contextual_defaults)
    for k, v in (parsed_dir or {}).items():
        if v is not None and str(v).strip() != "" and v != []:
            merged_dir[k] = v

    merged_dir["execution_engine"] = mecanismo_usado

    return render_design_direction_report(
        contact_name=contact_name,
        direction=merged_dir,
        profile=profile,
        mecanismo_usado=mecanismo_usado,
        context=context,
    )


generate_rag_report = generate_brand_direction_report


def generate_fallback_rag_report(
    contact_name: str,
    context: str,
    mecanismo_usado: str = "Motor Analítico Contextual + Gemini (gemini-3.8-flash)",
) -> str:
    """Gera o Dossiê Executivo de Marca com extração contextual profunda sobre o briefing."""
    profile = config.resolve_niche_profile(context, app_name=contact_name)
    contextual = extract_contextual_brand_insights(contact_name, context, profile)
    return render_design_direction_report(
        contact_name=contact_name,
        direction=contextual,
        profile=profile,
        mecanismo_usado=mecanismo_usado,
        context=context,
    )


generate_fallback_brand_report = generate_fallback_rag_report


async def run_brand_analysis_pipeline(
    contact_id: str,
    supabase_client: Optional[Any] = None,
    http_client: Optional[httpx.AsyncClient] = None,
    llm_adapter: Optional[Any] = None,
):
    """
    Executa a coleta de Lead Briefing, sintetiza o `BrandDesignSpec` JSON e o Dossiê Executivo
    de Marca para o `contact_id`, persistindo o relatório e o contrato JSON tipado na tabela `contacts`.
    """
    supabase = supabase_client or get_supabase()
    supabase.table("contacts").update({"rag_status": "processing"}).eq("id", contact_id).execute()

    try:
        briefing = await collect_contact_briefing(
            contact_id=contact_id,
            supabase_client=supabase,
            http_client=http_client,
        )
        name = briefing["contact_name"]
        additional_data = briefing["additional_data"]
        full_text = briefing["full_text"]

        report = await generate_brand_direction_report(name, full_text, llm_adapter=llm_adapter)
        branding_info = extract_branding_from_report(report, name)
        mecanismo_usado = branding_info.get("execution_engine") or llm_gateway.get_last_execution_model_label()
        profile = resolve_niche_profile(full_text, app_name=name)
        brand_spec = build_brand_design_spec(
            contact_name=name,
            direction=branding_info,
            profile=profile,
            mecanismo_usado=mecanismo_usado,
            context=full_text,
        )

        updated_additional_data = dict(additional_data)
        updated_additional_data["branding"] = branding_info
        updated_additional_data["brand_direction"] = brand_spec
        updated_additional_data["last_execution_engine"] = mecanismo_usado

        supabase.table("contacts").update(
            {
                "rag_status": "completed",
                "rag_report": report,
                "additional_data": updated_additional_data,
            }
        ).eq("id", contact_id).execute()
    except Exception as e:
        print(f"[Brand Analyzer] Erro crítico para o contato {contact_id}: {str(e)}")
        try:
            supabase.table("contacts").update(
                {
                    "rag_status": "failed",
                    "rag_report": f"Falha na análise de marca:\n{str(e)}",
                }
            ).eq("id", contact_id).execute()
        except Exception as update_err:
            print(f"[Brand Analyzer] Erro ao atualizar status no banco: {str(update_err)}")


run_rag_analysis_pipeline = run_brand_analysis_pipeline
