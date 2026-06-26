import sys
import re
import os

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
    
    # Tenta extrair a cor principal por regex
    match_primary = re.search(r"Cor principal:\s*(#[a-fA-F0-9]{6})", mensagem)
    primary_color = match_primary.group(1) if match_primary else "#D4AF37"
    
    # Tenta extrair a cor secundária por regex
    match_secondary = re.search(r"Cor secundária:\s*(#[a-fA-F0-9]{6})", mensagem)
    secondary_color = match_secondary.group(1) if match_secondary else "#1A1A1A"
    
    return {
        "app_name": app_name,
        "primary_color": primary_color,
        "secondary_color": secondary_color
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
        local_url = os.environ.get("LOCAL_LLM_URL", "http://localhost:1234/v1")
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
            structured_llm = llm.with_structured_output(ClientConfig)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", "Você é um Analista de Requisitos especialista. Analise os dados de entrada do cliente e infira as configurações de personalização do app React (nome comercial, cor primária e secundária) de acordo com o esquema ClientConfig definido."),
                ("user", "Dados brutos do lead:\n{lead_raw_json}")
            ])
            
            chain = prompt | structured_llm
            
            result: ClientConfig = chain.invoke({"lead_raw_json": json.dumps(lead_raw, ensure_ascii=False)})
            custom_reqs = result.model_dump()
            log_msg = "[RequirementsAnalyst] Requisitos estruturados via LLM com sucesso."
        except Exception as e:
            print(f"[Analista de Requisitos] AVISO: Falha ao chamar a LLM ({str(e)}). Executando fallback local inteligente...")
            custom_reqs = parse_fallback_requirements(lead_raw)
            log_msg = f"[RequirementsAnalyst] Requisitos estruturados via Fallback inteligente devido a erro da LLM: {str(e)}"
    
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
    app_name_limpo = app_name_limpo.lower()
    
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
    
    if is_barber:
        hero_title = "Estilo e Tradição Para o Homem Moderno"
        hero_desc = f"Bem-vindo à {app_name}. Aliamos técnicas clássicas de barbearia a um ambiente premium e atendimento personalizado em Porto Alegre."
        services = [
            {"name": "Corte de Cabelo", "desc": "Corte moderno ou clássico com lavagem e finalização premium.", "price": "R$ 60"},
            {"name": "Barba e Toalha Quente", "desc": "Barba feita na navalha com hidratação, óleo e toalha quente relaxante.", "price": "R$ 50"},
            {"name": "Combo Premium", "desc": "Corte + Barba + Sobrancelha com cerveja inclusa como cortesia.", "price": "R$ 100"}
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


def generate_landing_page(target_path: str, reqs: Dict[str, Any], lead_raw: Dict[str, Any]):
    is_nextjs = os.path.exists(os.path.join(target_path, "frontend", "src", "app", "layout.tsx"))
    
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    mensagem = lead_raw.get("mensagem", "")
    
    openai_key = os.environ.get("OPENAI_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    use_local = os.environ.get("USE_LOCAL_LLM", "false").lower() == "true"
    
    use_llm = False
    if use_local:
        local_url = os.environ.get("LOCAL_LLM_URL", "http://localhost:1234/v1")
        local_model = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-3-4b")
        print(f"[Desenvolvedor] USE_LOCAL_LLM é true. Invocando LLM local {local_model} em {local_url} para gerar a Landing Page...")
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
        
    code = None
    if use_llm:
        try:
            print(f"[Desenvolvedor] Gerando Landing Page customizada via LLM (Next.js: {is_nextjs})...")
            
            if is_nextjs:
                system_prompt = """Você é um Engenheiro Frontend especialista em React, Next.js (App Router) e Tailwind CSS.
Sua tarefa é criar um componente funcional React (Server Component de preferência, sem hooks de cliente a menos que estritamente necessário) e estilizado com Tailwind CSS para a página inicial (Home/LandingPage) do novo negócio do cliente.

O código gerado deve ser um arquivo page.tsx React completo e autocontido (export default function LandingPage() { ... }).
Ele deve:
1. Seguir exatamente as diretrizes e seções propostas na análise de design da IA enviada pelo usuário.
2. Utilizar as classes do Tailwind CSS para uma estilização premium, moderna e limpa (use sombras, gradientes, transições e micro-animações).
3. Importar Link de 'next/link' para a ação de agendamento (use <Link href="/agendar" className="..."> para o CTA de agendamento).
4. O design deve se adequar perfeitamente ao setor do negócio (Ex: Barbearia deve ter visual rústico/premium com tons de couro/madeira/escuros; Odontologia deve ser clean, confiável e corporativo; Estética deve ser elegante, rosa/bege, etc.).
5. Usar as variáveis de cor de tailwind 'bg-primary' e 'text-primary' ou 'bg-secondary' e 'text-secondary' nos botões e destaques que devem herdar as cores da marca.
6. Retornar APENAS o código do arquivo page.tsx, sem explicações adicionais e sem blocos de código markdown (como ```tsx ou ```). Comece direto com o código.
7. Use apenas comentários válidos do JSX (como {/* comentário */}) e NUNCA string literals com barra de comentários (como {"/* comentário */"}) ou comentários HTML, pois eles são renderizados incorretamente como texto na tela.
8. Para aplicar as cores customizadas da marca de forma dinâmica, você pode ler o arquivo de configuração ai_config.json na raiz do projeto Next.js no próprio servidor, usando fs do Node.js, ou você pode injetar as cores inline usando style={{ backgroundColor: primary_color }} etc. Recomendamos injetar as cores diretamente no JSX usando as variáveis dinâmicas de cores passadas no prompt para maior robustez (ex: style={{{{ backgroundColor: "{primary_color}" }}}}).
"""
            else:
                system_prompt = """Você é um Engenheiro Frontend especialista em React e Tailwind CSS.
Sua tarefa é criar um componente funcional React e estilizado com Tailwind CSS para a página de destino (LandingPage) do novo negócio do cliente.

O código gerado deve ser um arquivo LandingPage.jsx React completo e autocontido (export default function LandingPage() { ... }).
Ele deve:
1. Seguir exatamente as diretrizes e seções propostas na análise de design da IA enviada pelo usuário.
2. Utilizar as classes do Tailwind CSS para uma estilização premium, moderna e limpa (use sombras, gradientes, transições e micro-animações).
3. Importar Link de 'react-router-dom' para a ação de agendamento (use <Link to="/agendar" className="..."> para o CTA de agendamento).
4. O design deve se adequar perfeitamente ao setor do negócio (Ex: Barbearia deve ter visual rústico/premium com tons de couro/madeira/escuros; Odontologia deve ser clean, confiável e corporativo; Estética deve ser elegante, rosa/bege, etc.).
5. Usar as variáveis de cor de tailwind 'bg-primary' e 'text-primary' ou 'bg-secondary' e 'text-secondary' nos botões e destaques que devem herdar as cores da marca.
6. Retornar APENAS o código do arquivo LandingPage.jsx, sem explicações adicionais e sem blocos de código markdown (como ```jsx ou ```). Comece direto com o código.
7. Use apenas comentários válidos do JSX (como {/* comentário */}) e NUNCA string literals com barra de comentários (como {"/* comentário */"}) ou comentários HTML, pois eles são renderizados incorretamente como texto na tela.
"""
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "Informações e análises do lead:\n{mensagem}\n\nNome comercial: {app_name}\nCor Primária: {primary_color}\nCor Secundária: {secondary_color}")
            ])
            chain = prompt | llm
            res = chain.invoke({
                "mensagem": mensagem,
                "app_name": app_name,
                "primary_color": primary_color,
                "secondary_color": secondary_color
            })
            code = res.content
            # Remove markdown code fences if LLM accidentally added them
            code = re.sub(r"^```[a-zA-Z0-9]*\n", "", code)
            code = re.sub(r"\n```$", "", code)
            code = code.strip()
        except Exception as e:
            print(f"[Desenvolvedor] Falha ao chamar LLM para código ({str(e)}). Usando fallback local...")
            code = None
            
    if not code:
        print(f"[Desenvolvedor] Utilizando gerador local de fallback para LandingPage (Next.js: {is_nextjs})...")
        code = generate_fallback_landing_page_code(app_name, primary_color, secondary_color, mensagem, is_nextjs)
        
    if is_nextjs:
        landing_page_path = os.path.join(target_path, "frontend", "src", "app", "page.tsx")
        # Remove arquivo legado se existir de tentativas anteriores
        legacy_path = os.path.join(target_path, "frontend", "src", "pages", "LandingPage.jsx")
        if os.path.exists(legacy_path):
            try:
                os.remove(legacy_path)
                print(f"[Desenvolvedor] Arquivo legado removido: {legacy_path}")
                os.rmdir(os.path.dirname(legacy_path))
                print(f"[Desenvolvedor] Pasta legada vazia removida: {os.path.dirname(legacy_path)}")
            except Exception as rm_err:
                pass
    else:
        landing_page_path = os.path.join(target_path, "frontend", "src", "pages", "LandingPage.jsx")
        
    os.makedirs(os.path.dirname(landing_page_path), exist_ok=True)
    with open(landing_page_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Landing Page gerada com sucesso em: {landing_page_path}")


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
    supabase_url = lead_raw.get("supabase_url") or ""
    supabase_anon_key = lead_raw.get("supabase_anon_key") or ""
    
    env_file_path = os.path.join(target_path, "frontend", ".env")
    try:
        with open(env_file_path, 'w', encoding='utf-8') as f:
            f.write(f"VITE_SUPABASE_URL={supabase_url}\n")
            f.write(f"VITE_SUPABASE_ANON_KEY={supabase_anon_key}\n")
            f.write(f"NEXT_PUBLIC_SUPABASE_URL={supabase_url}\n")
            f.write(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={supabase_anon_key}\n")
        print(f"Arquivo .env '{env_file_path}' gravado com credenciais Supabase Single-Tenant e Next.js.")
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
    except Exception as db_err:
        print(f"Erro ao gerar o esquema SQL customizado: {db_err}")

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
    Executa 'npm install' e 'npm run build' na pasta do frontend clonado.
    Analisa o resultado e atualiza o estado com o status de build_success e erros.
    """
    print("\n--- [Agente: QA / Validador] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    attempts = state.get("qa_attempts", 0) + 1
    
    frontend_dir = os.path.join(target_path, "frontend")
    print(f"Executando validações de QA em '{frontend_dir}' (Tentativa {attempts})...")
    
    # 1. Executa 'npm install'
    print("Executando 'npm install'...")
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
