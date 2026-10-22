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
from ai_software_factory.niche_profiles import resolve_niche_profile
from ai_software_factory.intake_parser import extract_branding_from_report
from ai_software_factory.schemas import ClientConfig

# Carrega as variáveis de ambiente do orquestrador
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Configurações do Supabase ausentes no arquivo .env.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def extract_text_from_url(url: str, client: httpx.AsyncClient) -> str:
    """Faz o download e extrai o texto principal de uma URL de referência com fallback rápido para redes sociais."""
    try:
        print(f"[Briefing Collector] Scraping link: {url}")

        if "facebook.com" in url.lower() or "instagram.com" in url.lower():
            match_profile = re.search(
                r"(?:facebook\.com|instagram\.com)/([^/?#]+)", url, re.IGNORECASE
            )
            profile_name = match_profile.group(1) if match_profile else "Perfil Social"
            return f"Link de Rede Social do Estabelecimento: {url} (Nome do Perfil/Página: {profile_name})"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = await client.get(url, headers=headers, timeout=8.0, follow_redirects=True)
        if response.status_code != 200:
            return f"[Link de Referência {url} - Status HTTP {response.status_code}]"

        soup = BeautifulSoup(response.text, "html.parser")
        for script in soup(["script", "style", "meta", "noscript", "header", "footer", "nav"]):
            script.extract()

        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        extracted = " ".join(chunk for chunk in chunks if chunk)
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
    textos adicionais, links raspados e arquivos PDF/imagem em um único contexto limpo,
    sem uso desnecessário de chunking ou banco vetorial (RAG).
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


def render_design_direction_report(
    contact_name: str,
    direction: Dict[str, Any],
    profile: Dict[str, Any],
    mecanismo_usado: str,
) -> str:
    """
    Formata uma Design Direction tipada no relatório Markdown exibido no CRM,
    mantendo o bloco JSON compatível com o contrato unificado.
    """
    nicho = direction.get("rag_niche") or direction.get("niche") or profile["rag_niche"]
    vibe = profile["vibe"]
    primary_hex = direction.get("primary_color") or profile["primary_color"]
    secondary_hex = direction.get("secondary_color") or profile["secondary_color"]
    bg_hex = direction.get("bg_color") or profile["bg_color"]
    surface_hex = direction.get("surface_color") or profile["surface_color"]
    text_hex = direction.get("text_color") or profile["text_color"]
    muted_hex = direction.get("muted_color") or profile["muted_color"]
    tema = direction.get("theme") or profile["theme"]
    fonte_titulos = direction.get("font_heading") or profile["font_heading"]
    fonte_corpo = direction.get("font_body") or profile["font_body"]
    borda = profile["border_radius"]
    estilo_botao = profile["button_style"]
    sombra = profile["shadow"]
    foto_estilo = profile["photo_style"]
    layout_concept = direction.get("layout_concept") or profile["layout_concept"]
    focal_element = direction.get("focal_element") or profile["focal_element"]
    design_critique = direction.get("design_critique") or profile["design_critique"]
    copy_tone = direction.get("copy_tone") or profile["copy_tone"]

    json_payload = {
        "tema": tema,
        "paleta_cores": {
            "cor_primaria_hex": primary_hex,
            "cor_secundaria_hex": secondary_hex,
            "cor_fundo_hex": bg_hex,
            "cor_superficie_hex": surface_hex,
            "cor_texto_hex": text_hex,
            "cor_texto_secundario_hex": muted_hex,
        },
        "tipografia": {
            "fonte_titulos": fonte_titulos,
            "fonte_corpo": fonte_corpo,
        },
        "direcao_design": {
            "conceito_layout": layout_concept,
            "elemento_focal": focal_element,
            "critica_anti_cliche": design_critique,
            "tom_escrita": copy_tone,
        },
        "estilo_botoes": {
            "formato_borda": borda,
            "estilo_visual": estilo_botao,
            "sombra": sombra,
        },
        "requisitos_fotos": {
            "estilo_visual": foto_estilo,
            "filtro_recomendado": "Tratamento de contraste e saturação otimizados",
        },
    }
    json_block = json.dumps(json_payload, indent=2, ensure_ascii=False)

    return (
        f"### ⚡ 0. Mecanismo de IA Utilizado\n"
        f"- **Motor de Processamento**: `{mecanismo_usado}`\n\n"
        f"---\n\n"
        f"### 🔬 1. Diagnóstico de Marca & Público (UX Researcher)\n"
        f"- **Nicho de Atuação**: {nicho}\n"
        f"- **Público-Alvo**: Clientes do estabelecimento '{contact_name}' buscando agendamento digital direto.\n"
        f"- **Vibe & Atmosfera Emocional**: {vibe}.\n"
        f"- **Pilares da Marca**: Qualidade técnica, pontualidade no atendimento e clareza de horários.\n"
        f"- **Diretrizes para a Interface**: {copy_tone}\n\n"
        f"---\n\n"
        f"### 🎨 2. Especificações Visuais & UX/UI (UI Designer — Design Direction)\n"
        f"- **Tema Padrão**: {tema}\n"
        f"- **Paleta de Cores (6 Tokens)**: Primária {primary_hex}, Secundária {secondary_hex}, Fundo {bg_hex}, Superfície {surface_hex}, Texto {text_hex}, Secundário {muted_hex}.\n"
        f"- **Tipografia**: Títulos em {fonte_titulos}, Corpo em {fonte_corpo}.\n"
        f"- **Conceito de Layout**: {layout_concept}\n"
        f"- **Elemento Focal Único**: {focal_element}\n"
        f"- **Crítica Anti-Clichê (`frontend-design`)**: {design_critique}\n"
        f"- **Estilo de Componentes**: Bordas {borda}, Botões estilo {estilo_botao}, Sombras {sombra}.\n"
        f"- **Requisitos de Mídia**: {foto_estilo}.\n\n"
        f"---\n\n"
        f"### ⚙️ 3. Configuração de Arquitetura (AI Engineer - Schema JSON)\n```json\n{json_block}\n```"
    )


