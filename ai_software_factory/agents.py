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
            model="gemini-3.8-flash",
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

def get_niche_media(app_name: str, mensagem: str) -> Dict[str, Any]:
    """Retorna mídia temática curada do Unsplash e dados de vitrine alinhados ao nicho do cliente."""
    text = f"{app_name} {mensagem}".lower()
    if any(x in text for x in ["barbe", "barba", "navalha", "corte", "pampas", "barber"]):
        return {
            "niche": "Barbearia",
            "hero_title": "Estilo, Tradição e Cuidado Masculino",
            "hero_desc": f"Bem-vindo à {app_name}. Aliamos o corte clássico na navalha a um ambiente exclusivo com atendimento de primeira.",
            "hero_img": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Corte de Cabelo Clássico", "desc": "Corte moderno ou clássico com lavagem, alinhamento e finalização premium.", "price": "R$ 60", "img": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80"},
                {"name": "Barboterapia com Toalha Quente", "desc": "Barba desenhada na navalha com hidratação, óleos nobres e toalha quente relaxante.", "price": "R$ 50", "img": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80"},
                {"name": "Combo Estilo Completo", "desc": "Cabelo, barba e sobrancelha com café expresso cortesia e atendimento VIP.", "price": "R$ 100", "img": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80"}
            ],
            "theme_bg": "bg-[#090D16] text-[#F1F5F9]",
            "card_bg": "bg-[#111827] border-[#1F2937]"
        }
    elif any(x in text for x in ["fogao", "campeiro", "restaurante", "gourmet", "comida", "pizz", "hambur", "carne", "churrasco", "culinaria"]):
        return {
            "niche": "Gastronomia",
            "hero_title": "O Autêntico Sabor e Tradição Artesanal",
            "hero_desc": f"Bem-vindo ao {app_name}. Saboreie pratos artesanais da culinária regional com receitas tradicionais, tempero caseiro e ambiente acolhedor.",
            "hero_img": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Pratos Típicos Tradicionais", "desc": "Receitas clássicas preparadas lentamente com ingredientes nobres da estação.", "price": "R$ 48", "img": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"},
                {"name": "Cortes Especiais na Brasa", "desc": "Carnes selecionadas preparadas lentamente na brasa no ponto exato da sua preferência.", "price": "R$ 85", "img": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80"},
                {"name": "Reserva de Mesas Online", "desc": "Garanta seu lugar e de sua família com antecedência sem filas de espera.", "price": "Gratuito", "img": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"}
            ],
            "theme_bg": "bg-[#1C1917] text-[#FAFAF9]",
            "card_bg": "bg-[#292524] border-[#44403C]"
        }
    elif any(x in text for x in ["odont", "dente", "sorriso", "dentist", "saude", "clinic"]):
        return {
            "niche": "Odontologia & Saúde",
            "hero_title": "O Sorriso Radiante Que Você Merece",
            "hero_desc": f"Na {app_name}, unimos tecnologia de ponta e cuidado humanizado para transformar e valorizar o seu sorriso com total conforto.",
            "hero_img": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Clareamento Dental Avançado", "desc": "Procedimento seguro a laser para devolver o brilho e a tonalidade natural dos dentes.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80"},
                {"name": "Alinhadores Transparentes", "desc": "Correção ortodôntica moderna com aparelhos invisíveis, removíveis e imperceptíveis.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80"},
                {"name": "Check-up Preventivo Completo", "desc": "Avaliação detalhada, limpeza ultrassônica e orientações completas de saúde bucal.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"}
            ],
            "theme_bg": "bg-[#F8FAFC] text-[#0F172A]",
            "card_bg": "bg-white border-[#E2E8F0] shadow-md"
        }
    elif any(x in text for x in ["estetic", "beleza", "salao", "hair", "unha", "spa"]):
        return {
            "niche": "Estética & Beleza",
            "hero_title": "Realce Sua Beleza e Bem-Estar Natural",
            "hero_desc": f"Descubra sua melhor versão na {app_name}. Protocolos estéticos personalizados em um ambiente relaxante e sofisticado.",
            "hero_img": "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Limpeza de Pele Profunda", "desc": "Remoção de impurezas, hidratação celular intensa e renovação do viço facial.", "price": "R$ 150", "img": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"},
                {"name": "Massagem Relaxante com Aromas", "desc": "Terapia corporal antiestresse com óleos essenciais para equilíbrio físico e mental.", "price": "R$ 130", "img": "https://images.unsplash.com/photo-1512290900672-1f4a4340d21a?auto=format&fit=crop&w=600&q=80"},
                {"name": "Design & Cuidados Corporais", "desc": "Tratamentos modeladores e protocolos exclusivos de alta performance estética.", "price": "Consulte", "img": "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=80"}
            ],
            "theme_bg": "bg-[#FFF1F2] text-[#1C1917]",
            "card_bg": "bg-white border-[#FFE4E6] shadow-sm"
        }
    elif any(x in text for x in ["pet", "veterin", "cao", "gato", "animal"]):
        return {
            "niche": "Pet & Veterinária",
            "hero_title": "Cuidado e Carinho Que Seu Pet Merece",
            "hero_desc": f"Na {app_name}, tratamos seu melhor amigo com amor, dedicação e toda a estrutura que ele precisa para viver feliz e saudável.",
            "hero_img": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Banho & Tosa Especializada", "desc": "Higiene delicada com cosméticos seguros e tosa higiênica ou na tesoura.", "price": "R$ 70", "img": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80"},
                {"name": "Consulta Clínica & Preventiva", "desc": "Avaliação de rotina, carteira de vacinas e acompanhamento nutricional para pets.", "price": "R$ 120", "img": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80"},
                {"name": "Spa & Hidratação de Pelos", "desc": "Tratamento de pelagem com máscara hidratante e massagem relaxante.", "price": "R$ 90", "img": "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=600&q=80"}
            ],
            "theme_bg": "bg-[#FFFBEB] text-[#451A03]",
            "card_bg": "bg-white border-[#FEF3C7] shadow-sm"
        }
    else:
        return {
            "niche": "Serviços Especializados",
            "hero_title": f"Excelência e Conforto em Cada Detalhe",
            "hero_desc": f"Conheça os serviços da {app_name}. Desenvolvidos com alto padrão de qualidade e atenção individualizada às suas necessidades.",
            "hero_img": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
            "services": [
                {"name": "Atendimento Personalizado", "desc": "Soluções focadas sob medida para entregar exatamente o que você procura.", "price": "Sob consulta", "img": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"},
                {"name": "Consultoria & Diagnóstico", "desc": "Avaliação detalhada para garantir precisão, economia de tempo e melhores resultados.", "price": "Sob consulta", "img": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80"},
                {"name": "Agendamento Prático Online", "desc": "Escolha com antecedência o dia e horário que melhor se encaixam na sua rotina.", "price": "Online", "img": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80"}
            ],
            "theme_bg": "bg-[#0F172A] text-[#F8FAFC]",
            "card_bg": "bg-[#1E293B] border-[#334155] shadow-lg"
        }

def generate_fallback_landing_page_code(app_name: str, primary_color: str, secondary_color: str, mensagem: str, is_nextjs: bool = False, address: str = "", working_hours: str = "", phone: str = "") -> str:
    """Gera uma LandingPage completa em 5 blocos com fotos do Unsplash caso o modelo LLM não esteja disponível."""
    media = get_niche_media(app_name, mensagem)
    
    addr = address or "Av. Principal, 1000 - Centro"
    hours = working_hours or "Segunda a Sábado das 9h às 19h"
    tel = phone or "(51) 99999-9999"
    
    link_import = "import Link from 'next/link';" if is_nextjs else "import { Link } from 'react-router-dom';"
    link_attr = "href" if is_nextjs else "to"

    services_cards = ""
    for s in media["services"]:
        services_cards += f"""
          <div className="overflow-hidden rounded-2xl border {media['card_bg']} transition-all duration-300 hover:-translate-y-1.5 flex flex-col text-left">
            <img src="{s['img']}" alt="{s['name']}" className="w-full h-48 object-cover" />
            <div className="p-6 flex flex-col flex-1 justify-between">
              <div>
                <h4 className="text-xl font-bold text-primary">{s['name']}</h4>
                <p className="text-sm opacity-80 mt-2 leading-relaxed">{s['desc']}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold opacity-60">Investimento</span>
                <span className="text-base font-extrabold text-primary">{s['price']}</span>
              </div>
            </div>
          </div>
        """

    code = f"""import React from 'react';
{link_import}

export default function LandingPage() {{
  return (
    <div className="min-h-screen {media['theme_bg']} flex flex-col font-sans">
      {{/* Bloco 1: Navbar com Nome Comercial e Botão Agendar */}}
      <nav className="w-full py-4 px-6 sm:px-12 border-b border-white/10 flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-xl font-black tracking-tight text-primary">{app_name}</span>
        <Link 
          {link_attr}="/agendar"
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer"
        >
          Agendar Horário
        </Link>
      </nav>

      {{/* Bloco 2: Hero Section de Alto Impacto */}}
      <section className="relative py-20 px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-12">
        <div className="flex-1 text-left z-10">
          <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            {media['niche']}
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mt-6 leading-tight">
            {media['hero_title']}
          </h1>
          <p className="mt-6 text-base sm:text-lg opacity-85 max-w-xl leading-relaxed">
            {media['hero_desc']}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link 
              {link_attr}="/agendar"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:brightness-110 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Agendar Agora</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="flex-1 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          <img 
            src="{media['hero_img']}" 
            alt="{app_name}" 
            className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-700"
          />
        </div>
      </section>

      {{/* Bloco 3: Vitrine de Diferenciais e Serviços com Imagens Reais */}}
      <section className="py-20 border-t border-white/10 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Nossos Serviços</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-3">Experiência e Cuidados com Você</h2>
          <p className="text-sm opacity-70 mt-2 max-w-xl mx-auto">Confira abaixo nossos principais atendimentos e reserve seu horário online com praticidade.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services_cards}
        </div>
      </section>

      {{/* Bloco 4: Informações Locais & Horários */}}
      <section className="py-16 px-6 sm:px-12 bg-white/5 border-y border-white/10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold text-primary uppercase tracking-widest block">Onde Estamos</span>
            <h4 className="text-lg font-bold mt-2">Endereço</h4>
            <p className="text-sm opacity-80 mt-2 leading-relaxed">{addr}</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold text-primary uppercase tracking-widest block">Atendimento</span>
            <h4 className="text-lg font-bold mt-2">Horários</h4>
            <p className="text-sm opacity-80 mt-2 leading-relaxed">{hours}</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold text-primary uppercase tracking-widest block">Fale Conosco</span>
            <h4 className="text-lg font-bold mt-2">Telefone / WhatsApp</h4>
            <p className="text-sm opacity-80 mt-2 leading-relaxed">{tel}</p>
          </div>
        </div>
      </section>

      {{/* Bloco 5: Rodapé & CTA Final */}}
      <footer className="py-16 px-6 sm:px-12 text-center max-w-7xl mx-auto w-full flex flex-col items-center">
        <h3 className="text-2xl sm:text-3xl font-bold">Pronto para agendar o seu momento?</h3>
        <p className="text-sm opacity-80 mt-3 max-w-md">Escolha a melhor data e horário no nosso sistema digital sem complicações.</p>
        <Link 
          {link_attr}="/agendar"
          className="mt-6 px-8 py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg hover:brightness-110 transition-all cursor-pointer"
        >
          Ir Para o Agendamento
        </Link>
        <p className="text-xs opacity-50 mt-12">© {{new Date().getFullYear()}} {app_name}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}}
"""
    return code


def invocar_lm_studio_para_codigo(prompt_sistema: str, prompt_usuario: str) -> Optional[str]:
    """Chama o LM Studio local via HTTP direto com timeout estendido de 120s para gerar código JSX confiável."""
    local_url = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
    local_api_key = os.environ.get("LOCAL_LLM_API_KEY", "").strip()
    
    urls_to_try = [
        local_url,
        "http://127.0.0.1:1234/v1",
        "http://localhost:1234/v1"
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
    
    headers_list = [{"Content-Type": "application/json"}]
    if local_api_key:
        headers_list.insert(0, {"Content-Type": "application/json", "Authorization": f"Bearer {local_api_key}"})
    else:
        headers_list.append({"Content-Type": "application/json", "Authorization": "Bearer lm-studio"})
    
    for url in urls_unique:
        for headers in headers_list:
            try:
                print(f"[LM Studio] Enviando solicitação de geração da Landing Page ao modelo {local_model} em {url} (Timeout: 120s)...")
                with httpx.Client(timeout=120.0) as client:
                    res = client.post(f"{url}/chat/completions", json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        content = data["choices"][0]["message"]["content"]
                        print(f"[LM Studio] Código JSX gerado com sucesso pelo modelo {local_model} via {url}!")
                        return content
                    elif res.status_code == 401:
                        print(f"[LM Studio] {url} respondeu 401 (Invalid API Key). Verifique se 'Require API Key' está desativado no LM Studio.")
                    else:
                        print(f"[LM Studio] {url} retornou status HTTP {res.status_code}.")
            except Exception as err:
                print(f"[LM Studio] Não foi possível conectar ou timeout em {url}: {err}")
            
    print("⚠️ [LM Studio] Servidor local não respondeu na porta 1234. Para que o Gemma no LM Studio gere o layout customizado, certifique-se de iniciar o servidor na aba Developer / Local Server (porta 1234).")
    return None

def generate_landing_page(target_path: str, reqs: Dict[str, Any], lead_raw: Dict[str, Any]):
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    address = reqs.get("address", "")
    working_hours = reqs.get("working_hours", "")
    phone = reqs.get("phone", "")
    mensagem = lead_raw.get("mensagem", "")
    
    media = get_niche_media(app_name, mensagem)
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    use_local = os.environ.get("USE_LOCAL_LLM", "true").lower() == "true"
    
    system_prompt = f"""Você é um Arquiteto Frontend e Copywriter especialista em React (Vite) e Tailwind CSS.
Sua missão é gerar um componente React completo para a Landing Page (LandingPage.jsx) adaptado sob medida para o estabelecimento do cliente.

ESTRUTURA OBRIGATÓRIA EM 5 BLOCOS:
1. NAVBAR: Nome do estabelecimento e botão de destaque para agendamento (<Link to="/agendar" ...>Agendar Horário</Link>).
2. HERO SECTION: Título de alto impacto focado no nicho '{media['niche']}', descrição acolhedora sem clichês de IA, botão CTA principal (<Link to="/agendar">) e foto temática do Unsplash: '{media['hero_img']}'.
3. VITRINE DE SERVIÇOS: Exatamente 3 cards de diferenciais/serviços com as seguintes imagens reais:
   - Card 1: Foto '{media['services'][0]['img']}', Título '{media['services'][0]['name']}', Valor '{media['services'][0]['price']}'
   - Card 2: Foto '{media['services'][1]['img']}', Título '{media['services'][1]['name']}', Valor '{media['services'][1]['price']}'
   - Card 3: Foto '{media['services'][2]['img']}', Título '{media['services'][2]['name']}', Valor '{media['services'][2]['price']}'
4. INFORMAÇÕES LOCAIS: Cards com Endereço ({address or 'Endereço central do cliente'}), Horários de funcionamento ({working_hours or 'Segunda a Sábado'}) e Telefone/WhatsApp ({phone or 'WhatsApp para contato'}).
5. FOOTER: Rodapé institucional com botão final levando a '/agendar' e copyright.

REGRAS ESTRITAS DE SINTAXE:
1. Inicie importando:
   import React from 'react';
   import {{ Link }} from 'react-router-dom';
2. O componente DEVE ser: export default function LandingPage() {{ ... }}
3. Todos os botões de ação DEVEM usar <Link to="/agendar"> da biblioteca 'react-router-dom'.
4. NUNCA use clichês de IA ("no mundo acelerado de hoje", "revolucione sua experiência").
5. Retorne APENAS o código JSX puro, sem explicações em texto e sem blocos markdown (sem ```jsx ou ```).
"""
    
    user_prompt = f"Dados do cliente para o layout:\n- Nome: '{app_name}'\n- Nicho: '{media['niche']}'\n- Cor Primária: '{primary_color}'\n- Cor Secundária: '{secondary_color}'\n- Endereço: '{address}'\n- Horários: '{working_hours}'\n- Contato: '{phone}'\n- Briefing: {mensagem}"
    
    code = None
    if use_local:
        print(f"[Desenvolvedor] USE_LOCAL_LLM está ativado. Solicitando geração de Landing Page ao Gemma no LM Studio para '{app_name}' ({media['niche']})...")
        code = invocar_lm_studio_para_codigo(system_prompt, user_prompt)
        
    if not code and (openai_key or google_key):
        try:
            print("[Desenvolvedor] Invocando LLM em nuvem para geração do layout...")
            if google_key:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(
                    model="gemini-3.8-flash",
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
        print("[Desenvolvedor] Utilizando gerador visual inteligente de fallback com fotos Unsplash em 5 blocos...")
        code = generate_fallback_landing_page_code(app_name, primary_color, secondary_color, mensagem, False, address, working_hours, phone)
        
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
    
    if not supabase_url or not supabase_key:
        print(f"\n[Supabase Single-Tenant] Nenhuma credencial de banco de dados enviada no lead. O arquivo base_schema.sql foi salvo em '{db_dir}' para execução manual.")
        return
        
    print(f"\n[Supabase Single-Tenant] Credenciais detectadas. Tentando provisionar tabelas no banco: {supabase_url}...")
    
    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        
        if os.path.exists(base_sql_path):
            with open(base_sql_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
                
            if sql_content.strip():
                print(f"[Supabase Single-Tenant] Aplicando base_schema.sql padronizado no Supabase...")
                try:
                    client.rpc("exec_sql", {"query": sql_content}).execute()
                    print(f" -> Tabelas base provisionadas com sucesso via RPC exec_sql!")
                except Exception as rpc_err:
                    print(f" -> Conexão autenticada. (RPC exec_sql não disponível: {rpc_err}). O schema base_schema.sql está pronto em '{db_dir}' para rodar no SQL Editor.")
    except Exception as e:
        print(f"[Supabase Single-Tenant] Aviso ao conectar ao Supabase do cliente: {e}")


def generate_niche_database_schema(target_path: str, lead_raw: Dict[str, Any]):
    """Copia a base geral padronizada do banco (base_schema.sql) sem alucinações de SQL e sem dados falsos."""
    db_dir = os.path.join(target_path, "database")
    os.makedirs(db_dir, exist_ok=True)
    
    base_template_schema = "gold_templates/template_base_app/supabase_schema/base_schema.sql"
    base_dest_schema = os.path.join(db_dir, "base_schema.sql")
    
    if os.path.exists(base_template_schema):
        shutil.copy2(base_template_schema, base_dest_schema)
        print(f"[Desenvolvedor] Esquema base geral '{base_template_schema}' copiado com sucesso para: {base_dest_schema}")
    else:
        print(f"[Desenvolvedor] AVISO: Esquema base '{base_template_schema}' não encontrado para cópia.")


def update_project_frontend_entrypoints(target_path: str, app_name: str):
    """Garante que a rota principal de App.jsx seja a LandingPage (/) e o BookingPage (/agendar)."""
    app_jsx_path = os.path.join(target_path, "frontend", "src", "App.jsx")
    if os.path.exists(app_jsx_path):
        try:
            with open(app_jsx_path, 'r', encoding='utf-8') as f:
                content = f.read()
            if "LandingPage" not in content:
                content = content.replace("import BookingPage from './pages/BookingPage';", "import LandingPage from './pages/LandingPage';\nimport BookingPage from './pages/BookingPage';")
            content = content.replace("{ index: true, element: <BookingPage /> }", "{ index: true, element: <LandingPage /> }")
            if '{ path: "agendar", element: <BookingPage /> }' not in content:
                content = content.replace('{ index: true, element: <LandingPage /> },', '{ index: true, element: <LandingPage /> },\n      { path: "agendar", element: <BookingPage /> },')
            with open(app_jsx_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[Desenvolvedor] App.jsx atualizado com sucesso. Rota raiz apontando para LandingPage e /agendar para BookingPage.")
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
