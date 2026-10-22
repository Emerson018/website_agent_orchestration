import json
import os
import re
import shutil
import subprocess
import sys
from typing import Any, Callable, Dict, Optional
from urllib.parse import quote_plus
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
from ai_software_factory import llm_gateway, skill_loader
from ai_software_factory.niche_profiles import resolve_niche_profile
from ai_software_factory.intake_parser import parse_lead_briefing
from ai_software_factory.schemas import ClientConfig
from ai_software_factory.state import AgentState
from ai_software_factory.workspace_provisioner import (
    TenantWorkspace,
    clone_gold_template,
    deploy_tenant_database,
    run_frontend_build,
    validate_and_sanitize_sql,
)

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))


def parse_fallback_requirements(lead_raw: Dict[str, Any]) -> Dict[str, Any]:
    """Delega para o módulo de domínio canônico de resolução de Lead Briefing & Design Direction."""
    return parse_lead_briefing(lead_raw)


def get_niche_media(app_name: str, mensagem: str) -> Dict[str, Any]:
    """Delega para o catálogo canônico de Niche Profiles."""
    return resolve_niche_profile(mensagem, app_name=app_name)


def _merge_with_fallback_direction(
    parsed_data: Dict[str, Any], lead_raw: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Garante que todos os tokens da Design Direction (6 cores, tipografia, tema,
    layout_concept, focal_element, design_critique e copy_tone) estejam preenchidos.
    """
    base = parse_fallback_requirements(lead_raw)
    for k, v in (parsed_data or {}).items():
        if v is not None and str(v).strip() != "" and v != []:
            base[k] = v
    return base


def requirements_analyst_node(
    state: AgentState, llm_adapter: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Agente Analista de Requisitos & Diretor de Design (Passe 1 — Design Direction):
    Lê o Lead Briefing, aplica a skill `/frontend-design` + `stop-slop` via `skill_loader`
    para planejar e criticar a Design Direction do cliente, delegando a síntese estruturada
    ao módulo profundo de LLM Gateway.
    """
    print("\n--- [Agente: Analista de Requisitos — Passe 1: Design Direction] ---")
    lead_raw = state.get("lead_raw_json", {})
    print(f"Analisando lead_raw_json recebido: {lead_raw}")

    planning_skill = skill_loader.get_design_planning_skill_prompt()
    system_prompt = (
        "Você é o Design Lead e Arquiteto de Software Web responsável pelo PASSE 1 (Design Direction & Auto-Crítica).\n"
        "Sua missão é analisar os dados reais do cliente no Lead Briefing e definir uma Design Direction "
        "autoral, específica para a matéria-prima do negócio, evitando qualquer aparência de template genérico.\n\n"
        f"{planning_skill}\n\n"
        "RETORNE ESTRITAMENTE UM OBJETO JSON VÁLIDO correspondente ao schema ClientConfig contendo: "
        "app_name, primary_color, secondary_color, bg_color, surface_color, text_color, muted_color, "
        "theme, font_heading, font_body, logo_url, address, working_hours, phone, niche, tagline, "
        "color_reasoning, layout_concept, focal_element, design_critique, copy_tone, recommended_sections."
    )
    user_prompt = f"Dados brutos e informações completas do Lead Briefing:\n{json.dumps(lead_raw, ensure_ascii=False)}"

    def fallback_action():
        return parse_fallback_requirements(lead_raw)

    result = llm_gateway.synthesize_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        schema_class=ClientConfig,
        temperature=0.2,
        adapter=llm_adapter,
        fallback_fn=fallback_action,
    )

    if isinstance(result, ClientConfig):
        parsed_dict = result.model_dump()
        log_msg = "[RequirementsAnalyst] Design Direction (Passe 1) sintetizada com sucesso via LLM Gateway."
    elif isinstance(result, dict):
        parsed_dict = result
        log_msg = "[RequirementsAnalyst] Design Direction (Passe 1) sintetizada via LLM Gateway."
    else:
        parsed_dict = fallback_action()
        log_msg = "[RequirementsAnalyst] Design Direction estruturada via Fallback determinístico seguro."

    custom_reqs = _merge_with_fallback_direction(parsed_dict, lead_raw)
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
    Provisiona o Tenant Workspace a partir do Gold Template usando o módulo profundo TenantWorkspace.
    """
    print("\n--- [Agente: Infraestrutura / Clonador] ---")
    template = state.get("template_path") or "gold_templates/template_base_app"
    reqs = state.get("customization_requirements", {})
    app_name = reqs.get("app_name", "AppCustomizado")

    workspace = TenantWorkspace.provision(
        app_name=app_name, template_path=template, workspace_root=workspace_root
    )
    target_project = workspace.project_path
    print(f"Template Ouro provisionado de '{template}' para '{target_project}'.")

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(f"[InfraCloner] Workspace provisionado com sucesso em '{target_project}'.")

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
    design_direction: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Gera uma LandingPage autoral seguindo as diretrizes da skill `frontend-design`:
    - Sem duplicar <header> ou <footer> (já providos pelo MainLayout.jsx).
    - Usa as variáveis CSS semânticas (:root --bg-color, --surface-color, --border-color, --text-color, --muted-color, --primary-color) e as fontes (.font-display / .font-sans).
    - Sem os tells proibidos pela skill (sem eyebrows ALL-CAPS em todas as seções, sem SaaS-card kit de 3 cartões idênticos, sem setas '→' anexadas aos botões).
    """
    profile = resolve_niche_profile(mensagem, app_name=app_name)
    direction = design_direction or {}

    addr = address or direction.get("address") or "Av. Principal, 1000 - Centro"
    hours = working_hours or direction.get("working_hours") or "Segunda a Sábado das 9h às 19h"
    tel = phone or direction.get("phone") or "(51) 99999-9999"
    hero_title = direction.get("tagline") or profile["hero_title"]
    hero_desc = profile["hero_desc"]

    link_import = (
        "import Link from 'next/link';"
        if is_nextjs
        else "import { Link } from 'react-router-dom';"
    )
    link_attr = "href" if is_nextjs else "to"

    service_rows = ""
    for s in profile["services"]:
        service_rows += f"""
            <article className="py-8 border-b border-[var(--border-color,#2E2924)] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-3 overflow-hidden rounded-xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#2E2924)]">
                <img
                  src="{s['img']}"
                  alt="{s['name']}"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="md:col-span-6 space-y-2">
                <h3 className="font-display text-xl font-bold text-[var(--text-color,#F5F4F0)]">
                  {s['name']}
                </h3>
                <p className="text-sm text-[var(--muted-color,#A8A29E)] max-w-prose leading-relaxed">
                  {s['desc']}
                </p>
              </div>
              <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-3">
                <span className="font-display text-lg font-bold text-[var(--text-color,#F5F4F0)]">
                  {s['price']}
                </span>
                <Link
                  {link_attr}="/agendar"
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-[var(--surface-color,#181614)] hover:bg-[var(--primary-color,#E55A1B)] hover:text-white text-[var(--text-color,#F5F4F0)] border border-[var(--border-color,#2E2924)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#E55A1B)]"
                >
                  Escolher horário
                </Link>
              </div>
            </article>
        """

    return f"""import React from 'react';
{link_import}

export default function LandingPage() {{
  return (
    <div className="w-full bg-[var(--bg-color)] text-[var(--text-color)] font-sans">
      {{/* Abertura Editorial Assimétrica (Ponto Focal Único) */}}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 lg:py-24 border-b border-[var(--border-color)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <p className="text-sm font-medium text-[var(--primary-color)]">
              {profile['niche']} · {app_name}
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-color)] leading-[1.08]">
              {hero_title}
            </h1>

            <p className="text-base sm:text-lg text-[var(--muted-color)] max-w-2xl leading-relaxed">
              {hero_desc}
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                {link_attr}="/agendar"
                className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] rounded-xl text-base font-bold bg-[var(--primary-color)] hover:brightness-110 text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
              >
                Reservar horário
              </Link>

              <a
                href="#destaques"
                className="inline-flex items-center justify-center px-6 py-4 min-h-[48px] rounded-xl text-base font-semibold bg-[var(--surface-color)] text-[var(--text-color)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
              >
                Ver especialidades e valores
              </a>
            </div>

            <dl className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border-color)] text-sm">
              <div>
                <dt className="font-semibold text-[var(--text-color)]">Funcionamento</dt>
                <dd className="text-[var(--muted-color)] mt-0.5">{hours}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-color)]">Localização</dt>
                <dd className="text-[var(--muted-color)] mt-0.5">{addr}</dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] shadow-lg">
              <img
                src="{profile['hero_img']}"
                alt="{app_name}"
                className="w-full h-[380px] sm:h-[460px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {{/* Quadro de Especialidades & Preços (Estrutura Linear Informativa) */}}
      <section id="destaques" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl space-y-2 mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-color)]">
            Especialidades e atendimento
          </h2>
          <p className="text-base text-[var(--muted-color)] leading-relaxed">
            Confira as opções disponíveis no {app_name} e escolha o horário diretamente na agenda online.
          </p>
        </div>

        <div className="border-t border-[var(--border-color)]">
          {service_rows}
        </div>
      </section>

      {{/* Sobre o Estabelecimento & Endereço */}}
      <section id="sobre" className="bg-[var(--surface-color)] border-t border-[var(--border-color)] py-20">
        <div id="contato" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-color)]">
              Atendimento com hora marcada no {app_name}
            </h2>
            <p className="text-base text-[var(--muted-color)] max-w-prose leading-relaxed">
              Organizamos nossa agenda para receber você no horário combinado, com preparo prévio da equipe e confirmação imediata pelo sistema.
            </p>
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-[var(--text-color)]">
                Informações para visita
              </h3>
              <p className="text-sm text-[var(--muted-color)]">
                {addr}
              </p>
            </div>

            <div className="space-y-2 text-sm border-y border-[var(--border-color)] py-4">
              <p className="flex justify-between gap-4">
                <span className="text-[var(--muted-color)]">Horários:</span>
                <span className="font-medium text-[var(--text-color)] text-right">{hours}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[var(--muted-color)]">Telefone / WhatsApp:</span>
                <span className="font-medium text-[var(--text-color)] text-right">{tel}</span>
              </p>
            </div>

            <Link
              {link_attr}="/agendar"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--primary-color)] hover:brightness-110 text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
            >
              Agendar horário agora
            </Link>
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
    workspace: Optional[TenantWorkspace] = None,
) -> str:
    """
    Passe 2 (Construção do Código Frontend):
    Gera `LandingPage.jsx` injetando obrigatoriamente a skill `frontend-design` +
    `stop-slop` + `web-design-guidelines` e a Design Direction aprovada no Passe 1.
    """
    app_name = reqs.get("app_name", "AppCustomizado")
    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    address = reqs.get("address", "")
    working_hours = reqs.get("working_hours", "")
    phone = reqs.get("phone", "")
    mensagem = lead_raw.get("mensagem", "")

    profile = resolve_niche_profile(mensagem, app_name=app_name)
    direction = _merge_with_fallback_direction(reqs, lead_raw)
    coding_skill_prompt = skill_loader.get_frontend_coding_skill_prompt(direction)

    system_prompt = f"""Você é um Design Engineer Sênior especialista em React (Vite) e Tailwind CSS.