async def generate_rag_report(
    contact_name: str, doc_chunks: Any, llm_adapter: Optional[Any] = None
) -> str:
    """
    Sintetiza a Design Direction para o contato em uma única passagem estruturada
    guiada pela skill `frontend-design` + `stop-slop` (sem necessidade de RAG vetorial
    ou de 3 chamadas sequenciais não-tipadas).
    """
    context = (
        "\n\n---\n\n".join(doc_chunks[:15])
        if isinstance(doc_chunks, list)
        else str(doc_chunks or "")
    )
    profile = resolve_niche_profile(context, app_name=contact_name)
    design_skill_block = skill_loader.get_design_planning_skill_prompt()

    llm_info = llm_gateway.describe_active_llm()
    mecanismo_usado = llm_info["label"]

    system_prompt = (
        "Você é o Design Lead responsável por sintetizar a Design Direction completa de um cliente "
        "a partir do seu Lead Briefing consolidado.\n\n"
        f"{design_skill_block}\n\n"
        "RETORNE ESTRITAMENTE UM OBJETO JSON VÁLIDO correspondente ao schema ClientConfig contendo: "
        "app_name, primary_color, secondary_color, bg_color, surface_color, text_color, muted_color, "
        "theme, font_heading, font_body, niche, tagline, color_reasoning, layout_concept, "
        "focal_element, design_critique, copy_tone."
    )
    user_prompt = (
        f"Cliente / Estabelecimento: {contact_name}\n\n"
        f"Lead Briefing consolidado:\n{context}"
    )

    def fallback_action():
        return profile

    res_obj = llm_gateway.synthesize_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_class=ClientConfig,
        temperature=0.2,
        adapter=llm_adapter,
        fallback_fn=fallback_action,
    )

    if isinstance(res_obj, ClientConfig):
        parsed_dir = res_obj.model_dump()
    elif isinstance(res_obj, dict):
        parsed_dir = res_obj
    else:
        parsed_dir = profile

    merged_dir = dict(profile)
    for k, v in (parsed_dir or {}).items():
        if v is not None and str(v).strip() != "":
            merged_dir[k] = v

    return render_design_direction_report(
        contact_name=contact_name,
        direction=merged_dir,
        profile=profile,
        mecanismo_usado=mecanismo_usado,
    )


def generate_fallback_rag_report(
    contact_name: str,
    context: str,
    mecanismo_usado: str = "Fallback Heurístico Local (Motor Python)",
) -> str:
    """Gera o relatório da Design Direction a partir do Niche Profile canônico em config.py."""
    profile = config.resolve_niche_profile(context, app_name=contact_name)
    return render_design_direction_report(
        contact_name=contact_name,
        direction=profile,
        profile=profile,
        mecanismo_usado=mecanismo_usado,
    )


def extract_branding_from_report(report: str, contact_name: str = "") -> Dict[str, str]:
    """Delega para o extrator unificado de Branding e Design Direction em config.py."""
    return config.extract_branding_from_report(report, contact_name=contact_name)


async def run_rag_analysis_pipeline(
    contact_id: str,
    supabase_client: Optional[Any] = None,
    http_client: Optional[httpx.AsyncClient] = None,
    llm_adapter: Optional[Any] = None,
):
    """
    Executa a coleta de Lead Briefing e a síntese da Design Direction para o contact_id,
    persistindo o relatório e os tokens visuais na tabela `contacts`.
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

        report = await generate_rag_report(name, full_text, llm_adapter=llm_adapter)
        branding_info = extract_branding_from_report(report, name)

        updated_additional_data = dict(additional_data)
        updated_additional_data["branding"] = branding_info

        supabase.table("contacts").update(
            {
                "rag_status": "completed",
                "rag_report": report,
                "additional_data": updated_additional_data,
            }
        ).eq("id", contact_id).execute()
    except Exception as e:
        print(f"[Design Direction Synthesis] Erro crítico para o contato {contact_id}: {str(e)}")
        try:
            supabase.table("contacts").update(
                {
                    "rag_status": "failed",
                    "rag_report": f"Falha na análise de marca:\n{str(e)}",
                }
            ).eq("id", contact_id).execute()
        except Exception as update_err:
            print(f"[Design Direction Synthesis] Erro ao atualizar status no banco: {str(update_err)}")
