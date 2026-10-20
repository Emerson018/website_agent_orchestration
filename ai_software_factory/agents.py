import json
import os
import re
import shutil
import subprocess
import sys
from typing import Any, Callable, Dict, Optional
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate

# Garante codificação UTF-8 no console do Windows para evitar UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from ai_software_factory.schemas import ClientConfig
from ai_software_factory.state import AgentState
from ai_software_factory.workspace_provisioner import (
    clone_gold_template,
    deploy_tenant_database,
    run_frontend_build,
    validate_and_sanitize_sql,
)

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))


def parse_fallback_requirements(lead_raw: Dict[str, Any]) -> Dict[str, Any]:
    """Delega para o módulo profundo de resolução de Lead Briefing & Niche Profile."""
    return config.parse_lead_briefing(lead_raw)


def get_niche_media(app_name: str, mensagem: str) -> Dict[str, Any]:
    """Delega para o Niche Profile canônico em config.py."""
    return config.resolve_niche_profile(mensagem, app_name=app_name)


def invocar_lm_studio_para_codigo(prompt_sistema: str, prompt_usuario: str) -> Optional[str]:
    """Delega para o cliente HTTP do LM Studio em config.py."""
    return config.invoke_local_lm_studio_http(prompt_sistema, prompt_usuario)


