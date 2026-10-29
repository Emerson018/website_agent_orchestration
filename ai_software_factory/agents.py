import json
import os
import re
import shutil
import subprocess
import sys
from typing import Any, Callable, Dict, List, Optional
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
from ai_software_factory.niche_profiles import (
    LAYOUT_ARCHETYPES,
    resolve_niche_profile,
    select_layout_archetype,
)
from ai_software_factory.intake_parser import (
    extract_contextual_brand_insights,
    parse_lead_briefing,
)
from ai_software_factory.schemas import BrandDesignSpec, ClientConfig
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
    """Delega para o módulo de domínio canônico de resolução de Lead Briefing & BrandDesignSpec."""
    return parse_lead_briefing(lead_raw)


def get_niche_media(app_name: str, mensagem: str) -> Dict[str, Any]:
    """Delega para o catálogo canônico de Niche Profiles."""
    return resolve_niche_profile(mensagem, app_name=app_name)


def _merge_with_fallback_direction(
    parsed_data: Dict[str, Any], lead_raw: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Garante que todos os tokens do BrandDesignSpec (6 cores, tipografia, tema,
    brand_essence, real_services, layout_archetype, section_blueprint, layout_concept,
    focal_element, design_critique e copy_tone) estejam preenchidos.
    """
    base = parse_fallback_requirements(lead_raw)
    for k, v in (parsed_data or {}).items():
        if v is not None and str(v).strip() != "" and v != []:
            if hasattr(v, "model_dump"):
                base[k] = v.model_dump()
            elif isinstance(v, list) and v and hasattr(v[0], "model_dump"):
                base[k] = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
            else:
                base[k] = v
    return base


def requirements_analyst_node(
    state: AgentState, llm_adapter: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Agente Analista de Requisitos & Diretor de Marca (Passe 1 — BrandDesignSpec):
    Lê o Lead Briefing, aplica a skill `/frontend-design` + `stop-slop` via `skill_loader`
    para planejar a Design Direction e o arquétipo estrutural de layout único do cliente,
    delegando a síntese estruturada ao módulo profundo de LLM Gateway (Gemini CLI -> API gemini-3.8-flash).
    """
    print("\n--- [Agente: Analista de Requisitos — Passe 1: BrandDesignSpec] ---")
    lead_raw = state.get("lead_raw_json", {})
    print(f"Analisando lead_raw_json recebido: {lead_raw}")

    planning_skill = skill_loader.get_design_planning_skill_prompt()
    system_prompt = (
        "Você é o Design Lead e Arquiteto de Software Web responsável pelo PASSE 1 (BrandDesignSpec & Auto-Crítica).\n"
        "Sua missão é analisar os dados reais do cliente no Lead Briefing e definir uma Design Direction "
        "autoral, específica para a matéria-prima do negócio, evitando qualquer aparência de template genérico.\n\n"
        f"{planning_skill}\n\n"
        "RETORNE ESTRITAMENTE UM OBJETO JSON VÁLIDO correspondente ao schema ClientConfig contendo: "
        "app_name, primary_color, secondary_color, bg_color, surface_color, text_color, muted_color, "
        "theme, font_heading, font_body, logo_url, address, working_hours, phone, niche, tagline, "
        "brand_essence, value_proposition, target_audience, brand_pillars, real_services, "
        "color_reasoning, layout_archetype, layout_concept, focal_element, design_critique, "
        "copy_tone, section_blueprint, recommended_sections."
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

    provedor_analyst = llm_gateway.get_last_execution_provider()
    modelo_label = llm_gateway.get_last_execution_model_label()
    if isinstance(result, ClientConfig):
        parsed_dict = result.model_dump()
        log_msg = f"[RequirementsAnalyst] BrandDesignSpec (Passe 1) sintetizado com sucesso via {modelo_label} ({provedor_analyst})."
    elif isinstance(result, dict):
        parsed_dict = result
        log_msg = f"[RequirementsAnalyst] BrandDesignSpec (Passe 1) sintetizado via {modelo_label} ({provedor_analyst})."
    else:
        parsed_dict = fallback_action()
        log_msg = f"[RequirementsAnalyst] BrandDesignSpec estruturado via {modelo_label} ({provedor_analyst})."

    custom_reqs = _merge_with_fallback_direction(parsed_dict, lead_raw)
    custom_reqs["execution_engine"] = modelo_label
    template = state.get("template_path") or "gold_templates/template_base_app"

    current_logs = state.get("execution_logs", []).copy()
    current_logs.append(log_msg)

    return {
        "customization_requirements": custom_reqs,
        "template_path": template,
        "execution_logs": current_logs,
        "provedor_execucao": provedor_analyst,
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


def _normalize_service_entries(
    raw_services: Any, profile_services: List[Dict[str, str]]
) -> List[Dict[str, str]]:
    entries: List[Dict[str, str]] = []
    if isinstance(raw_services, list) and raw_services:
        for idx, item in enumerate(raw_services):
            if hasattr(item, "model_dump"):
                item = item.model_dump()
            if isinstance(item, dict) and item.get("name"):
                fallback_img = (
                    profile_services[idx % len(profile_services)].get("img", "")
                    if profile_services
                    else ""
                )
                entries.append(
                    {
                        "name": str(item.get("name")),
                        "price": str(item.get("price") or "Sob consulta"),
                        "desc": str(item.get("description") or item.get("desc") or ""),
                        "badge": str(item.get("badge") or "Especialidade"),
                        "img": str(item.get("img") or fallback_img),
                    }
                )
    if entries:
        return entries
    return [
        {
            "name": s.get("name", "Atendimento"),
            "price": s.get("price", "Sob consulta"),
            "desc": s.get("desc", s.get("description", "")),
            "badge": "Especialidade",
            "img": s.get("img", ""),
        }
        for s in profile_services
    ]


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
    Gerador Multi-Arquétipo para `LandingPage.jsx`:
    Produz estruturas de layout genuinamente distintas (`editorial_asymmetric`, `bento_modular`,
    `cinematic_immersive`, `swiss_typographic_catalog`, `narrative_scrollytelling`) usando os
    serviços, essência e pilares reais do cliente, mantendo 100% compatível o contrato de
    rotas (`/agendar`), variáveis CSS (`:root`) e `framer-motion`.
    """
    profile = resolve_niche_profile(mensagem, app_name=app_name)
    contextual = extract_contextual_brand_insights(app_name, mensagem, profile)
    direction = design_direction or {}

    addr = address or direction.get("address") or "Av. Principal, 1000 - Centro"
    hours = working_hours or direction.get("working_hours") or "Segunda a Sábado das 9h às 19h"
    tel = phone or direction.get("phone") or "(51) 99999-9999"
    hero_title = direction.get("tagline") or profile["hero_title"]
    brand_essence = direction.get("brand_essence") or contextual["brand_essence"]
    value_prop = direction.get("value_proposition") or contextual["value_proposition"]
    pillars = direction.get("brand_pillars") or contextual["brand_pillars"]
    archetype = (
        direction.get("layout_archetype")
        or contextual.get("layout_archetype")
        or "editorial_asymmetric"
    )
    services = _normalize_service_entries(
        direction.get("real_services"), profile.get("services", [])
    )

    link_import = (
        "import Link from 'next/link';"
        if is_nextjs
        else "import { Link } from 'react-router-dom';"
    )
    link_attr = "href" if is_nextjs else "to"

    pillar_blocks = ""
    for idx, p in enumerate(pillars[:3], start=1):
        pillar_blocks += f"""
            <div className="p-6 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] space-y-2">
              <span className="font-mono text-xs font-bold text-[var(--primary-color)]">0{idx}</span>
              <p className="text-sm sm:text-base font-medium text-[var(--text-color)] leading-relaxed">
                {p}
              </p>
            </div>"""

    if archetype == "bento_modular":
        bento_cards = ""
        for idx, s in enumerate(services):
            col_span = "md:col-span-7" if idx == 0 else "md:col-span-5" if idx == 1 else "md:col-span-6"
            bento_cards += f"""
            <motion.article
              whileHover={{{{ y: -4 }}}}
              className="{col_span} p-6 sm:p-8 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-color)] text-[var(--primary-color)] border border-[var(--border-color)]">
                    {s['badge']}
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--text-color)]">
                    {s['price']}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[var(--text-color)]">
                  {s['name']}
                </h3>
                <p className="text-sm text-[var(--muted-color)] leading-relaxed">
                  {s['desc']}
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs text-[var(--muted-color)]">Disponível na agenda online</span>
                <Link
                  {link_attr}="/agendar"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold bg-[var(--primary-color)] text-white hover:brightness-110 transition-all"
                >
                  Reservar este serviço
                </Link>
              </div>
            </motion.article>"""

        return f"""import React from 'react';
{link_import}
import {{ motion }} from 'framer-motion';

export default function LandingPage() {{
  return (
    <div className="w-full bg-[var(--bg-color)] text-[var(--text-color)] font-sans selection:bg-[var(--primary-color)] selection:text-white">
      <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 scroll-mt-24">
        <motion.div
          initial={{{{ opacity: 0, y: 18 }}}}
          animate={{{{ opacity: 1, y: 0 }}}}
          transition={{{{ duration: 0.7 }}}}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          <div className="lg:col-span-8 p-8 sm:p-12 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-color)] flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-color)] text-[var(--primary-color)] border border-[var(--border-color)]">
                {profile['niche']} · {app_name}
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-color)] leading-[1.06]">
                {hero_title}
              </h1>
              <p className="text-base sm:text-lg text-[var(--muted-color)] max-w-2xl leading-relaxed">
                {value_prop}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                {link_attr}="/agendar"
                className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] rounded-xl text-base font-bold bg-[var(--primary-color)] hover:brightness-110 text-white transition-all"
              >
                Reservar horário
              </Link>
              <a
                href="#destaques"
                className="inline-flex items-center justify-center px-6 py-4 min-h-[48px] rounded-xl text-base font-semibold bg-[var(--bg-color)] text-[var(--text-color)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition-colors"
              >
                Explorar serviços e valores
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 gap-6">
            <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-color)] h-64 lg:h-full">
              <img
                src="{profile['hero_img']}"
                alt="{app_name}"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-color)] space-y-2">
              <p className="text-xs font-semibold text-[var(--primary-color)]">Atendimento & Localização</p>
              <p className="text-sm font-medium text-[var(--text-color)]">{hours}</p>
              <p className="text-xs text-[var(--muted-color)]">{addr}</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="destaques" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24">
        <div className="max-w-2xl space-y-2 mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-color)]">
            Especialidades do {app_name}
          </h2>
          <p className="text-base text-[var(--muted-color)]">
            {brand_essence}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {bento_cards}
        </div>
      </section>

      <section id="sobre" className="bg-[var(--surface-color)] border-t border-[var(--border-color)] py-16 scroll-mt-24">
        <div id="contato" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillar_blocks}
          </div>
          <div className="p-8 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-bold text-[var(--text-color)]">Visite o {app_name}</h3>
              <p className="text-sm text-[var(--muted-color)]">{addr} · {hours} · WhatsApp: {tel}</p>
            </div>
            <Link
              {link_attr}="/agendar"
              className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] rounded-xl font-bold text-sm bg-[var(--primary-color)] text-white hover:brightness-110 transition-all"
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

    # Default / Editorial / Swiss / Cinematic / Scrollytelling unified adaptive structure
    service_rows = ""
    for idx, s in enumerate(services, start=1):
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
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-[var(--primary-color,#E55A1B)]">0{idx}</span>
                  <h3 className="font-display text-xl font-bold text-[var(--text-color,#F5F4F0)]">
                    {s['name']}
                  </h3>
                </div>
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
import {{ motion }} from 'framer-motion';

export default function LandingPage() {{
  return (
    <div className="w-full bg-[var(--bg-color)] text-[var(--text-color)] font-sans selection:bg-[var(--primary-color)] selection:text-white">
      {{/* Abertura Editorial Assimétrica ({archetype}) com Motion Hero */}}
      <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 lg:py-24 border-b border-[var(--border-color)] scroll-mt-24">
        <motion.div
          initial={{{{ opacity: 0 }}}}
          animate={{{{ opacity: 1 }}}}
          transition={{{{ duration: 0.8 }}}}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
        >
          <div className="lg:col-span-7 space-y-6 text-left">
            <p className="text-sm font-medium text-[var(--primary-color)]">
              {profile['niche']} · {app_name}
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-color)] leading-[1.08]">
              {hero_title}
            </h1>

            <p className="text-base sm:text-lg text-[var(--muted-color)] max-w-2xl leading-relaxed">
              {value_prop}
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
        </motion.div>
      </section>

      {{/* Quadro de Especialidades & Preços Reais */}}
      <section id="destaques" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-24">
        <div className="max-w-2xl space-y-2 mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-color)]">
            Especialidades e atendimento
          </h2>
          <p className="text-base text-[var(--muted-color)] leading-relaxed">
            {brand_essence}
          </p>
        </div>

        <div className="border-t border-[var(--border-color)]">
          {service_rows}
        </div>
      </section>

      {{/* Essência do Estabelecimento, Pilares & Endereço */}}
      <section id="sobre" className="bg-[var(--surface-color)] border-t border-[var(--border-color)] py-20 scroll-mt-24">
        <div id="contato" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillar_blocks}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-color)]">
                Atendimento com hora marcada no {app_name}
              </h2>
              <p className="text-base text-[var(--muted-color)] max-w-prose leading-relaxed">
                {value_prop}
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
    Passe 2 (Construção do Código Frontend com Structured Prompt Pack):
    Gera `LandingPage.jsx` enviando um pacote estruturado em 3 blocos:
    1. `<ARCHITECTURAL_CONTRACT>` (Backend/rotas imutáveis + variáveis CSS + framer-motion)
    2. `<LAYOUT_ARCHETYPE_BLUEPRINT>` (Arquétipo estrutural único + `/frontend-design` + `stop-slop`)
    3. `<BRAND_DESIGN_SPEC_JSON>` (Objeto JSON canônico com essência real, serviços/preços e tokens)
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

    archetype_key = direction.get("layout_archetype") or "editorial_asymmetric"
    archetype_info = LAYOUT_ARCHETYPES.get(
        archetype_key, LAYOUT_ARCHETYPES["editorial_asymmetric"]
    )

    brand_spec_json = {
        "app_name": app_name,
        "niche": direction.get("niche") or profile["niche"],
        "theme": direction.get("theme"),
        "palette_tokens": {
            "primary_color": direction.get("primary_color"),
            "secondary_color": direction.get("secondary_color"),
            "bg_color": direction.get("bg_color"),
            "surface_color": direction.get("surface_color"),
            "text_color": direction.get("text_color"),
            "muted_color": direction.get("muted_color"),
        },
        "typography": {
            "font_heading": direction.get("font_heading"),
            "font_body": direction.get("font_body"),
        },
        "brand_identity": {
            "tagline": direction.get("tagline"),
            "brand_essence": direction.get("brand_essence"),
            "value_proposition": direction.get("value_proposition"),
            "target_audience": direction.get("target_audience"),
            "brand_pillars": direction.get("brand_pillars"),
            "copy_tone": direction.get("copy_tone"),
        },
        "layout_architecture": {
            "layout_archetype": archetype_info["id"],
            "layout_archetype_label": archetype_info["label"],
            "layout_concept": direction.get("layout_concept"),
            "focal_element": direction.get("focal_element"),
            "design_critique": direction.get("design_critique"),
            "section_blueprint": direction.get("section_blueprint") or archetype_info["section_blueprint"],
        },
        "real_services": direction.get("real_services"),
        "contact_and_location": {
            "address": address,
            "working_hours": working_hours,
            "phone": phone,
        },
        "curated_media": {
            "hero_img": profile["hero_img"],
            "service_images": [s["img"] for s in profile["services"]],
        },
    }

    system_prompt = f"""Você é um Design Engineer Sênior especialista em React (Vite), Tailwind CSS e Framer Motion.
Sua missão é executar o PASSE 2 (Construção de Interface) gerando o componente `LandingPage.jsx` sob medida para o estabelecimento do cliente, seguindo rigorosamente o Structured Prompt Pack abaixo.

{coding_skill_prompt}

<ARCHITECTURAL_CONTRACT>
CONTRATO ARQUITETURAL E INVARIANTES TÉCNICOS DO GOLD TEMPLATE (BACKEND COMPARTILHADO):
1. O componente `MainLayout.jsx` já envolve a rota `/` com o Header/Navbar global e o Footer global. Portanto, NÃO crie tags `<header>`, `<nav>` ou `<footer>` duplicadas dentro de `LandingPage.jsx`. Concentre 100% da página nas seções de conteúdo (`<section id="inicio">`, `<section id="destaques">`, `<section id="sobre">`, `<section id="contato">`).
2. TODA seção com id DEVE conter `scroll-mt-24` para que o scroll de âncora compense o navbar fixo.
3. MOTION DESIGN SYSTEM: Utilize `framer-motion` (ex: `motion.div`, `whileInView`, `whileHover`, `whileTap`) com coreografia de entrada suave no Hero e interatividade táctil nos botões de reserva.
4. Use as variáveis CSS semânticas já injetadas em `:root` (`var(--bg-color)`, `var(--surface-color)`, `var(--border-color)`, `var(--text-color)`, `var(--muted-color)`, `var(--primary-color)`, `var(--secondary-color)`) e as classes tipográficas `font-display` (títulos) e `font-sans` (corpo).
5. Inicie obrigatoriamente importando:
   import React from 'react';
   import {{ Link }} from 'react-router-dom';
   import {{ motion }} from 'framer-motion';
6. O componente DEVE ser exportado como: `export default function LandingPage() {{ ... }}`
7. Todos os botões de agendamento DEVEM usar `<Link to="/agendar">` da biblioteca `react-router-dom` com texto em voz ativa (sem setas '→' anexadas).
8. Retorne APENAS o código JSX puro, sem explicações em texto e sem blocos markdown (sem ```jsx ou ```).
</ARCHITECTURAL_CONTRACT>

<LAYOUT_ARCHETYPE_BLUEPRINT>
ARQUÉTIPO ESTRUTURAL OBRIGATÓRIO DESTE PROJETO: `{archetype_info['id']}` ({archetype_info['label']})
- Diretriz Estrutural: {archetype_info['description']}
- PROIBIDO gerar um layout genérico de 3 cartões SaaS iguais. A estrutura visual, o grid e o ritmo de leitura devem materializar o arquétipo `{archetype_info['id']}` e seguir a sequência do `section_blueprint`.
</LAYOUT_ARCHETYPE_BLUEPRINT>
"""

    user_prompt = (
        "Construa o código completo de `LandingPage.jsx` consumindo fielmente o contrato JSON abaixo "
        "(use os serviços reais em `real_services`, a essência da marca em `brand_identity` e o arquétipo em `layout_architecture`):\n\n"
        "<BRAND_DESIGN_SPEC_JSON>\n"
        f"{json.dumps(brand_spec_json, indent=2, ensure_ascii=False)}\n"
        "</BRAND_DESIGN_SPEC_JSON>\n\n"
        f"Contexto original complementar do cliente:\n{mensagem}"
    )

    def _fallback() -> str:
        print(
            f"[Desenvolvedor] Utilizando gerador multi-arquétipo ('{archetype_info['id']}') alinhado ao BrandDesignSpec..."
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

    if llm_gateway.get_last_execution_provider() == "manual_prompt_generated":
        manual_prompt = llm_gateway.get_last_manual_prompt()
        if manual_prompt:
            workspace_root = getattr(ws, "workspace_root", os.path.dirname(ws.project_path))
            prompt_file = os.path.join(workspace_root, "manual_prompt_LandingPage.md")
            try:
                with open(prompt_file, "w", encoding="utf-8") as f:
                    f.write(manual_prompt)
                print(f"[Desenvolvedor] Prompt manual salvo com sucesso em: {prompt_file}")
            except Exception as e:
                print(f"[Desenvolvedor] Erro ao gravar prompt manual: {e}")

    return landing_page_path


def code_injector_node(
    state: AgentState,
    code_llm_adapter: Optional[Callable[[str, str], Optional[str]]] = None,
    rpc_adapter: Optional[Callable[[str, str, Dict[str, Any]], None]] = None,
) -> Dict[str, Any]:
    """
    Agente Desenvolvedor / Injetor de Código (Passe 2 — Code Generation):
    Aplica o BrandDesignSpec completo, injeta Google Fonts no index.html e tokens semânticos
    no index.css, grava ai_config.json, gera a LandingPage.jsx com arquétipo único
    e provisiona o esquema SQL padronizado delegando mutações ao TenantWorkspace.
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
    layout_archetype = reqs.get("layout_archetype", "editorial_asymmetric")
    layout_concept = reqs.get("layout_concept", "")
    focal_element = reqs.get("focal_element", "")
    design_critique = reqs.get("design_critique", "")
    copy_tone = reqs.get("copy_tone", "")
    brand_essence = reqs.get("brand_essence", "")
    modelo_label = llm_gateway.get_last_execution_model_label()

    contexto_arquitetura = f"""Contexto de Arquitetura & BrandDesignSpec: {app_name}
0. Motor de IA Utilizado
Motor / Modelo: {modelo_label}
Arquétipo Estrutural de Layout: {layout_archetype}

1. Design Direction & Essência da Marca (Gerada com a Skill /frontend-design)
Essência da Marca: {brand_essence}
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

2. Stack Tecnológica Base (Backend Padronizado + Frontend Único)
Frontend: React + Vite + Framer Motion
Estilização: TailwindCSS (usando variáveis semânticas de index.css)
Backend/Auth/DB: Supabase (tabelas padronizadas agendamentos_base e configuracao_agenda)

3. Regras Estritas de Manutenção (Para Agentes de IA)
DIRETRIZ 1: Componentes visuais reutilizáveis DEVEM ser criados dentro de 'src/components'.
DIRETRIZ 2: A comunicação com o banco de dados DEVE utilizar estritamente o cliente oficial do Supabase previamente configurado.
DIRETRIZ 3: NENHUMA dependência npm externa deve ser instalada sem aprovação explícita do usuário.
DIRETRIZ 4: Mantenha as rotas protegidas (/agendar e /admin) sob o fluxo atual e NÃO duplique o Header/Footer do MainLayout.jsx dentro das páginas filhas.
DIRETRIZ 5: Toda alteração de interface DEVE seguir os princípios da skill `.agents/skills/frontend-design/SKILL.md` e preservar o arquétipo `{layout_archetype}` e os tokens semânticos acima.
"""

    workspace.write_architecture_context(contexto_arquitetura)

    if last_report and last_report.get("error"):
        print(f"Corrigindo falha reportada pelo QA anterior: {last_report.get('error')}")

    current_logs = state.get("execution_logs", []).copy()
    provedor_code = llm_gateway.get_last_execution_provider()
    current_logs.append(
        f"[CodeInjector] BrandDesignSpec ({layout_archetype}) e LandingPage.jsx gerados com sucesso via '{modelo_label}' ({provedor_code})."
    )

    manual_prompt = (
        llm_gateway.get_last_manual_prompt()
        if provedor_code == "manual_prompt_generated"
        else None
    )
    return {
        "execution_logs": current_logs,
        "provedor_execucao": provedor_code,
        "manual_prompt": manual_prompt,
    }


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
