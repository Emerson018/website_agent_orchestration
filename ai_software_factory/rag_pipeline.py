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
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client

# Carrega as variáveis de ambiente do orquestrador
from dotenv import load_dotenv
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

# Inicializa o modelo de embeddings local (carrega em cache)
# all-MiniLM-L6-v2 gera vetores de 384 dimensões
print("[RAG] Inicializando modelo de embeddings local all-MiniLM-L6-v2...")
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
print("[RAG] Modelo de embeddings inicializado com sucesso.")

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
    """Faz o download e extrai o texto principal de uma URL/site antigo."""
    try:
        print(f"[RAG] Scraping link: {url}")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = await client.get(url, headers=headers, timeout=20.0, follow_redirects=True)
        if response.status_code != 200:
            return f"[Erro ao raspar {url} (Status: {response.status_code})]"
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove tags indesejadas
        for script in soup(["script", "style", "meta", "noscript", "header", "footer", "nav"]):
            script.extract()
            
        text = soup.get_text()
        # Limpeza simples de linhas
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        return " ".join(chunk for chunk in chunks if chunk)
    except Exception as e:
        print(f"[RAG] Erro ao raspar a URL {url}: {str(e)}")
        return f"[Erro de scraping na URL: {url} - {str(e)}]"

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
                for chunk in response.iter_bytes():
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
- **Estilo Visual**: (Sugestão de tema, cores primárias/secundárias ideais para o segmento, tom de voz e referências de design extraídas)
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
    
    try:
        print(f"[RAG] Enviando prompt para o LM Studio Local ({LOCAL_LLM_URL}) usando o modelo {LOCAL_LLM_MODEL}...")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{LOCAL_LLM_URL}/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=120.0
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return f"[Erro ao chamar LM Studio (Status: {response.status_code})]"
    except Exception as e:
        print(f"[RAG] Falha ao comunicar com LM Studio: {str(e)}")
        return f"[Erro de IA: Não foi possível obter o relatório do LM Studio local. Certifique-se de que o LM Studio está rodando em {LOCAL_LLM_URL} com o modelo {LOCAL_LLM_MODEL} carregado. Detalhes: {str(e)}]"

async def run_rag_analysis_pipeline(contact_id: str):
    """Executa todo o pipeline de RAG (extração, chunking, embeddings, banco e IA) para o contact_id."""
    supabase = get_supabase()
    
    # 1. Marca o status como 'processing'
    supabase.table("contacts").update({"rag_status": "processing"}).eq("id", contact_id).execute()
    print(f"[RAG] Iniciando processamento para o contato {contact_id}...")
    
    try:
        # 2. Busca os metadados do contato
        res = supabase.table("contacts").select("name, additional_data").eq("id", contact_id).single().execute()
        contact = res.data
        if not contact:
            raise ValueError(f"Contato com ID {contact_id} não encontrado.")
            
        name = contact.get("name") or "Cliente Anonimo"
        additional_data = contact.get("additional_data") or {}
        
        files = additional_data.get("files") or []
        links = additional_data.get("links") or []
        texts = additional_data.get("texts") or []
        
        extracted_texts = []
        
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
            # Se não há texto algum enviado
            supabase.table("contacts").update({
                "rag_status": "completed",
                "rag_report": "Nenhum dado ou texto válido foi enviado para análise RAG."
            }).eq("id", contact_id).execute()
            return

        # 4. Gera embeddings locais para cada chunk
        print("[RAG] Gerando embeddings locais para os chunks...")
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
        
        # 7. Gera o relatório final de IA usando o LM Studio
        report = await generate_rag_report(name, chunks)
        
        # 8. Atualiza o contato com o relatório final e status 'completed'
        supabase.table("contacts").update({
            "rag_status": "completed",
            "rag_report": report
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
