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

async def generate_rag_report(contact_name: str, doc_chunks: List[str]) -> str:
    """Chama o LM Studio local para gerar um relatório consolidado com base no contexto do RAG."""
    # Junta as partes mais relevantes do contexto
    context = "\n\n---\n\n".join(doc_chunks[:15]) # limita para não estourar a janela do LLM local
    
    prompt = f"""Você é o Analista de Requisitos e Designer de UX Principal da Fábrica de IA.
O foco principal deste projeto é criar um **Agendador no estilo PWA (Progressive Web App)** para o cliente. Os módulos de site institucional, aplicativo mobile nativo e agendador de WhatsApp são opcionais/secundários.

Seu objetivo é analisar todo o material enviado pelo cliente '{contact_name}' (arquivos, textos, links raspados) e estruturar um relatório de especificações e diretrizes conceituais do agendador. Esse relatório será exibido para o administrador do CRM revisar, editar e validar a coerência com a ideia principal e nicho de negócio ("sentido da loja") antes de iniciarmos a geração de código.

⚠️ INSTRUÇÃO IMPORTANTE DE ANÁLISE: Como removemos a coleta manual direta de dados de serviços, preços, profissionais, horários de funcionamento e duração média dos serviços no formulário do lead, você DEVE analisar minuciosamente os links de referência raspados e o conteúdo de texto extraído dos arquivos de apoio enviados pelo cliente (catálogos, cardápios, tabelas, etc.) para identificar e extrair essas informações. Caso esses dados não estejam explícitos nos materiais enviados, você deve deduzir e propor sugestões profissionais altamente coerentes e prontas para o nicho de mercado do estabelecimento.

Abaixo está todo o contexto extraído dos materiais do cliente:
{context}

Com base nas informações acima, gere um relatório detalhado, profissional e altamente estruturado em Markdown, contendo exatamente as seguintes seções:

### 📅 1. Escopo Principal: Agendador PWA
- **Objetivo do Agendador**: (O problema que resolve, público-alvo, conveniência da instalação como app/PWA)
- **Serviços a Agendar**: (Lista de serviços identificada ou recomendada para o segmento, preços estimados, e durações médias de atendimento)
- **Profissionais/Recursos**: (Se há indicação de profissionais específicos, equipes, salas ou equipamentos a serem selecionados no agendamento)
- **Regras e Horários**: (Horários de funcionamento indicados, prazos de cancelamento, regras de agendamento identificadas ou sugeridas)

### 🛍️ 2. Coerência com a Loja / Nicho do Negócio
- **Nicho de Mercado**: (Setor de atuação e público prioritário)
- **Análise do "Sentido da Loja"**: (Como o agendamento se integra à proposta de valor do negócio, e o que é indispensável para este segmento específico)

### 🎨 3. Direcionamento Visual e de Interface (UX/UI)
- **Paleta Recomendada**: (Defina o nome do conceito visual ideal para este nicho, ex: Azul Clínico Confiável, Dourado & Ambar Vintage, Rose & Gold Elegante, Laranja Amigável, etc.)
- **Cor Primária (Hex)**: #HEXCODE (Defina o código de cor hexadecimal primária ideal para a marca do cliente, ex: #0EA5E9 para odontologia/saúde, #D4AF37 para barbearia, #EC4899 para estética/beleza, #F97316 para petshop, #6366F1 para tecnologia)
- **Cor Secundária (Hex)**: #HEXCODE (Defina o código de cor hexadecimal secundária complementar)
- **Estilo Visual e Tom de Voz**: (Diretrizes de layout, tipografia, e referências de design extraídas do nicho)
- **Instalabilidade & Offline (PWA)**: (Como deve ser a experiência visual na tela inicial do celular do usuário e comportamento offline)

### 🌐 4. Módulos Secundários Sugeridos
- **Site Institucional**: (Seções recomendadas para a vitrine institucional integrada ao agendador)
- **Integração de WhatsApp / Robô**: (Como a IA no WhatsApp deve abordar o cliente para agendar de forma fluida)
- **Aplicativo Mobile Nativo**: (Recursos adicionais sugeridos caso o cliente queira migrar para as lojas de apps futuramente)

### 📌 5. Dados de Contato e Suporte
- **Informações do Cliente**: (Localização, telefone, e-mail, redes sociais e links importantes mapeados)

Se alguma seção não possuir informações específicas no contexto, forneça sugestões profissionais e criativas totalmente adequadas ao nicho do cliente.
Seja preciso, técnico e detalhista. Escreva em português."""

    payload = {
        "model": LOCAL_LLM_MODEL,
        "messages": [
            {"role": "system", "content": "Você é um especialista em análise de requisitos de software e design de UX."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    if use_local:
        candidate_urls = [
            LOCAL_LLM_URL,
            "http://127.0.0.1:1234/v1",
            "http://localhost:1234/v1",
            "http://127.0.0.1:63805/v1"
        ]
        seen = set()
        urls_unique = [x for x in candidate_urls if not (x in seen or seen.add(x))]
        
        for url in urls_unique:
            try:
                print(f"[RAG] Enviando prompt para o LM Studio Local ({url}) usando o modelo {LOCAL_LLM_MODEL}...")
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{url}/chat/completions",
                        json=payload,
                        headers={"Content-Type": "application/json"}
                    )
                    if response.status_code == 200:
                        result = response.json()
                        return result["choices"][0]["message"]["content"]
                    else:
                        print(f"[RAG] LM Studio em {url} respondeu status {response.status_code}.")
            except Exception as e:
                print(f"[RAG] Erro ao conectar em {url}: {str(e)}")
            
    # Provedor Gemini / OpenAI Fallback se configurado
    google_key = os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    
    if google_key or openai_key:
        try:
            from langchain_openai import ChatOpenAI
            if google_key:
                print("[RAG] Usando Gemini API para relatório RAG...")
                llm = ChatOpenAI(
                    model="gemini-1.5-flash",
                    openai_api_key=google_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                )
            else:
                print("[RAG] Usando OpenAI API para relatório RAG...")
                llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
                
            res = llm.invoke([
                {"role": "system", "content": "Você é um especialista em análise de requisitos de software e design de UX."},
                {"role": "user", "content": prompt}
            ])
            if res and res.content:
                return res.content
        except Exception as llm_err:
            print(f"[RAG] Falha ao invocar LLM em nuvem ({llm_err}). Usando analista de fallback...")

    # Fallback Analítico Inteligente
    print("[RAG] Gerando relatório de análise RAG estruturado via Fallback inteligente...")
    return generate_fallback_rag_report(contact_name, context)

def generate_fallback_rag_report(contact_name: str, context: str) -> str:
    """Gera um relatório RAG estruturado completo em Markdown via análise de fallback inteligente."""
    branding = extract_branding_from_report(context, contact_name)
    palette_name = branding["palette_name"]
    primary_hex = branding["primary_color_hex"]
    secondary_hex = branding["secondary_color_hex"]
    
    text_lower = (context + " " + contact_name).lower()
    
    if any(x in text_lower for x in ["odont", "dente", "sorriso", "dentist", "saude", "clinic"]):
        nicho = "Saúde & Odontologia"
        servicos = "- Clareamento Dental (R$ 350, 45 min)\n- Limpeza e Profilaxia (R$ 180, 30 min)\n- Avaliação Inicial (R$ 100, 30 min)"
        profissionais = "Cirurgiões Dentistas e Especialistas"
        estilo = "Visual clean, tons de azul e branco transmitindo máxima higiene, confiança e serenidade."
    elif any(x in text_lower for x in ["barbe", "barba", "corte", "navalha", "pampas", "homem"]):
        nicho = "Barbearia & Estilo Masculino"
        servicos = "- Corte de Cabelo (R$ 60, 35 min)\n- Barba com Toalha Quente (R$ 50, 30 min)\n- Combo Cabelo + Barba (R$ 100, 60 min)"
        profissionais = "Barbeiros Especialistas"
        estilo = "Estilo vintage e rústico premium, tons escuros e ambar transmitindo tradição e elegância."
    elif any(x in text_lower for x in ["estetic", "beleza", "salao", "hair", "unha", "spa", "maquiagem"]):
        nicho = "Estética & Beleza"
        servicos = "- Limpeza de Pele Profunda (R$ 150, 50 min)\n- Massagem Modeladora (R$ 180, 45 min)\n- Manicure & Pedicure (R$ 80, 40 min)"
        profissionais = "Esteticistas e Terapeutas"
        estilo = "Estilo sofisticado e minimalista, tons suaves de rosé e dourado."
    elif any(x in text_lower for x in ["pet", "veterinar", "cao", "gato", "animal"]):
        nicho = "Petshop & Clínica Veterinária"
        servicos = "- Banho e Tosa Completa (R$ 90, 60 min)\n- Consulta Veterinária (R$ 160, 30 min)\n- Vacinação (R$ 80, 20 min)"
        profissionais = "Veterinários e Tosadores"
        estilo = "Visual alegre, acolhedor e dinâmico, tons quentes e amigáveis."
    elif any(x in text_lower for x in ["gourmet", "comida", "restaurante", "pizz", "hambur", "cafe", "doce", "campeiro", "fogao"]):
        nicho = "Gastronomia & Alimentação"
        servicos = "- Reserva de Mesa Especial (Gratuito, 120 min)\n- Encomendas & Eventos (Sob consulta)\n- Degustação Harmonizada (R$ 120, 90 min)"
        profissionais = "Chefs e Equipe de Atendimento"
        estilo = "Visual acolhedor e apetitoso, valorizando o ambiente artesanal e regional."
    else:
        nicho = "Serviços Gerais & Tecnologia"
        servicos = "- Consultoria Inicial (R$ 200, 60 min)\n- Atendimento Especializado (R$ 150, 45 min)\n- Suporte Técnico (R$ 100, 30 min)"
        profissionais = "Especialistas e Consultores"
        estilo = "Design moderno, focado em alta tecnologia e usabilidade fluida."

    report = f"""### 📅 1. Escopo Principal: Agendador PWA
- **Objetivo do Agendador**: Proporcionar conveniência e facilidade de agendamento online para os clientes do estabelecimento '{contact_name}', funcionando como aplicativo PWA instalável na tela inicial.
- **Serviços a Agendar**:
{servicos}
- **Profissionais/Recursos**: {profissionais}
- **Regras e Horários**: Atendimento de Segunda a Sábado das 09h às 19h. Cancelamentos permitidos com até 2h de antecedência.

### 🛍️ 2. Coerência com a Loja / Nicho do Negócio
- **Nicho de Mercado**: {nicho}
- **Análise do "Sentido da Loja"**: O agendamento simplificado atende diretamente a demanda do público prioritário, eliminando filas e garantindo previsibilidade de atendimento.

### 🎨 3. Direcionamento Visual e de Interface (UX/UI)
- **Paleta Recomendada**: {palette_name}
- **Cor Primária (Hex)**: {primary_hex}
- **Cor Secundária (Hex)**: {secondary_hex}
- **Estilo Visual e Tom de Voz**: {estilo}
- **Instalabilidade & Offline (PWA)**: Ícone personalizado com a marca '{contact_name}', suporte a funcionamento offline e notificações de lembrete.

### 🌐 4. Módulos Secundários Sugeridos
- **Site Institucional**: Vitrine moderna exibindo diferenciais, galeria de fotos e depoimentos de clientes.
- **Integração de WhatsApp / Robô**: Atendimento automático via inteligência artificial para tirar dúvidas e agendar direto no chat.
- **Aplicativo Mobile Nativo**: Opção futura para publicação nas lojas Google Play e App Store.

### 📌 5. Dados de Contato e Suporte
- **Informações do Cliente**: Atendimento integrado para o estabelecimento {contact_name}."""

    return report

def extract_branding_from_report(report: str, contact_name: str = "") -> Dict[str, str]:
    """Extrai paleta e cores hex primária/secundária do relatório RAG ou define com base no segmento."""
    palette_name = "Definida via RAG"
    primary_hex = None
    secondary_hex = None
    
    palette_match = re.search(r"(?:Paleta Recomendada|Paleta Sugerida|Paleta)[^:\n\r]*:\s*\*?\*?\s*([^\n\r*]+)", report, re.IGNORECASE)
    if palette_match:
        palette_name = palette_match.group(1).strip()
        
    primary_match = re.search(r"(?:Cor Primária|Cor principal|Cor Primaria)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})", report, re.IGNORECASE)
    if primary_match:
        primary_hex = primary_match.group(1)
        
    secondary_match = re.search(r"(?:Cor Secundária|Cor secundaria)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})", report, re.IGNORECASE)
    if secondary_match:
        secondary_hex = secondary_match.group(1)
        
    if not primary_hex:
        text_lower = (report + " " + contact_name).lower()
        if any(x in text_lower for x in ["odont", "dente", "sorriso", "dentist", "saude", "clinic"]):
            primary_hex = "#0EA5E9"
            secondary_hex = secondary_hex or "#0284C7"
            if palette_name == "Definida via RAG": palette_name = "Azul Clínico Confiável"
        elif any(x in text_lower for x in ["barbe", "barba", "corte", "navalha", "pampas", "homem"]):
            primary_hex = "#D4AF37"
            secondary_hex = secondary_hex or "#1E293B"
            if palette_name == "Definida via RAG": palette_name = "Dourado & Ambar Vintage"
        elif any(x in text_lower for x in ["estetic", "beleza", "salao", "hair", "unha", "spa", "maquiagem"]):
            primary_hex = "#EC4899"
            secondary_hex = secondary_hex or "#F472B6"
            if palette_name == "Definida via RAG": palette_name = "Rose & Gold Elegante"
        elif any(x in text_lower for x in ["pet", "veterinar", "cao", "gato", "animal"]):
            primary_hex = "#F97316"
            secondary_hex = secondary_hex or "#EA580C"
            if palette_name == "Definida via RAG": palette_name = "Laranja Amigável"
        elif any(x in text_lower for x in ["gourmet", "comida", "restaurante", "pizz", "hambur", "cafe", "doce", "campeiro", "fogao"]):
            primary_hex = "#EAB308"
            secondary_hex = secondary_hex or "#DC2626"
            if palette_name == "Definida via RAG": palette_name = "Gastronômico Vibrante"
        else:
            primary_hex = "#6366F1"
            secondary_hex = secondary_hex or "#4F46E5"
            if palette_name == "Definida via RAG": palette_name = "Indigo Tech Moderno"
            
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

        # 3. Une todos os textos extraídos e divide em blocos (chunks)
        full_text = "\n\n".join(extracted_texts)
        chunks = chunk_text(full_text)
        
        print(f"[RAG] Extração concluída. Total de blocos (chunks) gerados: {len(chunks)}")
        
        if not chunks:
            # Fallback seguro com o nome do contato se por algum motivo extremo não gerar chunks
            chunks = [f"[Ficha do Cliente]: Nome: {name}"]

        # 4. Gera embeddings locais para cada chunk
        print("[RAG] Gerando embeddings locais para os chunks...")
        embed_model = get_embed_model()
        embeddings = embed_model.encode(chunks).tolist()
        
        # 5. Remove chunks antigos deste contato para evitar duplicatas
        supabase.table("contact_document_chunks").delete().eq("contact_id", contact_id).execute()
        
        # 6. Salva os novos chunks e embeddings no Supabase
        records_to_insert = []
        for i, chunk in enumerate(chunks):
            records_to_insert.append({
                "contact_id": contact_id,
                "content": chunk,
                "embedding": embeddings[i],
                "metadata": {"chunk_index": i}
            })
            
        supabase.table("contact_document_chunks").insert(records_to_insert).execute()
        print(f"[RAG] {len(chunks)} blocos e vetores gravados no banco de dados com sucesso.")
        
        # 7. Gera o relatório final de IA
        report = await generate_rag_report(name, chunks)
        
        # 8. Extrai o branding do relatório RAG e atualiza o contato
        branding_info = extract_branding_from_report(report, name)
        print(f"[RAG] Identidade visual / Branding inferido via RAG: {branding_info}")
        
        updated_additional_data = dict(additional_data)
        updated_additional_data["branding"] = branding_info
        
        supabase.table("contacts").update({
            "rag_status": "completed",
            "rag_report": report,
            "additional_data": updated_additional_data
        }).eq("id", contact_id).execute()
        print(f"[RAG] Pipeline RAG concluído com sucesso para o contato {name} ({contact_id})!")

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