Sua missão é executar o PASSE 2 (Construção de Interface) gerando o componente `LandingPage.jsx` sob medida para o estabelecimento do cliente, seguindo rigorosamente a skill `/frontend-design` e a Design Direction aprovada no Passe 1.

{coding_skill_prompt}

CONTRATO ARQUITETURAL E INVARIANTES TÉCNICOS DO GOLD TEMPLATE:
1. O componente `MainLayout.jsx` já envolve a rota `/` com o Header/Navbar global e o Footer global. Portanto, NÃO crie tags `<header>`, `<nav>` ou `<footer>` duplicadas dentro de `LandingPage.jsx`. Concentre 100% da página nas seções de conteúdo (`<section id="destaques">`, `<section id="sobre">`, `<section id="contato">`).
2. Use as variáveis CSS semânticas já injetadas em `:root` (`var(--bg-color)`, `var(--surface-color)`, `var(--border-color)`, `var(--text-color)`, `var(--muted-color)`, `var(--primary-color)`, `var(--secondary-color)`) e as classes tipográficas `font-display` (títulos) e `font-sans` (corpo).
3. Fotos reais curadas do setor disponíveis para uso:
   - Imagem Principal / Ambiente: '{profile['hero_img']}'
   - Serviço 1: '{profile['services'][0]['name']}' ({profile['services'][0]['price']}) — '{profile['services'][0]['img']}' — {profile['services'][0]['desc']}
   - Serviço 2: '{profile['services'][1]['name']}' ({profile['services'][1]['price']}) — '{profile['services'][1]['img']}' — {profile['services'][1]['desc']}
   - Serviço 3: '{profile['services'][2]['name']}' ({profile['services'][2]['price']}) — '{profile['services'][2]['img']}' — {profile['services'][2]['desc']}
