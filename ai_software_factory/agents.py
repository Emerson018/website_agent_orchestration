import sys
import re
import os
import httpx

# Garante codificação UTF-8 no console do Windows para evitar UnicodeEncodeError
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import shutil
import json
import subprocess
from typing import Dict, Any, List
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from ai_software_factory.state import AgentState
from ai_software_factory.schemas import ClientConfig

# Carrega chaves de API do arquivo .env
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

def parse_fallback_requirements(lead_raw: Dict[str, Any]) -> Dict[str, Any]:
    mensagem = lead_raw.get("mensagem", "")
    
    # Tenta extrair o nome do negócio por regex
    match_name = re.search(r"negócio chamado '([^']+)'", mensagem)
    if not match_name:
        match_name = re.search(r"chamada '([^']+)'", mensagem)
    if not match_name:
        match_name = re.search(r"chamado '([^']+)'", mensagem)
    app_name = match_name.group(1) if match_name else lead_raw.get("app_name", "AppCustomizado")
    
    # Tenta extrair a cor principal por qualquer padrão de Hex no texto
    match_primary = re.search(r"(?:Cor principal|Cor Primária|Cor Primaria)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})", mensagem, re.IGNORECASE)
    if not match_primary:
        match_primary = re.search(r"#[a-fA-F0-9]{6}", mensagem)
        
    if match_primary:
        primary_color = match_primary.group(1) if match_primary.groups() else match_primary.group(0)
    else:
        # Inferência de cor inteligente por segmento de mercado (nicho)
        msg_lower = (mensagem + " " + app_name).lower()
        if any(x in msg_lower for x in ["odont", "dente", "sorriso", "dentist", "saude", "clinic"]):
            primary_color = "#0EA5E9" # Sky Blue
        elif any(x in msg_lower for x in ["barbe", "barba", "corte", "navalha", "pampas", "homem"]):
            primary_color = "#D4AF37" # Gold / Amber
        elif any(x in msg_lower for x in ["estetic", "beleza", "salao", "hair", "unha", "spa"]):
            primary_color = "#EC4899" # Rose Pink
        elif any(x in msg_lower for x in ["pet", "veterinar", "cao", "gato", "animal"]):
            primary_color = "#F97316" # Warm Orange
        elif any(x in msg_lower for x in ["gourmet", "comida", "restaurante", "pizz", "hambur", "cafe"]):
            primary_color = "#EAB308" # Golden Yellow
        else:
            primary_color = "#6366F1" # Indigo Moderno
            
    match_secondary = re.search(r"(?:Cor secundária|Cor Secundaria)[^#\n\r]*:\s*(#[a-fA-F0-9]{6})", mensagem, re.IGNORECASE)
    secondary_color = match_secondary.group(1) if match_secondary else ("#000000" if primary_color.upper() == "#FFFFFF" else "#1A1A1A")

    # Tenta extrair logo_url de URL de imagem nos arquivos ou links
    logo_match = re.search(r"https?://[^\s\"']+\.(?:png|jpg|jpeg|webp)", mensagem)
    logo_url = logo_match.group(0) if logo_match else "/logo.png"

    # Tenta extrair telefone do padrão
    phone_match = re.search(r"Telefone:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    if not phone_match:
        phone_match = re.search(r"Telefone\s*de\s*Contato:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    phone = phone_match.group(1).strip() if phone_match else "(51) 99999-9999"

    # Tenta extrair endereço
    address_match = re.search(r"Endereço:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    address = address_match.group(1).strip() if address_match else "Av. Principal, 1000 - Centro - Porto Alegre/RS"

    # Tenta extrair horário
    hours_match = re.search(r"Funcionamento:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    if not hours_match:
        hours_match = re.search(r"Horários?:\s*([^\n\r]+)", mensagem, re.IGNORECASE)
    working_hours = hours_match.group(1).strip() if hours_match else "Segunda a Sábado das 9h às 18h"
    
    return {
        "app_name": app_name,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "logo_url": logo_url,
        "address": address,
        "working_hours": working_hours,
        "phone": phone
    }

def requirements_analyst_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente Analista de Requisitos (Real com Fallback Seguro):
    Lê os dados brutos do lead, envia para a LLM se a chave estiver configurada,
    caso contrário executa uma extração base estruturada como fallback.
    """
    print("\n--- [Agente: Analista de Requisitos] ---")
    lead_raw = state.get("lead_raw_json", {})
    print(f"Analisando lead_raw_json recebido: {lead_raw}")
    
    # Verifica a existência de chaves de API para chamada da LLM ou LLM local
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    
    if use_local:
        local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1")
        local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
        print(f"[Analista de Requisitos] USE_LOCAL_LLM é true. Invocando LLM local {local_model} em {local_url}...")
        llm = ChatOpenAI(
            model=local_model,
            openai_api_key="lm-studio",
            base_url=local_url,
            temperature=0
        )
        use_llm = True
    elif openai_key:
        print("[Analista de Requisitos] OPENAI_API_KEY configurada. Invocando LLM OpenAI real...")
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        use_llm = True
    elif google_key:
        print("[Analista de Requisitos] GOOGLE_API_KEY configurada. Invocando Gemini real via endpoint compatível...")
        llm = ChatOpenAI(
            model="gemini-1.5-flash",
            openai_api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        use_llm = True
    else:
        use_llm = False
    
    if not use_llm:
        print("[Analista de Requisitos] AVISO: Nenhuma chave de API de LLM configurada.")
        print("Executando fallback local para simular a extração da estrutura ClientConfig...")
        custom_reqs = parse_fallback_requirements(lead_raw)
        log_msg = "[RequirementsAnalyst] Requisitos estruturados via Fallback seguro (chave de API ausente)."
    else:
        try:
            system_prompt = (
                "Você é um Diretor de Arte e Arquiteto de Software Web especialista.\n"
                "Sua missão é analisar TODOS os dados brutos e históricos enviados pelo cliente (mensagens, links de referências, "
                "anotações de contatos e preferências) para estruturar a identidade visual e funcionalidade ideal do novo site PWA.\n\n"
                "O NOVO SITE SERÁ GERADO COM BASE NA ARQUITETURA DO NOSSO TEMPLATE OURO (gold_templates/template_base_app):\n"
                "- React + Tailwind CSS com temas responsivos e suporte a Dark/Light Mode.\n"
                "- Integração Serverless com Supabase (autenticação, agendamento de serviços, formulários de contato).\n"
                "- PWA instalável para dispositivos móveis.\n\n"
                "REGRAS DE ANÁLISE DE MARCA E IDENTIDADE:\n"
                "1. app_name: Nome comercial legível da empresa (ex: Barbearia Navalha de Ouro, Sorriso Perfeito).\n"
                "2. primary_color / secondary_color: Cores hexadecimais (#HEXHEX) elegantes e harmoniosas. "
                "Aplique a psicologia das cores adequada ao nicho do cliente.\n"
                "3. address / working_hours / phone: Dados de contato reais e completos do cliente.\n"
                "4. niche: O segmento/mercado da empresa (ex: Odontologia, Barbearia, Pet Shop, Estética, Gastronomia).\n"
                "5. tagline: Slogan marcante e atraente para o topo (Hero) do site.\n"
                "6. color_reasoning: Breve explicação da escolha da paleta de cores.\n"
                "7. recommended_sections: Seções essenciais para o site (ex: Hero, Serviços, Sobre Nós, Agendamento, Depoimentos, Contato).\n\n"
                "RETORNE ESTRITAMENTE UM OBJETO JSON VÁLIDO contendo as chaves: app_name, primary_color, secondary_color, logo_url, address, working_hours, phone, niche, tagline, color_reasoning, recommended_sections."
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "Dados brutos e informações completas do lead/cliente:\n{lead_raw_json}")
            ])
            
            if use_local:
                # Invocação direta para o LM Studio Local com parsing JSON robusto
                formatted_messages = prompt.format_messages(lead_raw_json=json.dumps(lead_raw, ensure_ascii=False))
                raw_res = llm.invoke(formatted_messages)
                content = raw_res.content if hasattr(raw_res, 'content') else str(raw_res)
                
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    parsed_json = json.loads(json_match.group(0))
                else:
                    parsed_json = json.loads(content)
                
                fallback_base = parse_fallback_requirements(lead_raw)
                for k, v in parsed_json.items():
                    if v and str(v).strip():
                        fallback_base[k] = v
                custom_reqs = fallback_base
                log_msg = f"[RequirementsAnalyst] Requisitos e layout analisados via LM Studio Local ({local_model}) com sucesso."
            else:
                structured_llm = llm.with_structured_output(ClientConfig)
                chain = prompt | structured_llm
                result: ClientConfig = chain.invoke({"lead_raw_json": json.dumps(lead_raw, ensure_ascii=False)})
                custom_reqs = result.model_dump()
                log_msg = "[RequirementsAnalyst] Requisitos e arquitetura de marca analisados via LLM/Gemini com sucesso."
        except Exception as e:
            print(f"[Analista de Requisitos] AVISO: Falha ao chamar a LLM ({str(e)}). Executando fallback local inteligente...")
            custom_reqs = parse_fallback_requirements(lead_raw)
            log_msg = f"[RequirementsAnalyst] Requisitos estruturados via Fallback inteligente devido a exceção: {str(e)}"

    
    template = "gold_templates/template_base_app"
    
    print(f"Requisitos extraídos: {custom_reqs}")
    print(f"Template ouro selecionado: {template}")
    
    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(log_msg)
    
    return {
        "customization_requirements": custom_reqs,
        "template_path": template,
        "execution_logs": current_logs
    }

def infra_cloner_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente Infraestrutura / Clonador (Real):
    Cria a pasta do workspace e copia todo o conteúdo do Template Ouro
    para o diretório correspondente ao app customizado.
    """
    print("\n--- [Agente: Infraestrutura / Clonador] ---")
    template = state.get("template_path", "gold_templates/template_base_app")
    reqs = state.get("customization_requirements", {})
    app_name = reqs.get("app_name", "AppCustomizado")
    
    # Limpa o app_name para criar um nome de pasta seguro em snake_case/sem espaços/letra minúscula
    app_name_limpo = re.sub(r'\s+', '_', app_name)
    app_name_limpo = re.sub(r'[^a-zA-Z0-9_]', '', app_name_limpo)
    app_name_limpo = app_name_limpo.lower().strip()
    if not app_name_limpo:
        app_name_limpo = "app_customizado"
    
    target_project = f"workspace/{app_name_limpo}"
    
    print(f"Copiando fisicamente o Template Ouro de '{template}' para '{target_project}'...")
    
    # Realiza a cópia recursiva dos arquivos
    shutil.copytree(template, target_project, dirs_exist_ok=True)
    print("Cópia de arquivos concluída com sucesso.")
    
    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(f"[InfraCloner] Template clonado com sucesso para {target_project}.")
    
    return {
        "target_project_path": target_project,
        "execution_logs": current_logs
    }

def generate_fallback_landing_page_code(app_name: str, primary_color: str, secondary_color: str, mensagem: str, is_nextjs: bool = False) -> str:
    # Identifica o tipo de negócio na mensagem
    is_barber = any(x in app_name.lower() or x in mensagem.lower() for x in ["barbearia", "barba", "corte", "navalha", "pampas", "barber"])
    is_dental = any(x in app_name.lower() or x in mensagem.lower() for x in ["odont", "sorriso", "dentist", "dente", "clinic"])
    is_beauty = any(x in app_name.lower() or x in mensagem.lower() for x in ["estetic", "beleza", "salao", "hair", "unha", "spa"])
    is_food = any(x in app_name.lower() or x in mensagem.lower() for x in ["fogao", "campeiro", "restaurante", "gourmet", "comida", "pizz", "hambur", "cafe", "doce", "culinaria", "marmita", "prato", "alimento"])
    
    if is_food:
        hero_title = "O Autêntico Sabor no Fogão a Lenha e Tradição"
        hero_desc = f"Bem-vindo ao {app_name}. Saboreie pratos artesanais da culinária regional com receitas tradicionais, tempero caseiro e ambiente acolhedor."
        services = [
            {"name": "Pratos Típicos no Fogão", "desc": "Receitas tradicionais preparadas lentamente no fogão a lenha com ingredientes selecionados.", "price": "R$ 45"},
            {"name": "Reserva de Mesas Online", "desc": "Garanta seu lugar e de sua família com antecedência sem filas de espera.", "price": "Gratuito"},
            {"name": "Degustação & Eventos", "desc": "Buffet temático e pratos sob encomenda para momentos especiais.", "price": "Sob consulta"}
        ]
        visual_theme = "bg-[#1C1917] text-[#FAFAF9]"
        card_theme = "bg-[#272425] border-[#3E3A3B] shadow-lg"
    elif is_barber:
        hero_title = "Estilo e Tradição Para o Homem Moderno"
        hero_desc = f"Bem-vindo à {app_name}. Aliamos técnicas clássicas de barbearia a um ambiente premium e atendimento personalizado."
        services = [
            {"name": "Corte de Cabelo", "desc": "Corte moderno ou clássico com lavagem e finalização premium.", "price": "R$ 60"},
            {"name": "Barba e Toalha Quente", "desc": "Barba feita na navalha com hidratação, óleo e toalha quente relaxante.", "price": "R$ 50"},
            {"name": "Combo Premium", "desc": "Corte + Barba + Sobrancelha com cortesia exclusiva.", "price": "R$ 100"}
        ]
        visual_theme = "bg-gray-950 text-gray-100"
        card_theme = "bg-gray-900 border-gray-800"
    elif is_dental:
        hero_title = "O Sorriso Perfeito Que Você Sempre Sonhou"
        hero_desc = f"Na {app_name}, oferecemos tratamentos odontológicos avançados com tecnologia de ponta e equipe especializada para cuidar do seu sorriso."
        services = [
            {"name": "Clareamento Dental", "desc": "Técnicas a laser e caseira para deixar seu sorriso mais branco e radiante.", "price": "Consulte"},
            {"name": "Implantes e Próteses", "desc": "Reabilitação oral completa com materiais de alta qualidade e durabilidade.", "price": "Consulte"},
            {"name": "Ortodontia Invisível", "desc": "Alinhadores transparentes modernos para alinhar seus dentes com total discrição.", "price": "Consulte"}
        ]
        visual_theme = "bg-slate-50 text-slate-800"
        card_theme = "bg-white border-slate-100 shadow-md"
    elif is_beauty:
        hero_title = "Realce Sua Beleza Natural Com Nossos Tratamentos"
        hero_desc = f"Descubra a melhor versão de si mesma na {app_name}. Clínicas de estética facial, corporal e tratamentos de alta performance."
        services = [
            {"name": "Limpeza de Pele Profunda", "desc": "Remoção de impurezas, hidratação profunda e renovação celular.", "price": "R$ 120"},
            {"name": "Massagem Modeladora", "desc": "Redução de medidas, drenagem linfática e tonificação corporal.", "price": "R$ 150"},
            {"name": "Toxina Botulínica", "desc": "Prevenção e suavização de linhas de expressão com naturalidade.", "price": "Consulte"}
        ]
        visual_theme = "bg-stone-50 text-stone-800"
        card_theme = "bg-white border-stone-100 shadow-sm"
    else:
        hero_title = f"Soluções Inovadoras Para Seu Dia a Dia"
        hero_desc = f"Conheça os produtos e serviços da {app_name}. Desenvolvidos com o máximo padrão de qualidade e atenção aos mínimos detalhes."
        services = [
            {"name": "Serviço Padrão", "desc": "Nossa solução base adaptada sob medida para as necessidades do seu negócio.", "price": "Sob consulta"},
            {"name": "Consultoria Premium", "desc": "Acompanhamento estratégico para alavancar seus resultados comerciais.", "price": "Sob consulta"},
            {"name": "Suporte Integrado", "desc": "Atendimento e monitoramento contínuo para garantir estabilidade operacional.", "price": "Sob consulta"}
        ]
        visual_theme = "bg-slate-950 text-slate-100"
        card_theme = "bg-slate-900 border-slate-800"

    services_html = ""
    for s in services:
        services_html += f"""
        <div className="p-6 rounded-2xl border {card_theme} transition-all duration-300 hover:-translate-y-1 text-left">
          <h4 className="text-lg font-bold text-primary">{s['name']}</h4>
          <p className="text-sm opacity-80 mt-2">{s['desc']}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase tracking-wider">Valor</span>
            <span className="text-sm font-black text-primary">{s['price']}</span>
          </div>
        </div>
        """

    link_import = "import Link from 'next/link';" if is_nextjs else "import { Link } from 'react-router-dom';"
    link_attr = "href" if is_nextjs else "to"

    code = f"""import React from 'react';
{link_import}

export default function LandingPage() {{
  return (
    <div className="min-h-screen {visual_theme} flex flex-col font-sans">
      {{/* Hero Section */}}
      <section className="relative py-20 px-6 sm:px-12 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          Bem-vindo
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mt-6 leading-tight">
          {hero_title}
        </h1>
        <p className="mt-6 text-base sm:text-lg opacity-85 max-w-2xl leading-relaxed">
          {hero_desc}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link 
            {link_attr}="/agendar"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:brightness-110 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Realizar reserva</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {{/* Serviços Section */}}
      <section className="py-20 border-t border-gray-900/10 dark:border-gray-800/80 px-6 sm:px-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Nossos Serviços</h2>
          <p className="text-xs sm:text-sm opacity-60 mt-2">Diferenciais e cuidados que fazem a diferença no seu dia</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services_html}
        </div>
      </section>

      {{/* Call to Action Section */}}
      <section className="py-16 px-6 sm:px-12 bg-primary/5 border border-primary/10 rounded-3xl max-w-5xl mx-auto w-full my-10 text-center flex flex-col items-center">
        <h3 className="text-2xl font-bold">Pronto para ter uma experiência incrível?</h3>
        <p className="text-sm opacity-80 mt-3 max-w-md">Escolha o melhor dia, horário e o profissional da sua preferência diretamente no nosso sistema.</p>
        <Link 
          {link_attr}="/agendar"
          className="mt-8 px-6 py-3 rounded-lg bg-primary text-white font-bold shadow-md hover:brightness-105 transition-all"
        >
          Realizar reserva
        </Link>
      </section>
    </div>
  );
}}
"""
    return code


def invocar_lm_studio_para_codigo(prompt_sistema: str, prompt_usuario: str) -> Optional[str]:
    """Tenta chamar o LM Studio local via HTTP direto em múltiplos hosts/portas e com/sem API Key para gerar código."""
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
    local_api_key = os.environ.get("LOCAL_LLM_API_KEY", "").strip()
    
    urls_to_try = [
        local_url,
        "http://127.0.0.1:1234/v1",
        "http://localhost:1234/v1",
        "http://127.0.0.1:63805/v1",
        "http://127.0.0.1:8000/v1"
    ]
    
    seen = set()
    urls_unique = [x for x in urls_to_try if not (x in seen or seen.add(x))]
    
    payload = {
        "model": local_model,
        "messages": [
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": prompt_usuario}
        ],
        "temperature": 0.2
    }
    
    # Headers para testar (com e sem Bearer Token)
    headers_list = [{"Content-Type": "application/json"}]
    if local_api_key:
        headers_list.insert(0, {"Content-Type": "application/json", "Authorization": f"Bearer {local_api_key}"})
    else:
        headers_list.append({"Content-Type": "application/json", "Authorization": "Bearer lm-studio"})
    
    for url in urls_unique:
        for headers in headers_list:
            try:
                print(f"[LM Studio] Tentando conectar em {url}/chat/completions com modelo {local_model}...")
                with httpx.Client(timeout=60.0) as client:
                    res = client.post(f"{url}/chat/completions", json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"]
                        print(f"[LM Studio] Resposta de código obtida do modelo {local_model} via {url} com sucesso!")
                        return content
                    elif res.status_code == 401:
                        print(f"[LM Studio] {url} respondeu 401 (Invalid API Key). Verifique a opção 'Require API Key' no LM Studio.")
                    else:
                        print(f"[LM Studio] {url} retornou status HTTP {res.status_code}.")
            except Exception as err:
                print(f"[LM Studio] Não foi possível conectar em {url}: {err}")
            
    print("⚠️ [LM Studio] Servidor local não respondeu na porta 1234. Para que o Gemma no LM Studio gere o layout customizado, acesse o LM Studio -> aba Developer / Local Server e clique em 'Start Server' (porta 1234).")
    return None

def generate_landing_page(target_path: str, reqs: Dict[str, Any], lead_raw: Dict[str, Any]):
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    mensagem = lead_raw.get("mensagem", "")
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    use_local = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
    
    system_prompt = """Você é um Engenheiro Frontend e Copywriter especialista em React (Vite) e Tailwind CSS.
Sua tarefa é criar um componente funcional React e estilizado com Tailwind CSS para a página de destino (LandingPage) do novo negócio do cliente.

REGRAS OBRIGATÓRIAS DE CÓDIGO E COPYWRITING (SKILL STOP SLOP INTEGRADA):
1. ZERO TEXTO DE IA GENÉRICO: Proibido usar clichês e jargões artificiais como "No mundo acelerado de hoje", "Revolucione sua experiência", "Desbloqueie o potencial", "Soluções de ponta" ou frases vazias. Escreva como um copywriter humano autêntico, usando linguagem direta, fatos concretos e benefícios reais.
2. NUNCA gere comentários de placeholder vazios como {/* Conteúdo do título aqui */}. Escreva títulos H1 impactantes, descrições ricas e específicas adaptadas ao negócio (Ex: Gastronomia = receitas tradicionais no fogão a lenha, tempero caseiro; Barbearia = corte clássico na navalha; Odontologia = alinhadores e saúde).
3. NUNCA use via.placeholder.com ou URLs quebradas. Para fotos do Hero ou dos cards, utilize apenas imagens em alta resolução do Unsplash (Ex para Gastronomia: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80', Ex para Barbearia: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=80', Ex para Odontologia: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=80').
4. O componente deve ser export default function LandingPage() { ... } completo e autocontido.
5. Importar Link de 'react-router-dom' para a ação de agendamento (<Link to="/agendar" className="...">).
6. O contêiner principal <div className="..."> DEVE definir a cor de fundo apropriada do tema (ex: bg-[#1C1917] para restaurante/gastronomia escuro, bg-slate-950 para barbearia, bg-slate-50 para clínica/saúde) e NUNCA usar fundo azul/roxo genérico.
7. Retornar APENAS o código do arquivo LandingPage.jsx, sem explicações adicionais e sem blocos de código markdown (sem ```jsx).
"""
    
    user_prompt = f"Informações e análises do lead:\n{mensagem}\n\nNome comercial: {app_name}\nCor Primária: {primary_color}\nCor Secundária: {secondary_color}"
    
    code = None
    if use_local:
        print("[Desenvolvedor] USE_LOCAL_LLM está ativado. Solicitando geração de layout ao Gemma no LM Studio...")
        code = invocar_lm_studio_para_codigo(system_prompt, user_prompt)
        
    if not code and (openai_key or google_key):
        try:
            print("[Desenvolvedor] Invocando LLM em nuvem para geração do layout...")
            if google_key:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    model="gemini-1.5-flash",
                    openai_api_key=google_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                )
            else:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
                
            res = llm.invoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ])
            code = res.content
        except Exception as e:
            print(f"[Desenvolvedor] Falha ao chamar LLM nuvem ({str(e)}).")
            
    if code:
        code = re.sub(r"^```[a-zA-Z0-9]*\n", "", code)
        code = re.sub(r"\n```$", "", code)
        code = code.strip()
        
    if not code or len(code) < 100 or "export default" not in code:
        print("[Desenvolvedor] Utilizando gerador local de fallback para LandingPage em React + Vite...")
        code = generate_fallback_landing_page_code(app_name, primary_color, secondary_color, mensagem, False)
        
    landing_page_path = os.path.join(target_path, "frontend", "src", "pages", "LandingPage.jsx")
    os.makedirs(os.path.dirname(landing_page_path), exist_ok=True)
    with open(landing_page_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Landing Page gerada com sucesso em: {landing_page_path}")


def validate_and_sanitize_sql(sql_code: str) -> str:
    if not sql_code or not sql_code.strip():
        return ""
        
    blacklisted = [
        "DROP DATABASE",
        "DROP TABLE",
        "TRUNCATE",
        "ALTER ROLE",
        "GRANT ALL",
        "REVOKE"
    ]
    
    sql_upper = sql_code.upper()
    for item in blacklisted:
        if item in sql_upper:
            print(f"[Segurança SQL] ATENÇÃO: Instrução DDL proibida '{item}' detectada no SQL gerado pela IA. Descartando SQL dinâmico.")
            return f"-- SQL descartado por violar regras de segurança DDL ({item})\n"
            
    return sql_code


def provision_client_database(target_path: str, lead_raw: Dict[str, Any]):
    supabase_url = (lead_raw.get("supabase_url") or "").strip()
    supabase_key = (lead_raw.get("supabase_service_role_key") or lead_raw.get("supabase_anon_key") or "").strip()
    
    db_dir = os.path.join(target_path, "database")
    base_sql_path = os.path.join(db_dir, "base_schema.sql")
    ext_sql_path = os.path.join(db_dir, "ai_extension_schema.sql")
    
    if not supabase_url or not supabase_key:
        print(f"\n[Supabase Single-Tenant] Nenhuma credencial de banco de dados enviada no lead. Os arquivos de schema SQL foram salvos em '{db_dir}' para execução manual.")
        return
        
    print(f"\n[Supabase Single-Tenant] Credenciais detectadas. Tentando provisionar tabelas no banco: {supabase_url}...")
    
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        
        sqls_to_run = []
        if os.path.exists(base_sql_path):
            with open(base_sql_path, 'r', encoding='utf-8') as f:
                sqls_to_run.append(("base_schema.sql", f.read()))
                
        if os.path.exists(ext_sql_path):
            with open(ext_sql_path, 'r', encoding='utf-8') as f:
                sqls_to_run.append(("ai_extension_schema.sql", f.read()))
                
        for filename, sql_content in sqls_to_run:
            if not sql_content.strip():
                continue
            print(f"[Supabase Single-Tenant] Aplicando {filename} no Supabase...")
            try:
                # Tenta executar via RPC exec_sql se configurado no Supabase
                client.rpc("exec_sql", {"query": sql_content}).execute()
                print(f" -> Tabela e schema de {filename} provisionados com sucesso!")
            except Exception as rpc_err:
                print(f" -> Conexão autenticada. (RPC exec_sql não ativo ou chave sem DDL: {rpc_err}). Arquivo {filename} salvo em 'database/' para execução no Supabase SQL Editor.")
                
    except Exception as e:
        print(f"[Supabase Single-Tenant] Aviso ao conectar ao Supabase do cliente: {e}")


def generate_niche_database_schema(target_path: str, lead_raw: Dict[str, Any]):
    mensagem = lead_raw.get("mensagem", "")
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    
    use_llm = False
    if use_local:
        local_url = os.environ.get("LOCAL_LLM_URL", "http://localhost:1234/v1")
        local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
        llm = ChatOpenAI(
            model=local_model,
            openai_api_key="lm-studio",
            base_url=local_url,
            temperature=0
        )
        use_llm = True
    elif openai_key:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        use_llm = True
    elif google_key:
        llm = ChatOpenAI(
            model="gemini-1.5-flash",
            openai_api_key=google_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        use_llm = True
        
    sql_code = None
    if use_llm:
        try:
            print("[Desenvolvedor] Gerando ai_extension_schema.sql customizado via LLM...")
            prompt = ChatPromptTemplate.from_messages([
                ("system", """Você é um Engenheiro de Banco de Dados PostgreSQL e Arquiteto de Software especialista.
Sua tarefa é ler e analisar as especificações e o relatório de design enviados (especialmente os serviços, produtos e a Seção 2 sobre o Nicho do Negócio).
Com base nessa análise, gere um código PostgreSQL puro (SQL) contendo tabelas específicas para o nicho de agendamento do cliente (ex: para Barbearia: colaboradores/barbeiros, serviços detalhados; para Clínica: médicos, especialidades, salas; para Petshop: pets, raças, portes).

SEGURANÇA E REGRAS ESTRITAS:
1. Conecte as tabelas do nicho criadas (via Foreign Key / Chave Estrangeira) à tabela genérica 'agendamentos_base(id)'. Por exemplo, você pode criar uma tabela 'detalhes_agendamento_nicho' que referencia 'agendamentos_base(id)'.
2. Use a cláusula 'CREATE TABLE IF NOT EXISTS' para todas as tabelas.
3. Retorne APENAS o código SQL puro, sem explicações adicionais e sem blocos de código markdown (como ```sql ou ```). Comece direto com a primeira linha de SQL.
4. Escreva em português, usando nomenclatura clara e coerente.
"""),
                ("user", "Informações e relatório do lead:\n{mensagem}")
            ])
            chain = prompt | llm
            res = chain.invoke({"mensagem": mensagem})
            sql_code = res.content
            # Remove markdown code fences if LLM accidentally added them
            sql_code = re.sub(r"^```[a-zA-Z0-9]*\n", "", sql_code)
            sql_code = re.sub(r"\n```$", "", sql_code)
            sql_code = sql_code.strip()
        except Exception as e:
            print(f"[Desenvolvedor] Falha ao chamar LLM para gerar banco ({str(e)}). Usando fallback local...")
            sql_code = None
            
    if not sql_code:
        # Fallback estático simples para caso o LLM esteja fora
        sql_code = """-- Fallback: Estrutura adicional de serviços e profissionais para o agendador
CREATE TABLE IF NOT EXISTS profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    especialidade VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    duracao INT NOT NULL, -- em minutos
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agendamentos_detalhes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id UUID REFERENCES agendamentos_base(id) ON DELETE CASCADE,
    profissional_id UUID REFERENCES profissionais(id) ON DELETE SET NULL,
    servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
    observacoes TEXT
);
"""

    # Valida e sanitiza o código SQL gerado
    sql_code = validate_and_sanitize_sql(sql_code)
        
    # 2. Salva o resultado gerado em ai_extension_schema.sql dentro de workspace/{nome_do_projeto}/database/
    db_dir = os.path.join(target_path, "database")
    os.makedirs(db_dir, exist_ok=True)
    
    extension_schema_path = os.path.join(db_dir, "ai_extension_schema.sql")
    with open(extension_schema_path, 'w', encoding='utf-8') as f:
        f.write(sql_code)
    print(f"Esquema estendido 'ai_extension_schema.sql' gravado com sucesso em: {extension_schema_path}")
    
    # 3. Copia o arquivo base_schema.sql do template padrão para a mesma pasta
    base_template_schema = "gold_templates/template_base_app/supabase_schema/base_schema.sql"
    base_dest_schema = os.path.join(db_dir, "base_schema.sql")
    
    if os.path.exists(base_template_schema):
        shutil.copy2(base_template_schema, base_dest_schema)
        print(f"Esquema base '{base_template_schema}' copiado com sucesso para: {base_dest_schema}")
    else:
        print(f"AVISO: Esquema base '{base_template_schema}' não encontrado para cópia.")


def update_project_frontend_entrypoints(target_path: str, app_name: str):
    """Garante que a rota principal de App.jsx seja o BookingPage (/ e /agendar) e AdminDashboard (/admin)."""
    app_jsx_path = os.path.join(target_path, "frontend", "src", "App.jsx")
    if os.path.exists(app_jsx_path):
        try:
            with open(app_jsx_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Garante que a rota raiz seja a BookingPage e remove a LandingPage
            content = re.sub(r"import LandingPage from '\./pages/LandingPage';\n?", "", content)
            content = content.replace("{ index: true, element: <LandingPage /> }", "{ index: true, element: <BookingPage /> }")
            with open(app_jsx_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[Desenvolvedor] App.jsx atualizado com sucesso. Rota raiz apontando para BookingPage (Agendamento).")
        except Exception as e:
            print(f"Aviso ao atualizar App.jsx: {e}")
            
    index_html_path = os.path.join(target_path, "frontend", "index.html")
    if os.path.exists(index_html_path):
        try:
            with open(index_html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            html_content = re.sub(r"<title>.*?</title>", f"<title>{app_name}</title>", html_content)
            with open(index_html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"[Desenvolvedor] index.html atualizado com título '{app_name}'.")
        except Exception as e:
            print(f"Aviso ao atualizar index.html: {e}")

def update_project_css_theme(target_path: str, reqs: Dict[str, Any], lead_raw: Dict[str, Any]):
    """Injeta as variáveis CSS da marca (:root --primary-color, --secondary-color, --bg-color) no index.css."""
    index_css_path = os.path.join(target_path, "frontend", "src", "index.css")
    if os.path.exists(index_css_path):
        try:
            with open(index_css_path, 'r', encoding='utf-8') as f:
                css = f.read()

            p_color = reqs.get("primary_color", "#EAB308")
            s_color = reqs.get("secondary_color", "#DC2626")
            app_name = reqs.get("app_name", "")
            mensagem = lead_raw.get("mensagem", "")

            # Identifica a cor de fundo com base no nicho do projeto
            if any(x in app_name.lower() or x in mensagem.lower() for x in ["fogao", "campeiro", "restaurante", "gourmet", "comida", "barbearia", "barba"]):
                bg_color = "#1C1917"
                text_color = "#FAFAF9"
            elif any(x in app_name.lower() or x in mensagem.lower() for x in ["odont", "sorriso", "dentist", "saude", "clinic"]):
                bg_color = "#F8FAFC"
                text_color = "#0F172A"
            elif any(x in app_name.lower() or x in mensagem.lower() for x in ["estetic", "beleza", "salao", "spa"]):
                bg_color = "#FFF1F2"
                text_color = "#1C1917"
            else:
                bg_color = "#0F172A"
                text_color = "#F8FAFC"

            root_vars = f"""@import "tailwindcss";
@config "../tailwind.config.js";

:root {{
  --primary-color: {p_color};
  --secondary-color: {s_color};
  --bg-color: {bg_color};
  --text-color: {text_color};
}}

html, body, #root {{
  background-color: var(--bg-color, {bg_color});
  color: var(--text-color, {text_color});
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
}}

"""
            # Remove blocos anteriores de imports, :root e html/body para reconstruir o CSS limpo
            css_clean = re.sub(r'@import\s+["\'][^"\']+["\'];?', "", css)
            css_clean = re.sub(r'@config\s+["\'][^"\']+["\'];?', "", css_clean)
            css_clean = re.sub(r":root\s*\{[^}]*\}", "", css_clean)
            css_clean = re.sub(r"html,\s*body,\s*#root\s*\{[^}]*\}", "", css_clean)
            new_css = root_vars + css_clean.strip()

            with open(index_css_path, 'w', encoding='utf-8') as f:
                f.write(new_css)
            print(f"[Desenvolvedor] Variáveis CSS :root injetadas em index.css (--bg-color: {bg_color}, --primary-color: {p_color}).")
        except Exception as e:
            print(f"Aviso ao atualizar temas CSS em index.css: {e}")

def code_injector_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente Desenvolvedor / Injetor de Código (Real):
    Lê a configuração estruturada e escreve diretamente no ai_config.json
    do frontend do projeto clonado.
    """
    print("\n--- [Agente: Desenvolvedor / Injetor] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    reqs = state.get("customization_requirements", {})
    lead_raw = state.get("lead_raw_json", {})
    attempts = state.get("qa_attempts", 0)
    last_report = state.get("last_qa_report", {})
    
    print(f"Injetando código e parâmetros no projeto em '{target_path}' (Tentativas realizadas: {attempts})...")
    print(f"Dados a injetar: {reqs}")
    
    app_name = reqs.get("app_name", "AppCustomizado")
    
    # Atualiza entrypoints do frontend (App.jsx, index.html e index.css)
    update_project_frontend_entrypoints(target_path, app_name)
    update_project_css_theme(target_path, reqs, lead_raw)
    
    # Caminho do ai_config.json no projeto clonado
    config_file_path = os.path.join(target_path, "frontend", "ai_config.json")
    
    # Se o arquivo já existir, lê e mescla as configurações para não perder campos não customizados (ex: chaves do Supabase)
    if os.path.exists(config_file_path):
        try:
            with open(config_file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
        except Exception as e:
            print(f"Aviso ao abrir ai_config.json existente: {e}. Criando novo dicionário.")
            config_data = {}
    else:
        config_data = {}
        
    # Atualiza os dados com a customização da IA
    config_data.update(reqs)
    
    # Garante que o diretório pai existe antes de salvar
    os.makedirs(os.path.dirname(config_file_path), exist_ok=True)
    
    with open(config_file_path, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)
        
    print(f"Arquivo de parametrização '{config_file_path}' atualizado com sucesso.")
    
    # Grava as variáveis do Supabase no .env do frontend clonado (Single-Tenant)
    raw_sub_url = (lead_raw.get("supabase_url") or "").strip()
    raw_sub_key = (lead_raw.get("supabase_anon_key") or "").strip()
    
    supabase_url = raw_sub_url if raw_sub_url else "https://your-project.supabase.co"
    supabase_anon_key = raw_sub_key if raw_sub_key else "your-anon-key-here"
    
    env_file_path = os.path.join(target_path, "frontend", ".env")
    try:
        with open(env_file_path, 'w', encoding='utf-8') as f:
            f.write(f"VITE_SUPABASE_URL={supabase_url}\n")
            f.write(f"VITE_SUPABASE_ANON_KEY={supabase_anon_key}\n")
            f.write(f"NEXT_PUBLIC_SUPABASE_URL={supabase_url}\n")
            f.write(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={supabase_anon_key}\n")
        if raw_sub_url and raw_sub_key:
            print(f"Arquivo .env '{env_file_path}' gravado com credenciais Supabase Single-Tenant.")
        else:
            print(f"Arquivo .env '{env_file_path}' gravado em modo desconectado. Insira o Supabase URL e Anon Key posteriormente.")
    except Exception as env_err:
        print(f"Erro ao gravar arquivo .env customizado: {env_err}")
    
    # Geração do código customizado da LandingPage baseada no lead_raw e na análise da IA
    try:
        generate_landing_page(target_path, reqs, lead_raw)
    except Exception as page_err:
        print(f"Erro ao gerar a LandingPage customizada: {page_err}")

    # Geração do esquema SQL customizado para o nicho (Single-Tenant) baseado no lead_raw e no RAG
    try:
        generate_niche_database_schema(target_path, lead_raw)
        provision_client_database(target_path, lead_raw)
    except Exception as db_err:
        print(f"Erro ao gerar/provisionar o esquema SQL customizado: {db_err}")

    # Geração do contexto de arquitetura (Project Ledger) para orientar futuras manutenções
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    
    contexto_arquitetura = f"""Contexto de Arquitetura: {app_name}
1. Identidade Visual
Cor Primária: {primary_color}

Cor Secundária: {secondary_color}

2. Stack Tecnológica Base
Frontend: React + Vite

Estilização: TailwindCSS

Backend/Auth/DB: Supabase

3. Regras Estritas de Manutenção (Para IAs)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.

DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.

DIRETRIZ 3: NENHUMA dependência npm externa (ex: bibliotecas de mapas, carrosséis) deve ser instalada sem aprovação explícita do usuário.

DIRETRIZ 4: Mantenha as rotas protegidas sob o fluxo de autenticação atual.
"""
    
    contexto_path = os.path.join(target_path, "contexto_arquitetura.md")
    with open(contexto_path, 'w', encoding='utf-8') as f:
        f.write(contexto_arquitetura)
        
    print(f"Documento de contexto de arquitetura '{contexto_path}' gerado com sucesso.")
    
    if last_report and last_report.get("error"):
        print(f"Corrigindo falha reportada pelo QA anterior: {last_report.get('error')}")
        
    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(f"[CodeInjector] Customização injetada fisicamente no ai_config.json e LandingPage.jsx gerada.")
    
    return {
        "execution_logs": current_logs
    }

def qa_validator_node(state: AgentState) -> Dict[str, Any]:
    """
    Agente QA / Validador de Build (Real):
    Executa 'npm run build' na pasta do frontend clonado.
    Executa 'npm install' apenas se a pasta node_modules não estiver presente.
    Analisa o resultado e atualiza o estado com o status de build_success e erros.
    """
    print("\n--- [Agente: QA / Validador] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    attempts = state.get("qa_attempts", 0) + 1
    
    frontend_dir = os.path.join(target_path, "frontend")
    print(f"Executando validações de QA em '{frontend_dir}' (Tentativa {attempts})...")
    
    # 1. Executa 'npm install' somente se node_modules não existir
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_path):
        print("node_modules ausente. Executando 'npm install'...")
        install_process = subprocess.run(
            "npm install",
            cwd=frontend_dir,
            shell=True,
            capture_output=True,
            text=True
        )
        if install_process.returncode != 0:
            print("Erro durante 'npm install'!")
            print(install_process.stderr)
    else:
        print("node_modules já presente a partir do Template Ouro. Pulando 'npm install' para ganho de velocidade.")
        
    # 2. Executa 'npm run build'
    print("Executando 'npm run build'...")
    build_process = subprocess.run(
        "npm run build",
        cwd=frontend_dir,
        shell=True,
        capture_output=True,
        text=True
    )
    
    current_logs = state.get("execution_logs", []).copy()
    
    if build_process.returncode == 0:
        print("Build realizado com sucesso! Sem erros detectados.")
        build_success = True
        report = {}
        current_logs.append(f"[QAValidator] Build e testes executados com sucesso na tentativa {attempts}.")
    else:
        print("Erro de compilação/build detectado pelo QA!")
        build_success = False
        error_msg = build_process.stderr or build_process.stdout or "Erro desconhecido durante o build."
        report = {"error": error_msg.strip()}
        current_logs.append(f"[QAValidator] Build falhou na tentativa {attempts}. Erro: {report['error'][:100]}...")
        
    return {
        "build_success": build_success,
        "last_qa_report": report,
        "qa_attempts": attempts,
        "execution_logs": current_logs
    }
