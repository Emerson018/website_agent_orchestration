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
    Resolve o Niche Profile canônico para um segmento de mercado com base no
    Lead Briefing e nome do aplicativo.
    """
    display_name = app_name or "AppCustomizado"
    raw_combined = f"{display_name} {text or ''}".lower()
    norm = strip_accents(raw_combined)

    if re.search(r"\b(odont|odontologia|dente|dentes|sorriso|dentista|dentistas|saude|clinica|medico|doutor)\b", norm):
        return {
            "niche_key": "odontologia",
            "niche": "Odontologia & Saúde",
            "rag_niche": "Saúde & Odontologia",
            "palette_name": "Azul Clínico Confiável",
            "vibe": "Clínico, Confiável, Limpo e Acolhedor",
            "primary_color": "#0EA5E9",
            "secondary_color": "#0284C7",
            "bg_color": "#F8FAFC",
            "text_color": "#0F172A",
            "theme": "light",
            "font_heading": "Montserrat",
            "font_body": "Inter",
            "border_radius": "rounded-xl",
            "button_style": "flat",
            "shadow": "shadow-sm",
            "photo_style": "Imagens iluminadas, ambientes clínicos limpos e sorrisos naturais",
            "hero_title": "O Sorriso Radiante Que Você Merece",
            "hero_desc": f"Na {display_name}, unimos tecnologia de ponta e cuidado humanizado para transformar e valorizar o seu sorriso com total conforto.",
            "hero_img": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Clareamento Dental Avançado", "desc": "Procedimento seguro a laser para devolver o brilho e a tonalidade natural dos dentes.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80"},
                {"name": "Alinhadores Transparentes", "desc": "Correção ortodôntica moderna com aparelhos invisíveis, removíveis e imperceptíveis.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80"},
                {"name": "Check-up Preventivo Completo", "desc": "Avaliação detalhada, limpeza ultrassônica e orientações completas de saúde bucal.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"},
            ],
            "theme_bg": "bg-[#F8FAFC] text-[#0F172A]",
            "card_bg": "bg-white border-[#E2E8F0] shadow-md",
        }
    elif re.search(r"\b(barbe|barba|barbearia|barbeiro|corte|navalha|pampas|homem|cabelo|barber)\b", norm):
        return {
            "niche_key": "barbearia",
            "niche": "Barbearia",
            "rag_niche": "Barbearia & Estilo Masculino",
            "palette_name": "Dourado & Ambar Vintage",
            "vibe": "Vintage, Rústico Premium, Tradicional e Elegante",
            "primary_color": "#D4AF37",
            "secondary_color": "#1E293B",
            "bg_color": "#1C1917",
            "text_color": "#FAFAF9",
            "theme": "dark",
            "font_heading": "Playfair Display",
            "font_body": "Inter",
            "border_radius": "rounded-md",
            "button_style": "shadow",
            "shadow": "shadow-md",
            "photo_style": "Fotografia com iluminação quente, tons ambar, textura de madeira e metais artesanais",
            "hero_title": "Estilo, Tradição e Cuidado Masculino",
            "hero_desc": f"Bem-vindo à {display_name}. Aliamos o corte clássico na navalha a um ambiente exclusivo com atendimento de primeira.",
            "hero_img": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Corte de Cabelo Clássico", "desc": "Corte moderno ou clássico com lavagem, alinhamento e finalização premium.", "price": "R$ 60", "img": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80"},
                {"name": "Barboterapia com Toalha Quente", "desc": "Barba desenhada na navalha com hidratação, óleos nobres e toalha quente relaxante.", "price": "R$ 50", "img": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80"},
                {"name": "Combo Estilo Completo", "desc": "Cabelo, barba e sobrancelha com café expresso cortesia e atendimento VIP.", "price": "R$ 100", "img": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80"},
            ],
            "theme_bg": "bg-[#090D16] text-[#F1F5F9]",
            "card_bg": "bg-[#111827] border-[#1F2937]",
        }
    elif re.search(r"\b(estetic|estetica|beleza|salao|hair|unha|unhas|spa|maquiagem|sobrancelha)\b", norm):
        return {
            "niche_key": "estetica",
            "niche": "Estética & Beleza",
            "rag_niche": "Estética & Beleza",
            "palette_name": "Rose & Gold Elegante",
            "vibe": "Sofisticado, Minimalista, Delicado e Relaxante",
            "primary_color": "#EC4899",
            "secondary_color": "#F472B6",
            "bg_color": "#FFF1F2",
            "text_color": "#1C1917",
            "theme": "light",
            "font_heading": "Playfair Display",
            "font_body": "Montserrat",
            "border_radius": "rounded-2xl",
            "button_style": "shadow",
            "shadow": "shadow-sm",
            "photo_style": "Estética clean, detalhes delicados, tons pastel e iluminação de estúdio profissional",
            "hero_title": "Realce Sua Beleza e Bem-Estar Natural",
            "hero_desc": f"Descubra sua melhor versão na {display_name}. Protocolos estéticos personalizados em um ambiente relaxante e sofisticado.",
            "hero_img": "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Limpeza de Pele Profunda", "desc": "Remoção de impurezas, hidratação celular intensa e renovação do viço facial.", "price": "R$ 150", "img": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"},
                {"name": "Massagem Relaxante com Aromas", "desc": "Terapia corporal antiestresse com óleos essenciais para equilíbrio físico e mental.", "price": "R$ 130", "img": "https://images.unsplash.com/photo-1512290900672-1f4a4340d21a?auto=format&fit=crop&w=600&q=80"},
                {"name": "Design & Cuidados Corporais", "desc": "Tratamentos modeladores e protocolos exclusivos de alta performance estética.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=80"},
            ],
            "theme_bg": "bg-[#FFF1F2] text-[#1C1917]",
            "card_bg": "bg-white border-[#FFE4E6] shadow-sm",
        }
    elif re.search(r"\b(fogao|campeiro|restaurante|gourmet|comida|pizz|pizzaria|hambur|hamburgueria|cafe|doce|carne|churrasco|culinaria|alimento|refeicao|buffet|marmita|prato)\b", norm):
        return {
            "niche_key": "gastronomia",
            "niche": "Gastronomia",
            "rag_niche": "Gastronomia & Alimentação",
            "palette_name": "Gastronômico Vibrante",
            "vibe": "Artesanal, Regional, Apetitoso e Acolhedor",
            "primary_color": "#EAB308",
            "secondary_color": "#DC2626",
            "bg_color": "#1C1917",
            "text_color": "#FAFAF9",
            "theme": "dark",
            "font_heading": "Montserrat",
            "font_body": "Inter",
            "border_radius": "rounded-xl",
            "button_style": "gradient",
            "shadow": "shadow-lg",
            "photo_style": "Fotografia gastronômica detalhada, contraste marcante e elementos artesanais da culinária",
            "hero_title": "O Autêntico Sabor e Tradição Artesanal",
            "hero_desc": f"Bem-vindo ao {display_name}. Saboreie pratos artesanais da culinária regional com receitas tradicionais, tempero caseiro e ambiente acolhedor.",
            "hero_img": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Pratos Típicos Tradicionais", "desc": "Receitas clássicas preparadas lentamente com ingredientes nobres da estação.", "price": "R$ 48", "img": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"},
                {"name": "Cortes Especiais na Brasa", "desc": "Carnes selecionadas preparadas lentamente na brasa no ponto exato da sua preferência.", "price": "R$ 85", "img": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80"},
                {"name": "Reserva de Mesas Online", "desc": "Garanta seu lugar e de sua família com antecedência sem filas de espera.", "price": "Gratuito", "img": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"},
            ],
            "theme_bg": "bg-[#1C1917] text-[#FAFAF9]",
            "card_bg": "bg-[#292524] border-[#44403C]",
        }
    elif re.search(r"\b(pet|petshop|veterinar|veterinaria|veterinario|vet|cao|caes|gato|gatos|animal|animais|banho|tosa)\b", norm):
        return {
            "niche_key": "pet",
            "niche": "Pet & Veterinária",
            "rag_niche": "Petshop & Clínica Veterinária",
            "palette_name": "Laranja Amigável",
            "vibe": "Alegre, Amigável, Vibrante e Confiável",
            "primary_color": "#F97316",
            "secondary_color": "#EA580C",
            "bg_color": "#FAFAF9",
            "text_color": "#1C1917",
            "theme": "light",
            "font_heading": "Outfit",
            "font_body": "Inter",
            "border_radius": "rounded-2xl",
            "button_style": "flat",
            "shadow": "shadow-md",
            "photo_style": "Fotografia espontânea de animais saudáveis, ambiente alegre e colorido",
            "hero_title": "Cuidado e Carinho Que Seu Pet Merece",
            "hero_desc": f"Na {display_name}, tratamos seu melhor amigo com amor, dedicação e toda a estrutura que ele precisa para viver feliz e saudável.",
            "hero_img": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Banho & Tosa Especializada", "desc": "Higiene delicada com cosméticos seguros e tosa higiênica ou na tesoura.", "price": "R$ 70", "img": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80"},
                {"name": "Consulta Clínica & Preventiva", "desc": "Avaliação de rotina, carteira de vacinas e acompanhamento nutricional para pets.", "price": "R$ 120", "img": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80"},
                {"name": "Spa & Hidratação de Pelos", "desc": "Tratamento de pelagem com máscara hidratante e massagem relaxante.", "price": "R$ 90", "img": "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=600&q=80"},
            ],
            "theme_bg": "bg-[#FFFBEB] text-[#451A03]",
            "card_bg": "bg-white border-[#FEF3C7] shadow-sm",
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
            "text_color": "#F8FAFC",
            "theme": "dark",
            "font_heading": "Outfit",
            "font_body": "Inter",
            "border_radius": "rounded-xl",
            "button_style": "flat",
            "shadow": "shadow-sm",
            "photo_style": "Interface vetorial minimalista, ícones limpos e estética digital de alta precisão",
            "hero_title": "Excelência e Conforto em Cada Detalhe",
            "hero_desc": f"Conheça os serviços da {display_name}. Desenvolvidos com alto padrão de qualidade e atenção individualizada às suas necessidades.",
            "hero_img": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Atendimento Personalizado", "desc": "Soluções focadas sob medida para entregar exatamente o que você procura.", "price": "Sob consulta", "img": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"},
                {"name": "Consultoria & Diagnóstico", "desc": "Avaliação detalhada para garantir precisão, economia de tempo e melhores resultados.", "price": "Sob consulta", "img": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80"},
                {"name": "Agendamento Prático Online", "desc": "Escolha com antecedência o dia e horário que melhor se encaixam na sua rotina.", "price": "Online", "img": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80"},
            ],
            "theme_bg": "bg-[#0F172A] text-[#F8FAFC]",
            "card_bg": "bg-[#1E293B] border-[#334155] shadow-lg",
        }


def parse_lead_briefing(lead_raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai os campos estruturados de um Lead Briefing (nome comercial, cores hex,
    logotipo, endereço, telefone, horários) aplicando o Niche Profile como base.
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

    match_primary = re.search(
        r"(?:Cor principal|Cor Primária|Cor Primaria|cor_primaria_hex)[^#\n\r]*:\s*\"?(#[a-fA-F0-9]{6})",
        mensagem,
        re.IGNORECASE,
    ) or re.search(r"#[a-fA-F0-9]{6}", mensagem)

    if match_primary:
        primary_color = match_primary.group(1) if match_primary.groups() else match_primary.group(0)
    else:
        primary_color = profile["primary_color"]

    match_secondary = re.search(
        r"(?:Cor secundária|Cor Secundaria|cor_secundaria_hex)[^#\n\r]*:\s*\"?(#[a-fA-F0-9]{6})",
        mensagem,
        re.IGNORECASE,
    )
    if match_secondary:
        secondary_color = match_secondary.group(1)
    else:
        secondary_color = "#000000" if primary_color.upper() == "#FFFFFF" else "#1A1A1A"

    logo_match = re.search(r"https?://[^\s\"']+\.(?:png|jpg|jpeg|webp)", mensagem)
    logo_url = logo_match.group(0) if logo_match else "/logo.png"

    phone_match = (
        re.search(r"Telefone:\s*([^\n\r|]+)", mensagem, re.IGNORECASE)
        or re.search(r"Telefone\s*de\s*Contato:\s*([^\n\r|]+)", mensagem, re.IGNORECASE)
        or re.search(r"WhatsApp/Tel:\s*([^\n\r|]+)", mensagem, re.IGNORECASE)
    )
    phone = phone_match.group(1).strip() if phone_match else "(51) 99999-9999"

    address_match = re.search(r"Endereço:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    address = (
        address_match.group(1).strip()
        if address_match
        else "Av. Principal, 1000 - Centro - Porto Alegre/RS"
    )

    hours_match = re.search(r"Funcionamento:\s*([^\n\r]+)", mensagem, re.IGNORECASE) or re.search(
        r"Horários?:\s*([^\n\r]+)", mensagem, re.IGNORECASE
    )
    working_hours = (
        hours_match.group(1).strip() if hours_match else "Segunda a Sábado das 9h às 18h"
    )

    return {
        "app_name": app_name,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "logo_url": logo_url,
        "address": address,
        "working_hours": working_hours,
        "phone": phone,
    }


def extract_branding_from_report(report: str, contact_name: str = "") -> Dict[str, str]:
    """
    Extrai a paleta e cores hex primária/secundária de um relatório RAG (bloco JSON ou Markdown),
    recorrendo ao Niche Profile canônico quando ausentes.
    """
    palette_name = "Definida via IA"
    primary_hex = None
    secondary_hex = None

    json_match = re.search(r"```json\s*(\{.*?\})\s*```", report or "", re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            paleta = data.get("paleta_cores", {})
            if paleta.get("cor_primaria_hex"):
                primary_hex = paleta.get("cor_primaria_hex")
            if paleta.get("cor_secundaria_hex"):
                secondary_hex = paleta.get("cor_secundaria_hex")
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
        profile = resolve_niche_profile(report or "", app_name=contact_name)
        primary_hex = profile["primary_color"]
        secondary_hex = secondary_hex or profile["secondary_color"]
        palette_name = profile["palette_name"]

    if not secondary_hex:
        secondary_hex = "#1E293B"

    return {
        "palette_name": palette_name,
        "primary_color_hex": primary_hex,
        "secondary_color_hex": secondary_hex,
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
        return adapter if isinstance(adapter, ResilientLLM) else ResilientLLM(adapter, retry_delay=0.0)

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


def invoke_local_lm_studio_http(system_prompt: str, user_prompt: str, timeout: float = 120.0) -> Optional[str]:
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
        headers_list.append({"Content-Type": "application/json", "Authorization": "Bearer lm-studio"})

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