def requirements_analyst_node(
    state: AgentState, llm_adapter: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Agente Analista de Requisitos (Real com Fallback Seguro):
    Lê o Lead Briefing, consulta o gateway unificado de LLM se configurado,
    ou aplica a extração determinística de Niche Profile como fallback.
    """
    print("\n--- [Agente: Analista de Requisitos] ---")
    lead_raw = state.get("lead_raw_json", {})
    print(f"Analisando lead_raw_json recebido: {lead_raw}")

    llm_info = config.describe_active_llm()
    llm = config.get_llm(temperature=0.0, adapter=llm_adapter)

    if llm is None:
        print("[Analista de Requisitos] AVISO: Nenhuma chave de API de LLM configurada.")
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

            prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    ("user", "Dados brutos e informações completas do lead/cliente:\n{lead_raw_json}"),
                ]
            )

            if llm_info["provider"] == "local" and llm_adapter is None:
                formatted_messages = prompt.format_messages(
                    lead_raw_json=json.dumps(lead_raw, ensure_ascii=False)
                )
                raw_res = llm.invoke(formatted_messages)
                content = raw_res.content if hasattr(raw_res, "content") else str(raw_res)

                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                parsed_json = json.loads(json_match.group(0) if json_match else content)

                fallback_base = parse_fallback_requirements(lead_raw)
                for k, v in parsed_json.items():
                    if v and str(v).strip():
                        fallback_base[k] = v
                custom_reqs = fallback_base
                log_msg = f"[RequirementsAnalyst] Requisitos e layout analisados via {llm_info['label']} com sucesso."
            else:
                structured_llm = llm.with_structured_output(ClientConfig)
                chain = prompt | structured_llm
                result: ClientConfig = chain.invoke(
                    {"lead_raw_json": json.dumps(lead_raw, ensure_ascii=False)}
                )
                custom_reqs = result.model_dump()
                log_msg = "[RequirementsAnalyst] Requisitos e arquitetura de marca analisados via LLM com sucesso."
        except Exception as e:
            print(
                f"[Analista de Requisitos] AVISO: Falha ao chamar a LLM ({str(e)}). Executando fallback local inteligente..."
            )
            custom_reqs = parse_fallback_requirements(lead_raw)
            log_msg = f"[RequirementsAnalyst] Requisitos estruturados via Fallback inteligente devido a exceção: {str(e)}"

    template = state.get("template_path") or "gold_templates/template_base_app"

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(log_msg)

    return {
        "customization_requirements": custom_reqs,
        "template_path": template,
        "execution_logs": current_logs,
    }


def infra_cloner_node(state: AgentState, workspace_root: str = "workspace") -> Dict[str, Any]:
    """
    Agente Infraestrutura / Clonador (Real):
    Clona o Gold Template para o Tenant Workspace usando o módulo de provisionamento.
    """
    print("\n--- [Agente: Infraestrutura / Clonador] ---")
    template = state.get("template_path") or "gold_templates/template_base_app"
    reqs = state.get("customization_requirements", {})
    app_name = reqs.get("app_name", "AppCustomizado")

    target_project = clone_gold_template(
        app_name=app_name, template_path=template, workspace_root=workspace_root
    )
    print(f"Template Ouro clonado de '{template}' para '{target_project}'.")

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(f"[InfraCloner] Template clonado com sucesso para {target_project}.")

    return {
        "target_project_path": target_project,
        "execution_logs": current_logs,
    }


def generate_fallback_landing_page_code(
    app_name: str,
    primary_color: str,
    secondary_color: str,
    mensagem: str,
    is_nextjs: bool = False,
    address: str = "",
    working_hours: str = "",
    phone: str = "",
) -> str:
    """Gera uma LandingPage completa em 5 blocos com fotos do Unsplash caso o modelo LLM não esteja disponível."""
    media = get_niche_media(app_name, mensagem)

    addr = address or "Av. Principal, 1000 - Centro"
    hours = working_hours or "Segunda a Sábado das 9h às 19h"
    tel = phone or "(51) 99999-9999"

    link_import = (
        "import Link from 'next/link';"
        if is_nextjs
        else "import { Link } from 'react-router-dom';"
    )
    link_attr = "href" if is_nextjs else "to"

    services_cards = ""
    for s in media["services"]:
        services_cards += f"""
          <div className="overflow-hidden rounded-2xl border border-[#2E2924] bg-[#181614] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--primary-color,#E55A1B)]/50 flex flex-col text-left group">
            <div className="relative h-48 overflow-hidden bg-[#1F1C19]">
              <img src="{s['img']}" alt="{s['name']}" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
              <div>
                <h4 className="text-lg font-bold text-[#F5F4F0] group-hover:text-[var(--primary-color,#E55A1B)] transition-colors">{s['name']}</h4>
                <p className="text-xs text-[#A8A29E] mt-2 leading-relaxed">{s['desc']}</p>
              </div>
              <div className="pt-3 border-t border-[#262320] flex items-center justify-between">
                <span className="text-base font-extrabold text-[#F5F4F0]">{s['price']}</span>
                <Link {link_attr}="/agendar" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#262320] hover:bg-[var(--primary-color,#E55A1B)] hover:text-white text-[#D6D3D1] transition-all">
                  Agendar
                </Link>
              </div>
            </div>
          </div>
        """

    return f"""import React from 'react';
{link_import}

export default function LandingPage() {{
  return (
    <div className="w-full bg-[#0E0D0C] text-[#F5F4F0] overflow-hidden">
      {{/* Bloco 1: Hero Section de Alto Impacto */}}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0">
          <img 
            src="{media['hero_img']}" 
            alt="{app_name}" 
            className="w-full h-full object-cover object-center filter brightness-[0.35] contrast-[1.1]" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D0C] via-[#0E0D0C]/60 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F1C19]/80 border border-[var(--primary-color,#E55A1B)]/30 backdrop-blur-md">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary-color,#E55A1B)]">
              {media['niche']}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-[#F5F4F0] leading-tight">
            {media['hero_title']}
          </h1>

          <p className="text-base sm:text-lg text-[#D6D3D1] max-w-2xl mx-auto leading-relaxed">
            {media['hero_desc']}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              {link_attr}="/agendar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold bg-[var(--primary-color,#E55A1B)] hover:brightness-110 text-white shadow-xl shadow-[var(--primary-color,#E55A1B)]/30 transition-all active:scale-95"
            >
              <span>Agendar Agora</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <a 
              href="#destaques"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold bg-[#1F1C19]/90 hover:bg-[#2A2622] text-[#F5F4F0] border border-[#2E2924] transition-colors"
            >
              <span>Conhecer Serviços</span>
            </a>
          </div>
        </div>
      </section>

      {{/* Bloco 2: Sobre a Casa & Diferenciais */}}
      <section id="sobre" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary-color,#E55A1B)]">
              Experiência & Cuidado
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F4F0] leading-tight">
              Excelência e atenção em cada detalhe.
            </h2>
            <p className="text-sm sm:text-base text-[#D6D3D1] leading-relaxed">
              No {app_name}, unimos tradição, técnica e acolhimento para proporcionar a você a melhor experiência.
              Nosso espaço foi pensado para o seu bem-estar, com agendamentos pontuais e atendimento exclusivo.
            </p>
          </div>
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-[#2E2924] shadow-2xl">
              <img 
                src="{media['hero_img']}" 
                alt="{app_name}" 
                className="w-full h-[360px] object-cover hover:scale-105 transition-transform duration-700" 
              />
            </div>
          </div>
        </div>
      </section>

      {{/* Bloco 3: Vitrine de Destaques */}}
      <section id="destaques" className="py-20 bg-[#121110] border-y border-[#262320]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary-color,#E55A1B)]">
              Serviços Selecionados
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F4F0]">
              Especialidades & Atendimentos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services_cards}
          </div>
        </div>
      </section>

      {{/* Bloco 4: Localização, Horários & Reserva Rápida */}}
      <section id="contato" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-[#141211] rounded-3xl border border-[#2E2924] p-8 sm:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary-color,#E55A1B)]">
                Localização & Atendimento
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F5F4F0]">
                Fácil acesso e conveniência para você
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#1A1816] border border-[#262320]">
                  <p className="text-xs text-[#78716C] uppercase font-semibold">Endereço</p>
                  <p className="text-sm font-medium text-[#F5F4F0] mt-1">{addr}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#1A1816] border border-[#262320]">
                  <p className="text-xs text-[#78716C] uppercase font-semibold">Horários</p>
                  <p className="text-sm font-medium text-[#F5F4F0] mt-1">{hours}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#1A1816] border border-[#262320] text-center space-y-4">
              <h3 className="font-display text-xl font-bold text-[#F5F4F0]">
                Reserve Online em Segundos
              </h3>
              <p className="text-xs text-[#A8A29E]">
                Escolha a data e horário ideal sem esperas.
              </p>
              <Link 
                {link_attr}="/agendar"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-[var(--primary-color,#E55A1B)] hover:brightness-110 text-white shadow-lg transition-all"
              >
                <span>Agendar Horário</span>
              </Link>
              <p className="text-[11px] text-[#78716C]">
                Contato: <span className="text-[#D6D3D1] font-semibold">{tel}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}}
"""


def generate_landing_page(
    target_path: str,
    reqs: Dict[str, Any],
    lead_raw: Dict[str, Any],
    code_llm_adapter: Optional[Callable[[str, str], Optional[str]]] = None,
):
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    address = reqs.get("address", "")
    working_hours = reqs.get("working_hours", "")
    phone = reqs.get("phone", "")
    mensagem = lead_raw.get("mensagem", "")

    media = get_niche_media(app_name, mensagem)

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

    user_prompt = (
        f"Dados do cliente para o layout:\n- Nome: '{app_name}'\n- Nicho: '{media['niche']}'\n"
        f"- Cor Primária: '{primary_color}'\n- Cor Secundária: '{secondary_color}'\n"
        f"- Endereço: '{address}'\n- Horários: '{working_hours}'\n- Contato: '{phone}'\n- Briefing: {mensagem}"
    )

    code = config.invoke_code_llm(system_prompt, user_prompt, adapter=code_llm_adapter)

    if not code or len(code) < 50 or "export default" not in code:
        print(
            "[Desenvolvedor] Utilizando gerador visual inteligente de fallback com fotos Unsplash em 5 blocos..."
        )
        code = generate_fallback_landing_page_code(
            app_name, primary_color, secondary_color, mensagem, False, address, working_hours, phone
        )

    landing_page_path = os.path.join(target_path, "frontend", "src", "pages", "LandingPage.jsx")
    os.makedirs(os.path.dirname(landing_page_path), exist_ok=True)
    with open(landing_page_path, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"Landing Page gerada com sucesso em: {landing_page_path}")


def provision_client_database(
    target_path: str,
    lead_raw: Dict[str, Any],
    rpc_adapter: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
):
    supabase_url = (lead_raw.get("supabase_url") or "").strip()
    supabase_key = (
        lead_raw.get("supabase_service_role_key") or lead_raw.get("supabase_anon_key") or ""
    ).strip()

    db_dir = os.path.join(target_path, "database")
    if not supabase_url or not supabase_key:
        print(
            f"\n[Supabase Single-Tenant] Nenhuma credencial de banco enviada no lead. O arquivo base_schema.sql foi salvo em '{db_dir}'."
        )
        return

    res = deploy_tenant_database(
        project_path=target_path,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        rpc_adapter=rpc_adapter,
    )
    if res["success"]:
        print(" -> Tabelas base provisionadas com sucesso via RPC exec_sql!")
    else:
        print(
            f" -> Aviso ao provisionar via RPC exec_sql ({res['error']}). O schema base_schema.sql está pronto em '{db_dir}'."
        )


def generate_niche_database_schema(
    target_path: str,
    lead_raw: Dict[str, Any],
    template_path: str = "gold_templates/template_base_app",
):
    """Copia a base geral padronizada do banco (base_schema.sql) para a pasta database do projeto."""
    db_dir = os.path.join(target_path, "database")
    os.makedirs(db_dir, exist_ok=True)

    base_template_schema = os.path.join(template_path, "supabase_schema", "base_schema.sql")
    if not os.path.exists(base_template_schema):
        base_template_schema = "gold_templates/template_base_app/supabase_schema/base_schema.sql"

    base_dest_schema = os.path.join(db_dir, "base_schema.sql")

    if os.path.exists(base_template_schema):
        shutil.copy2(base_template_schema, base_dest_schema)
        print(
            f"[Desenvolvedor] Esquema base geral '{base_template_schema}' copiado com sucesso para: {base_dest_schema}"
        )


def update_project_frontend_entrypoints(target_path: str, app_name: str):
    """Garante que a rota principal de App.jsx seja a LandingPage (/) e o BookingPage (/agendar)."""
    app_jsx_path = os.path.join(target_path, "frontend", "src", "App.jsx")
    if os.path.exists(app_jsx_path):
        try:
            with open(app_jsx_path, "r", encoding="utf-8") as f:
                content = f.read()
            if "LandingPage" not in content:
                content = content.replace(
                    "import BookingPage from './pages/BookingPage';",
                    "import LandingPage from './pages/LandingPage';\nimport BookingPage from './pages/BookingPage';",
                )
            content = content.replace(
                "{ index: true, element: <BookingPage /> }",
                "{ index: true, element: <LandingPage /> }",
            )
            if '{ path: "agendar", element: <BookingPage /> }' not in content:
                content = content.replace(
                    "{ index: true, element: <LandingPage /> },",
                    '{ index: true, element: <LandingPage /> },\n      { path: "agendar", element: <BookingPage /> },',
                )
            with open(app_jsx_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"Aviso ao atualizar App.jsx: {e}")

    index_html_path = os.path.join(target_path, "frontend", "index.html")
    if os.path.exists(index_html_path):
        try:
            with open(index_html_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            html_content = re.sub(
                r"<title>.*?</title>", f"<title>{app_name}</title>", html_content
            )
            with open(index_html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
        except Exception as e:
            print(f"Aviso ao atualizar index.html: {e}")


def update_project_css_theme(
    target_path: str, reqs: Dict[str, Any], lead_raw: Dict[str, Any]
):
    """Injeta as variáveis CSS da marca (:root --primary-color, --secondary-color, --bg-color) no index.css usando o Niche Profile."""
    index_css_path = os.path.join(target_path, "frontend", "src", "index.css")
    if os.path.exists(index_css_path):
        try:
            with open(index_css_path, "r", encoding="utf-8") as f:
                css = f.read()

            app_name = reqs.get("app_name", "")
            mensagem = lead_raw.get("mensagem", "")
            profile = config.resolve_niche_profile(mensagem, app_name=app_name)

            p_color = reqs.get("primary_color") or profile["primary_color"]
            s_color = reqs.get("secondary_color") or profile["secondary_color"]
            bg_color = profile["bg_color"]
            text_color = profile["text_color"]

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
            css_clean = re.sub(r'@import\s+["\'][^"\']+["\'];?', "", css)
            css_clean = re.sub(r'@config\s+["\'][^"\']+["\'];?', "", css_clean)
            css_clean = re.sub(r":root\s*\{[^}]*\}", "", css_clean)
            css_clean = re.sub(r"html,\s*body,\s*#root\s*\{[^}]*\}", "", css_clean)
            new_css = root_vars + css_clean.strip()

            with open(index_css_path, "w", encoding="utf-8") as f:
                f.write(new_css)
        except Exception as e:
            print(f"Aviso ao atualizar temas CSS em index.css: {e}")


def code_injector_node(
    state: AgentState,
    code_llm_adapter: Optional[Callable[[str, str], Optional[str]]] = None,
    rpc_adapter: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """
    Agente Desenvolvedor / Injetor de Código (Real):
    Aplica o Niche Profile, grava ai_config.json e .env, gera a LandingPage.jsx e provisiona o esquema SQL.
    """
    print("\n--- [Agente: Desenvolvedor / Injetor] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    template_path = state.get("template_path") or "gold_templates/template_base_app"
    reqs = state.get("customization_requirements", {})
    lead_raw = state.get("lead_raw_json", {})
    last_report = state.get("last_qa_report", {})

    app_name = reqs.get("app_name", "AppCustomizado")

    update_project_frontend_entrypoints(target_path, app_name)
    update_project_css_theme(target_path, reqs, lead_raw)

    config_file_path = os.path.join(target_path, "frontend", "ai_config.json")
    if os.path.exists(config_file_path):
        try:
            with open(config_file_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
        except Exception:
            config_data = {}
    else:
        config_data = {}

    config_data.update(reqs)
    os.makedirs(os.path.dirname(config_file_path), exist_ok=True)
    with open(config_file_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)

    raw_sub_url = (lead_raw.get("supabase_url") or "").strip()
    raw_sub_key = (lead_raw.get("supabase_anon_key") or "").strip()

    supabase_url = raw_sub_url if raw_sub_url else "https://your-project.supabase.co"
    supabase_anon_key = raw_sub_key if raw_sub_key else "your-anon-key-here"

    env_file_path = os.path.join(target_path, "frontend", ".env")
    try:
        with open(env_file_path, "w", encoding="utf-8") as f:
            f.write(f"VITE_SUPABASE_URL={supabase_url}\n")
            f.write(f"VITE_SUPABASE_ANON_KEY={supabase_anon_key}\n")
            f.write(f"NEXT_PUBLIC_SUPABASE_URL={supabase_url}\n")
            f.write(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={supabase_anon_key}\n")
    except Exception as env_err:
        print(f"Erro ao gravar arquivo .env customizado: {env_err}")

    try:
        generate_landing_page(target_path, reqs, lead_raw, code_llm_adapter=code_llm_adapter)
    except Exception as page_err:
        print(f"Erro ao gerar a LandingPage customizada: {page_err}")

    try:
        generate_niche_database_schema(target_path, lead_raw, template_path=template_path)
        provision_client_database(target_path, lead_raw, rpc_adapter=rpc_adapter)
    except Exception as db_err:
        print(f"Erro ao gerar/provisionar o esquema SQL customizado: {db_err}")

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
    with open(contexto_path, "w", encoding="utf-8") as f:
        f.write(contexto_arquitetura)

    if last_report and last_report.get("error"):
        print(f"Corrigindo falha reportada pelo QA anterior: {last_report.get('error')}")

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(
        "[CodeInjector] Customização injetada fisicamente no ai_config.json e LandingPage.jsx gerada."
    )

    return {"execution_logs": current_logs}


def qa_validator_node(
    state: AgentState,
    command_runner: Optional[Callable[[str, str], subprocess.CompletedProcess]] = None,
) -> Dict[str, Any]:
    """
    Agente QA / Validador de Build (Real):
    Executa a validação de build através do módulo de provisionamento (com seam para runner de testes).
    """
    print("\n--- [Agente: QA / Validador] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    attempts = state.get("qa_attempts", 0) + 1

    res = run_frontend_build(target_path, command_runner=command_runner)
    build_success = res["build_success"]
    report = res["report"]

    current_logs = state.get("execution_logs", []).copy()
    if build_success:
        current_logs.append(
            f"[QAValidator] Build e testes executados com sucesso na tentativa {attempts}."
        )
    else:
        current_logs.append(
            f"[QAValidator] Build falhou na tentativa {attempts}. Erro: {report.get('error', '')[:100]}..."
        )

    return {
        "build_success": build_success,
        "last_qa_report": report,
        "qa_attempts": attempts,
        "execution_logs": current_logs,
    }