4. Inicie obrigatoriamente importando:
   import React from 'react';
   import {{ Link }} from 'react-router-dom';
5. O componente DEVE ser exportado como: `export default function LandingPage() {{ ... }}`
6. Todos os botões de agendamento DEVEM usar `<Link to="/agendar">` da biblioteca `react-router-dom` com texto em voz ativa (sem setas '→' anexadas).
7. Retorne APENAS o código JSX puro, sem explicações em texto e sem blocos markdown (sem ```jsx ou ```).
"""

    user_prompt = (
        f"Construa o código completo de `LandingPage.jsx` para o cliente:\n"
        f"- Estabelecimento: '{app_name}'\n"
        f"- Nicho: '{direction.get('niche') or profile['niche']}'\n"
        f"- Tema: '{direction.get('theme')}'\n"
        f"- Paleta Semântica: Primária={direction.get('primary_color')}, Secundária={direction.get('secondary_color')}, "
        f"Fundo={direction.get('bg_color')}, Superfície={direction.get('surface_color')}, Texto={direction.get('text_color')}, Muted={direction.get('muted_color')}\n"
        f"- Tipografia: Display='{direction.get('font_heading')}', Corpo='{direction.get('font_body')}'\n"
        f"- Conceito de Layout: {direction.get('layout_concept')}\n"
        f"- Elemento Focal Único: {direction.get('focal_element')}\n"
        f"- Crítica Anti-Clichê: {direction.get('design_critique')}\n"
        f"- Endereço: '{address}'\n"
        f"- Horários: '{working_hours}'\n"
        f"- Telefone/WhatsApp: '{phone}'\n"
        f"- Briefing Original: {mensagem}"
    )

    def _fallback() -> str:
        print(
            "[Desenvolvedor] Utilizando gerador autoral de fallback alinhado à Design Direction e skill frontend-design..."
        )
        return generate_fallback_landing_page_code(
            app_name,
            primary_color,
            secondary_color,
            mensagem,
            False,
            address,
            working_hours,
            phone,
            design_direction=direction,
        )

    code = llm_gateway.generate_code(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        adapter=code_llm_adapter,
        validator_fn=lambda c: len(c) >= 50 and "export default" in c,
        fallback_fn=_fallback,
    ) or _fallback()

    ws = workspace or TenantWorkspace(target_path)
    landing_page_path = ws.write_landing_page(code)
    print(f"Landing Page gerada com sucesso em: {landing_page_path}")
    return landing_page_path


def code_injector_node(
    state: AgentState,
    code_llm_adapter: Optional[Callable[[str, str], Optional[str]]] = None,
    rpc_adapter: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """
    Agente Desenvolvedor / Injetor de Código (Passe 2 — Code Generation):
    Aplica a Design Direction completa, injeta Google Fonts no index.html e tokens semânticos
    no index.css, grava ai_config.json, gera a LandingPage.jsx com a skill `/frontend-design`
    e provisiona o esquema SQL delegando mutações de infraestrutura ao TenantWorkspace.
    """
    print("\n--- [Agente: Desenvolvedor / Injetor — Passe 2: Frontend Design] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    template_path = state.get("template_path") or "gold_templates/template_base_app"
    raw_reqs = state.get("customization_requirements", {})
    lead_raw = state.get("lead_raw_json", {})
    last_report = state.get("last_qa_report", {})

    reqs = _merge_with_fallback_direction(raw_reqs, lead_raw)
    app_name = reqs.get("app_name", "AppCustomizado")

    workspace = TenantWorkspace(target_path)
    workspace.apply_design_direction(direction=reqs, lead_raw=lead_raw)

    try:
        generate_landing_page(
            target_path,
            reqs,
            lead_raw,
            code_llm_adapter=code_llm_adapter,
            workspace=workspace,
        )
    except Exception as page_err:
        print(f"Erro ao gerar a LandingPage customizada: {page_err}")

    try:
        raw_sub_url = (lead_raw.get("supabase_url") or "").strip()
        raw_sub_key = (
            lead_raw.get("supabase_service_role_key")
            or lead_raw.get("supabase_anon_key")
            or ""
        ).strip()
        workspace.deploy_schema(
            supabase_url=raw_sub_url,
            supabase_key=raw_sub_key,
            rpc_adapter=rpc_adapter,
            template_path=template_path,
        )
    except Exception as db_err:
        print(f"Erro ao gerar/provisionar o esquema SQL customizado: {db_err}")

    primary_color = reqs.get("primary_color", "#D4AF37")
    secondary_color = reqs.get("secondary_color", "#1A1A1A")
    bg_color = reqs.get("bg_color", "#0E0D0C")
    surface_color = reqs.get("surface_color", "#181614")
    text_color = reqs.get("text_color", "#F5F4F0")
    muted_color = reqs.get("muted_color", "#A8A29E")
    theme = reqs.get("theme", "dark")
    font_heading = reqs.get("font_heading", "Plus Jakarta Sans")
    font_body = reqs.get("font_body", "Inter")
    layout_concept = reqs.get("layout_concept", "")
    focal_element = reqs.get("focal_element", "")
    design_critique = reqs.get("design_critique", "")
    copy_tone = reqs.get("copy_tone", "")

    contexto_arquitetura = f"""Contexto de Arquitetura & Design Direction: {app_name}
