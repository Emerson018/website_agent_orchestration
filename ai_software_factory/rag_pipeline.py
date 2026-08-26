import os
import re
import tempfile
import traceback
from typing import List, Dict, Any
import httpx
from bs4 import BeautifulSoup
import pdfplumber
from PIL import Image
import pytesseract
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do orquestrador
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
LOCAL_LLM_URL = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")

# Inicializa o cliente do Supabase
def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Configurações do Supabase ausentes no arquivo .env.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Modelo de embeddings local (carregado sob demanda em cache)
_embed_model = None

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        print("[RAG] Inicializando modelo de embeddings local all-MiniLM-L6-v2...")
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("[RAG] Modelo de embeddings inicializado com sucesso.")
    return _embed_model

def clean_text(text: str) -> str:
    """Limpa quebras de linha duplicadas e espaços em excesso."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def chunk_text(text: str, chunk_size: int = 600, overlap: int = 150) -> List[str]:
    """Divide o texto em blocos de caracteres com sobreposição."""
    text = clean_text(text)
    if not text:
        return []
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += (chunk_size - overlap)
    return chunks

async def extract_text_from_url(url: str, client: httpx.AsyncClient) -> str:
    """Faz o download e extrai o texto principal de uma URL/site antigo com fallback rápido para redes sociais."""
    try:
        print(f"[RAG] Scraping link: {url}")
        
        # Redes sociais bloqueiam scraping HTTP direto; extrai diretamente a conta/página de referência
        if "facebook.com" in url.lower() or "instagram.com" in url.lower():
            match_profile = re.search(r"(?:facebook\.com|instagram\.com)/([^/?#]+)", url, re.IGNORECASE)
            profile_name = match_profile.group(1) if match_profile else "Perfil Social"
            print(f"[RAG] Perfil de rede social identificado: {profile_name} em {url}")
            return f"Link de Rede Social do Estabelecimento: {url} (Nome do Perfil/Página: {profile_name})"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = await client.get(url, headers=headers, timeout=8.0, follow_redirects=True)
        if response.status_code != 200:
            return f"[Link de Referência {url} - Status HTTP {response.status_code}]"
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for script in soup(["script", "style", "meta", "noscript", "header", "footer", "nav"]):
            script.extract()
            
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        extracted = " ".join(chunk for chunk in chunks if chunk)
        return extracted if extracted else f"[Link de Referência Visitado: {url}]"
    except Exception as e:
        print(f"[RAG] Erro ou timeout ao raspar a URL {url}: {str(e)}")
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
        print(f"[RAG] Erro ao extrair texto do PDF: {str(e)}")
        return f"[Erro ao processar PDF: {str(e)}]"
    return "\n".join(text_content)

def extract_text_from_image(image_path: str) -> str:
    """Extrai texto de uma imagem usando pytesseract (OCR)."""
    try:
        img = Image.open(image_path)
        return pytesseract.image_to_string(img, lang='por+eng')
    except Exception as e:
        print(f"[RAG] Erro no OCR da imagem: {str(e)}")
        return f"[Erro no OCR da imagem: {str(e)}]"

async def download_and_extract_file(file_url: str, client: httpx.AsyncClient) -> str:
    """Baixa o arquivo da URL do Supabase Storage e extrai o texto com base na extensão."""
    try:
        print(f"[RAG] Baixando arquivo para processamento: {file_url}")
        # Baixa o arquivo para um arquivo temporário
        suffix = ""
        if ".pdf" in file_url.lower():
            suffix = ".pdf"
        elif ".png" in file_url.lower():
            suffix = ".png"
        elif ".jpg" in file_url.lower() or ".jpeg" in file_url.lower():
            suffix = ".jpg"
        elif ".webp" in file_url.lower():
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
                text = extract_text_from_pdf(tmp_path)
            elif suffix in [".png", ".jpg", ".webp"]:
                text = extract_text_from_image(tmp_path)
            else:
                # Trata como texto puro
                with open(tmp_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            return text
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        print(f"[RAG] Erro no processamento do arquivo {file_url}: {str(e)}")
        return f"[Erro no arquivo {file_url} - {str(e)}]"

def load_agent_prompt(rel_path: str) -> str:
    """Carrega o System Prompt de um arquivo de agente Markdown."""
    abs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), rel_path)
    if not os.path.exists(abs_path):
        return ""
    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"system_prompt:\s*\|\s*\n(.*?)(?=\n```|\Z)", content, re.DOTALL)
        if match:
            return match.group(1).strip()
        return content.strip()
    except Exception as e:
        print(f"[Multi-Agente] Erro ao carregar prompt {rel_path}: {e}")
        return ""

async def generate_rag_report(contact_name: str, doc_chunks: Any) -> str:
    """Executa o pipeline sequencial multi-agente: UX Researcher -> UI Designer -> AI Engineer."""
    if isinstance(doc_chunks, list):
        context = "\n\n---\n\n".join(doc_chunks[:15])
    else:
        context = str(doc_chunks)

    prompt_ux = load_agent_prompt("agents/design/ux-researcher.md")
    prompt_ui = load_agent_prompt("agents/design/ui-designer.md")
    prompt_ai = load_agent_prompt("agents/engineering/ai-engineer.md")

    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    google_key = os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if use_local or google_key or openai_key:
        try:
            from langchain_openai import ChatOpenAI
            if use_local:
                local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1")
                local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
                print(f"[Pipeline Multi-Agente] Executando 3 Agentes via LM Studio Local ({local_model})...")
                llm = ChatOpenAI(
                    model=local_model,
                    openai_api_key="lm-studio",
                    base_url=local_url,
                    temperature=0.2
                )
            elif google_key:
                print("[Pipeline Multi-Agente] Executando 3 Agentes via Gemini API (Nuvem rápida)...")
                llm = ChatOpenAI(
                    model="gemini-1.5-flash",
                    openai_api_key=google_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                )
            else:
                print("[Pipeline Multi-Agente] Executando 3 Agentes via OpenAI API...")
                llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

            # Agente 1: UX Researcher (Análise de Negócio & Vibe)
            print("[Pipeline Multi-Agente] Passo 1: Executando Agente UX Researcher...")
            input_ux = f"Cliente / Estabelecimento: {contact_name}\n\nConteúdo e dados brutos do briefing:\n{context}"
            res_ux = llm.invoke([
                {"role": "system", "content": prompt_ux or "Você é um UX Researcher especialista."},
                {"role": "user", "content": input_ux}
            ])
            output_ux = res_ux.content if hasattr(res_ux, 'content') else str(res_ux)

            # Agente 2: UI Designer (Tradução Visual & Cores HEX)
            print("[Pipeline Multi-Agente] Passo 2: Executando Agente UI Designer...")
            res_ui = llm.invoke([
                {"role": "system", "content": prompt_ui or "Você é um UI Designer especialista."},
                {"role": "user", "content": f"Diagnóstico de Marca & Vibe (UX Researcher):\n{output_ux}"}
            ])
            output_ui = res_ui.content if hasattr(res_ui, 'content') else str(res_ui)

            # Agente 3: AI Engineer (Geração de JSON Schema)
            print("[Pipeline Multi-Agente] Passo 3: Executando Agente AI Engineer (JSON Schema)...")
            res_ai = llm.invoke([
                {"role": "system", "content": prompt_ai or "Você é um AI Engineer. Retorne estritamente um objeto JSON válido."},
                {"role": "user", "content": f"Especificações Visuais Técnicas (UI Designer):\n{output_ui}"}
            ])
            output_ai = res_ai.content if hasattr(res_ai, 'content') else str(res_ai)

            # Relatório Consolidado Estruturado para o CRM
            full_report = (
                f"### 🔬 1. Diagnóstico de Marca & Público (UX Researcher)\n{output_ux}\n\n"
                f"---\n\n"
                f"### 🎨 2. Especificações Visuais & UX/UI (UI Designer)\n{output_ui}\n\n"
                f"---\n\n"
                f"### ⚙️ 3. Configuração de Arquitetura (AI Engineer - Schema JSON)\n```json\n{output_ai.strip()}\n```"
            )
            return full_report

        except Exception as err:
            print(f"[Pipeline Multi-Agente] Falha na execução do pipeline ({err}). Usando analista de fallback...")

    # Fallback Analítico Inteligente
    print("[Pipeline Multi-Agente] Gerando relatório via Fallback seguro...")
    return generate_fallback_rag_report(contact_name, context)

def generate_fallback_rag_report(contact_name: str, context: str) -> str:
    """Gera o relatório do pipeline dos 3 Agentes no formato estrito (UX Researcher -> UI Designer -> AI Engineer)."""
    import unicodedata

    def strip_accents(s: str) -> str:
        return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

    raw_text = (context + " " + contact_name).lower()
    text_norm = strip_accents(raw_text)

    # Usa regex com \b para evitar que sufixos como -cao (em avaliacao/notificacao) deem falso positivo para cao/pet
    if re.search(r"\b(odont|dente|dentes|sorriso|dentista|dentistas|saude|clinica|medico|doutor)\b", text_norm):
        nicho = "Saúde & Odontologia"
        vibe = "Clínico, Confiável, Limpo e Acolhedor"
        primary_hex = "#0EA5E9"
        secondary_hex = "#0284C7"
        bg_hex = "#F8FAFC"
        text_hex = "#0F172A"
        tema = "light"
        fonte_titulos = "Montserrat"
        fonte_corpo = "Inter"
        borda = "rounded-xl"
        estilo_botao = "flat"
        sombra = "shadow-sm"
        foto_estilo = "Imagens iluminadas, ambientes clínicos limpos e sorrisos naturais"
    elif re.search(r"\b(barbe|barba|barbearia|barbeiro|corte|navalha|pampas|homem|cabelo)\b", text_norm):
        nicho = "Barbearia & Estilo Masculino"
        vibe = "Vintage, Rústico Premium, Tradicional e Elegante"
        primary_hex = "#D4AF37"
        secondary_hex = "#1E293B"
        bg_hex = "#0F172A"
        text_hex = "#F8FAFC"
        tema = "dark"
        fonte_titulos = "Playfair Display"
        fonte_corpo = "Inter"
        borda = "rounded-md"
        estilo_botao = "shadow"
        sombra = "shadow-md"
        foto_estilo = "Fotografia com iluminação quente, tons ambar, textura de madeira e metais artesanais"
    elif re.search(r"\b(estetica|beleza|salao|hair|unha|unhas|spa|maquiagem|sobrancelha)\b", text_norm):
        nicho = "Estética & Beleza"
        vibe = "Sofisticado, Minimalista, Delicado e Relaxante"
        primary_hex = "#EC4899"
        secondary_hex = "#F472B6"
        bg_hex = "#FFF1F2"
        text_hex = "#1C1917"
        tema = "light"
        fonte_titulos = "Playfair Display"
        fonte_corpo = "Montserrat"
        borda = "rounded-2xl"
        estilo_botao = "shadow"
        sombra = "shadow-sm"
        foto_estilo = "Estética clean, detalhes delicados, tons pastel e iluminação de estúdio profissional"
    elif re.search(r"\b(gourmet|comida|restaurante|pizzaria|hamburgueria|cafe|doce|campeiro|fogao|alimento|refeicao|buffet|culinaria|marmita|prato)\b", text_norm):
        nicho = "Gastronomia & Alimentação"
        vibe = "Artesanal, Regional, Apetitoso e Acolhedor"
        primary_hex = "#EAB308"
        secondary_hex = "#DC2626"
        bg_hex = "#1C1917"
        text_hex = "#FAFAF9"
        tema = "dark"
        fonte_titulos = "Montserrat"
        fonte_corpo = "Inter"
        borda = "rounded-xl"
        estilo_botao = "gradient"
        sombra = "shadow-lg"
        foto_estilo = "Fotografia gastronômica detalhada, contraste marcante e elementos artesanais da culinária"
    elif re.search(r"\b(pet|petshop|veterinaria|veterinario|vet|cao|caes|gato|gatos|animal|animais|banho|tosa)\b", text_norm):
        nicho = "Petshop & Clínica Veterinária"
        vibe = "Alegre, Amigável, Vibrante e Confiável"
        primary_hex = "#F97316"
        secondary_hex = "#EA580C"
        bg_hex = "#FAFAF9"
        text_hex = "#1C1917"
        tema = "light"
        fonte_titulos = "Outfit"
        fonte_corpo = "Inter"
        borda = "rounded-2xl"
        estilo_botao = "flat"
        sombra = "shadow-md"
        foto_estilo = "Fotografia espontânea de animais saudáveis, ambiente alegre e colorido"
    else:
        nicho = "Serviços Gerais & Tecnologia"
        vibe = "Moderno, Tecnológico, Dinâmico e Profissional"
        primary_hex = "#6366F1"
        secondary_hex = "#4F46E5"
        bg_hex = "#0F172A"
        text_hex = "#F8FAFC"
        tema = "dark"
        fonte_titulos = "Outfit"
        fonte_corpo = "Inter"
        borda = "rounded-xl"
        estilo_botao = "flat"
        sombra = "shadow-sm"
        foto_estilo = "Interface vetorial minimalista, ícones limpos e estética digital de alta precisão"

    json_block = f"""{{
  "tema": "{tema}",
  "paleta_cores": {{
    "cor_primaria_hex": "{primary_hex}",
    "cor_secundaria_hex": "{secondary_hex}",
    "cor_fundo_hex": "{bg_hex}",
    "cor_texto_hex": "{text_hex}"
  }},
  "tipografia": {{
    "fonte_titulos": "{fonte_titulos}",
    "fonte_corpo": "{fonte_corpo}"
  }},
  "estilo_botoes": {{
    "formato_borda": "{borda}",
    "estilo_visual": "{estilo_botao}",
    "sombra": "{sombra}"
  }},
  "requisitos_fotos": {{
    "estilo_visual": "{foto_estilo}",
    "filtro_recomendado": "Tratamento de contraste e saturação otimizados"
  }}
}}"""

    report = (
        f"### 🔬 1. Diagnóstico de Marca & Público (UX Researcher)\n"
        f"- **Nicho de Atuação**: {nicho}\n"
        f"- **Público-Alvo**: Clientes do estabelecimento '{contact_name}' buscando agendamento digital rápido e conveniente.\n"
        f"- **Vibe & Atmosfera Emocional**: {vibe}.\n"
        f"- **Pilares da Marca**: Qualidade, Agilidade no Atendimento, Confiança e Experiência do Cliente.\n"
        f"- **Diretrizes para a Interface**: Interface PWA responsiva com fluxo intuitivo de reserva em 3 passos.\n\n"
        f"---\n\n"
        f"### 🎨 2. Especificações Visuais & UX/UI (UI Designer)\n"
        f"- **Tema Padrão**: {tema}\n"
        f"- **Paleta de Cores**: Primária {primary_hex}, Secundária {secondary_hex}, Fundo {bg_hex}, Texto {text_hex}.\n"
        f"- **Tipografia**: Títulos em {fonte_titulos}, Corpo em {fonte_corpo}.\n"
        f"- **Estilo de Componentes**: Bordas {borda}, Botões estilo {estilo_botao}, Sombras {sombra}.\n"
        f"- **Requisitos de Mídia**: {foto_estilo}.\n\n"
        f"---\n\n"
        f"### ⚙️ 3. Configuração de Arquitetura (AI Engineer - Schema JSON)\n```json\n{json_block}\n```"
    )

    return report

def extract_branding_from_report(report: str, contact_name: str = "") -> Dict[str, str]:
    """Extrai paleta e cores hex primária/secundária do relatório de 3 agentes ou do JSON embutido."""
    palette_name = "Definida via IA"
    primary_hex = None
    secondary_hex = None

    # Tenta extrair diretamente do bloco JSON do AI Engineer
    json_match = re.search(r"```json\s*(\{.*?\})\s*```", report, re.DOTALL)
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

    # Regex de busca direta em texto Markdown como fallback de extração
    if not primary_hex:
        primary_match = re.search(r"(?:Cor Primária|Primária)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})", report, re.IGNORECASE)
        if primary_match:
            primary_hex = primary_match.group(1)

    if not secondary_hex:
        secondary_match = re.search(r"(?:Cor Secundária|Secundária)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})", report, re.IGNORECASE)
        if secondary_match:
            secondary_hex = secondary_match.group(1)

    if not primary_hex:
        import unicodedata
        def strip_accents(s: str) -> str:
            return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

        text_lower = strip_accents((report + " " + contact_name).lower())
        if re.search(r"\b(odont|dente|dentes|sorriso|dentista|saude|clinica)\b", text_lower):
            primary_hex = "#0EA5E9"
            secondary_hex = secondary_hex or "#0284C7"
            palette_name = "Azul Clínico Confiável"
        elif re.search(r"\b(barbe|barba|barbearia|barbeiro|corte|navalha|pampas|homem)\b", text_lower):
            primary_hex = "#D4AF37"
            secondary_hex = secondary_hex or "#1E293B"
            palette_name = "Dourado & Ambar Vintage"
        elif re.search(r"\b(estetica|beleza|salao|hair|unha|spa|maquiagem)\b", text_lower):
            primary_hex = "#EC4899"
            secondary_hex = secondary_hex or "#F472B6"
            palette_name = "Rose & Gold Elegante"
        elif re.search(r"\b(gourmet|comida|restaurante|pizzaria|hamburgueria|cafe|fogao|campeiro)\b", text_lower):
            primary_hex = "#EAB308"
            secondary_hex = secondary_hex or "#DC2626"
            palette_name = "Gastronômico Vibrante"
        elif re.search(r"\b(pet|petshop|veterinaria|veterinario|vet|cao|caes|gato|animal)\b", text_lower):
            primary_hex = "#F97316"
            secondary_hex = secondary_hex or "#EA580C"
            palette_name = "Laranja Amigável"
        else:
            primary_hex = "#6366F1"
            secondary_hex = secondary_hex or "#4F46E5"
            palette_name = "Indigo Tech Moderno"

    if not secondary_hex:
        secondary_hex = "#1E293B"

    return {
        "palette_name": palette_name,
        "primary_color_hex": primary_hex,
        "secondary_color_hex": secondary_hex
    }

async def run_rag_analysis_pipeline(contact_id: str):
    """Executa todo o pipeline de RAG (extração, chunking, embeddings, banco e IA) para o contact_id."""
    supabase = get_supabase()
    
    # 1. Marca o status como 'processing'
    supabase.table("contacts").update({"rag_status": "processing"}).eq("id", contact_id).execute()
    print(f"[RAG] Iniciando processamento para o contato {contact_id}...")
    
    try:
        # 2. Busca os metadados do contato
        res = supabase.table("contacts").select("id, name, email, phone, company, additional_data").eq("id", contact_id).single().execute()
        contact = res.data
        if not contact:
            raise ValueError(f"Contato com ID {contact_id} não encontrado.")
            
        name = contact.get("name") or "Cliente Anonimo"
        additional_data = contact.get("additional_data") or {}
        
        files = additional_data.get("files") or []
        links = additional_data.get("links") or []
        texts = additional_data.get("texts") or []
        
        extracted_texts = []
        
        # 2.1 Adiciona dados cadastrais básicos do contato
        card_info = f"[Ficha do Cliente]: Nome: {name}"
        if contact.get("email"): card_info += f" | E-mail: {contact.get('email')}"
        if contact.get("phone"): card_info += f" | Telefone: {contact.get('phone')}"
        if contact.get("company"): card_info += f" | Empresa: {contact.get('company')}"
        extracted_texts.append(card_info)
        
        # 2.2 Busca histórico de mensagens do chat no WACRM
        try:
            conv_res = supabase.table("conversations").select("id").eq("contact_id", contact_id).execute()
            conv_ids = [c["id"] for c in (conv_res.data or []) if "id" in c]
            if conv_ids:
                msg_res = supabase.table("messages").select("content_text, sender_type").in_("conversation_id", conv_ids).order("created_at", desc=False).execute()
                if msg_res.data:
                    chat_msgs = [f"[{m.get('sender_type', 'chat')}]: {m.get('content_text', '')}" for m in msg_res.data if m.get("content_text")]
                    if chat_msgs:
                        extracted_texts.append("[Histórico de Mensagens / Lead]:\n" + "\n".join(chat_msgs))
        except Exception as msg_err:
            print(f"[RAG] Erro ao buscar mensagens do chat para RAG: {msg_err}")
            
        # 2.3 Busca notas internas salvas do contato
        try:
            notes_res = supabase.table("contact_notes").select("note_text").eq("contact_id", contact_id).execute()
            if notes_res.data:
                note_list = [n.get("note_text") for n in notes_res.data if n.get("note_text")]
                if note_list:
                    extracted_texts.append("[Notas Internas do CRM]:\n" + "\n".join(note_list))
        except Exception as note_err:
            print(f"[RAG] Erro ao buscar notas do contato para RAG: {note_err}")
        
        async with httpx.AsyncClient() as client:
            # Processa os Textos Livres
            for t in texts:
                label = t.get("label") or "Texto"
                text = t.get("text") or ""
                if text.strip():
                    extracted_texts.append(f"[{label}]: {text}")
            
            # Processa as URLs/Links adicionais (Scraping)
            for l in links:
                label = l.get("label") or "Link"
                url = l.get("url") or ""
                if url.strip():
                    text = await extract_text_from_url(url, client)
                    extracted_texts.append(f"[{label} - Fonte: {url}]: {text}")
                    
            # Processa os Arquivos Físicos (PDF/Imagens do Supabase Storage)
            for f in files:
                filename = f.get("name") or "Arquivo"
                file_url = f.get("url") or ""
                if file_url.strip():
                    text = await download_and_extract_file(file_url, client)
                    extracted_texts.append(f"[Arquivo: {filename}]: {text}")

        # 3. Une todos os textos extraídos em um texto completo consolidado
        full_text = "\n\n".join(extracted_texts)
        if not full_text.strip():
            full_text = f"[Ficha do Cliente]: Nome: {name}"

        print(f"[Análise Gemini] Compilação de texto concluída ({len(full_text)} caracteres). Gerando relatório direto via Gemini API...")
        
        # 4. Gera o relatório completo de análise de marca e requisitos usando a API do Gemini
        report = await generate_rag_report(name, full_text)
        
        # 5. Extrai o branding do relatório e atualiza o contato no Supabase
        branding_info = extract_branding_from_report(report, name)
        print(f"[Análise Gemini] Identidade visual / Branding inferido: {branding_info}")
        
        updated_additional_data = dict(additional_data)
        updated_additional_data["branding"] = branding_info
        
        supabase.table("contacts").update({
            "rag_status": "completed",
            "rag_report": report,
            "additional_data": updated_additional_data
        }).eq("id", contact_id).execute()
        print(f"[Análise Gemini] Análise de cliente concluída com sucesso para {name} ({contact_id})!")

    except Exception as e:
        error_msg = f"Erro no pipeline de RAG:\n{traceback.format_exc()}"
        print(f"[RAG] Erro crítico para o contato {contact_id}: {str(e)}")
        try:
            supabase.table("contacts").update({
                "rag_status": "failed",
                "rag_report": f"Falha na análise RAG:\n{str(e)}"
            }).eq("id", contact_id).execute()
        except Exception as update_err:
            print(f"[RAG] Erro ao tentar atualizar status de erro no banco: {str(update_err)}")