1. Design Direction (Gerada com a Skill /frontend-design)
Tema: {theme}
Cor Primária (--primary-color): {primary_color}
Cor Secundária (--secondary-color): {secondary_color}
Cor de Fundo (--bg-color): {bg_color}
Cor de Superfície (--surface-color): {surface_color}
Cor de Texto Principal (--text-color): {text_color}
Cor de Texto Secundário (--muted-color): {muted_color}
Fonte de Títulos (--font-display): {font_heading}
Fonte de Corpo (--font-sans): {font_body}
Conceito de Layout: {layout_concept}
Elemento Focal Único: {focal_element}
Revisão Anti-Clichê: {design_critique}
Tom de Escrita UX: {copy_tone}

2. Stack Tecnológica Base
Frontend: React + Vite
Estilização: TailwindCSS (usando variáveis semânticas de index.css)
Backend/Auth/DB: Supabase

3. Regras Estritas de Manutenção (Para Agentes de IA)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.
DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.
DIRETRIZ 3: NENHUMA dependência npm externa deve ser instalada sem aprovação explícita do usuário.
DIRETRIZ 4: Mantenha as rotas protegidas sob o fluxo de autenticação atual e NÃO duplique o Header/Footer do MainLayout.jsx dentro das páginas filhas.
DIRETRIZ 5: Toda alteração de interface DEVE seguir os princípios da skill `.agents/skills/frontend-design/SKILL.md` (evitar SaaS-card kit genérico, evitar ALL-CAPS eyebrows repetitivos, usar voz ativa e preservar os tokens semânticos da Design Direction acima).
"""

    workspace.write_architecture_context(contexto_arquitetura)

    if last_report and last_report.get("error"):
        print(f"Corrigindo falha reportada pelo QA anterior: {last_report.get('error')}")

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(
        "[CodeInjector] Design Direction injetada em ai_config.json, index.html, index.css e LandingPage.jsx gerada com a skill frontend-design."
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
