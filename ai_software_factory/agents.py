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
from ai_software_factory import skill_loader
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
    """Delega para o módulo profundo de resolução de Lead Briefing & Design Direction."""
    return config.parse_lead_briefing(lead_raw)


def get_niche_media(app_name: str, mensagem: str) -> Dict[str, Any]:
    """Delega para o Niche Profile canônico em config.py."""
    return config.resolve_niche_profile(mensagem, app_name=app_name)


def invocar_lm_studio_para_codigo(prompt_sistema: str, prompt_usuario: str) -> Optional[str]:
    """Delega para o cliente HTTP do LM Studio em config.py."""
    return config.invoke_local_lm_studio_http(prompt_sistema, prompt_usuario)


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
    para planejar e criticar a Design Direction do cliente, ou recorre ao fallback determinístico.
    """
    print("\n--- [Agente: Analista de Requisitos — Passe 1: Design Direction] ---")
    lead_raw = state.get("lead_raw_json", {})
    print(f"Analisando lead_raw_json recebido: {lead_raw}")

    llm_info = config.describe_active_llm()
    llm = config.get_llm(temperature=0.2, adapter=llm_adapter)
    planning_skill = skill_loader.get_design_planning_skill_prompt()

    if llm is None:
        print("[Analista de Requisitos] AVISO: Nenhuma chave de API de LLM configurada.")
        custom_reqs = parse_fallback_requirements(lead_raw)
        log_msg = "[RequirementsAnalyst] Design Direction estruturada via Fallback seguro (chave de API ausente)."
    else:
        try:
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

            prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    (
                        "user",
                        "Dados brutos e informações completas do Lead Briefing:\n{lead_raw_json}",
                    ),
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
                custom_reqs = _merge_with_fallback_direction(parsed_json, lead_raw)
                log_msg = f"[RequirementsAnalyst] Design Direction (Passe 1) elaborada via {llm_info['label']} com skill frontend-design."
            else:
                structured_llm = llm.with_structured_output(ClientConfig)
                chain = prompt | structured_llm
                result: ClientConfig = chain.invoke(
                    {"lead_raw_json": json.dumps(lead_raw, ensure_ascii=False)}
                )
                custom_reqs = _merge_with_fallback_direction(result.model_dump(), lead_raw)
                log_msg = "[RequirementsAnalyst] Design Direction (Passe 1) elaborada via LLM com skill frontend-design."
        except Exception as e:
            print(
                f"[Analista de Requisitos] AVISO: Falha ao chamar a LLM ({str(e)}). Executando fallback local com Design Direction..."
            )
            custom_reqs = parse_fallback_requirements(lead_raw)
            log_msg = f"[RequirementsAnalyst] Design Direction estruturada via Fallback devido a exceção: {str(e)}"

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
    design_direction: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Gera uma LandingPage autoral seguindo as diretrizes da skill `frontend-design`:
    - Sem duplicar <header> ou <footer> (já providos pelo MainLayout.jsx).
    - Usa as variáveis CSS semânticas (:root --bg-color, --surface-color, --border-color, --text-color, --muted-color, --primary-color) e as fontes (.font-display / .font-sans).
    - Sem os tells proibidos pela skill (sem eyebrows ALL-CAPS em todas as seções, sem SaaS-card kit de 3 cartões idênticos, sem setas '→' anexadas aos botões).
    """
    media = get_niche_media(app_name, mensagem)
    direction = design_direction or {}

    addr = address or direction.get("address") or "Av. Principal, 1000 - Centro"
    hours = working_hours or direction.get("working_hours") or "Segunda a Sábado das 9h às 19h"
    tel = phone or direction.get("phone") or "(51) 99999-9999"
    hero_title = direction.get("tagline") or media["hero_title"]
    hero_desc = media["hero_desc"]

    link_import = (
        "import Link from 'next/link';"
        if is_nextjs
        else "import { Link } from 'react-router-dom';"
    )
    link_attr = "href" if is_nextjs else "to"

    service_rows = ""
    for s in media["services"]:
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
              {media['niche']} · {app_name}
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
                src="{media['hero_img']}"
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
):
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

    media = get_niche_media(app_name, mensagem)
    direction = _merge_with_fallback_direction(reqs, lead_raw)
    coding_skill_prompt = skill_loader.get_frontend_coding_skill_prompt(direction)

    system_prompt = f"""Você é um Design Engineer Sênior especialista em React (Vite) e Tailwind CSS.
Sua missão é executar o PASSE 2 (Construção de Interface) gerando o componente `LandingPage.jsx` sob medida para o estabelecimento do cliente, seguindo rigorosamente a skill `/frontend-design` e a Design Direction aprovada no Passe 1.

{coding_skill_prompt}

CONTRATO ARQUITETURAL E INVARIANTES TÉCNICOS DO GOLD TEMPLATE:
1. O componente `MainLayout.jsx` já envolve a rota `/` com o Header/Navbar global e o Footer global. Portanto, NÃO crie tags `<header>`, `<nav>` ou `<footer>` duplicadas dentro de `LandingPage.jsx`. Concentre 100% da página nas seções de conteúdo (`<section id="destaques">`, `<section id="sobre">`, `<section id="contato">`).
2. Use as variáveis CSS semânticas já injetadas em `:root` (`var(--bg-color)`, `var(--surface-color)`, `var(--border-color)`, `var(--text-color)`, `var(--muted-color)`, `var(--primary-color)`, `var(--secondary-color)`) e as classes tipográficas `font-display` (títulos) e `font-sans` (corpo).
3. Fotos reais curadas do setor disponíveis para uso:
   - Imagem Principal / Ambiente: '{media['hero_img']}'
   - Serviço 1: '{media['services'][0]['name']}' ({media['services'][0]['price']}) — '{media['services'][0]['img']}' — {media['services'][0]['desc']}
   - Serviço 2: '{media['services'][1]['name']}' ({media['services'][1]['price']}) — '{media['services'][1]['img']}' — {media['services'][1]['desc']}
   - Serviço 3: '{media['services'][2]['name']}' ({media['services'][2]['price']}) — '{media['services'][2]['img']}' — {media['services'][2]['desc']}
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
        f"- Nicho: '{direction.get('niche') or media['niche']}'\n"
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

    code = config.invoke_code_llm(system_prompt, user_prompt, adapter=code_llm_adapter)

    if not code or len(code) < 50 or "export default" not in code:
        print(
            "[Desenvolvedor] Utilizando gerador autoral de fallback alinhado à Design Direction e skill frontend-design..."
        )
        code = generate_fallback_landing_page_code(
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


def _build_google_fonts_url(font_heading: str, font_body: str) -> str:
    """Monta a URL da API Google Fonts CSS2 para as famílias de título e corpo."""
    families = []
    for font in [font_heading, font_body]:
        clean = (font or "").strip()
        if clean and clean not in families:
            families.append(clean)
    if not families:
        families = ["Plus Jakarta Sans", "Inter"]

    query_parts = [f"family={quote_plus(fam)}:wght@400;500;600;700;800" for fam in families]
    return f"https://fonts.googleapis.com/css2?{'&'.join(query_parts)}&display=swap"


def update_project_frontend_entrypoints(
    target_path: str, app_name: str, reqs: Optional[Dict[str, Any]] = None
):
    """
    Garante que a rota principal de App.jsx seja a LandingPage (/) e o BookingPage (/agendar),
    e injeta no index.html o <title> e as famílias tipográficas do Google Fonts da Design Direction.
    """
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

            font_heading = (reqs or {}).get("font_heading") or "Plus Jakarta Sans"
            font_body = (reqs or {}).get("font_body") or "Inter"
            fonts_url = _build_google_fonts_url(font_heading, font_body)
            font_link_tag = f'<link href="{fonts_url}" rel="stylesheet">'

            if "fonts.googleapis.com/css2" in html_content:
                html_content = re.sub(
                    r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>',
                    font_link_tag,
                    html_content,
                )
            elif "</head>" in html_content:
                html_content = html_content.replace(
                    "</head>",
                    f'  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
                    f'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                    f"  {font_link_tag}\n</head>",
                )

            html_content = html_content.replace(
                'bg-[#0E0D0C] text-[#F5F4F0]',
                'bg-[var(--bg-color,#0E0D0C)] text-[var(--text-color,#F5F4F0)]',
            )

            with open(index_html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
        except Exception as e:
            print(f"Aviso ao atualizar index.html: {e}")


def update_project_css_theme(
    target_path: str, reqs: Dict[str, Any], lead_raw: Dict[str, Any]
):
    """
    Injeta os tokens semânticos da Design Direction (:root --primary-color, --secondary-color,
    --bg-color, --surface-color, --border-color, --text-color, --muted-color, --font-display,
    --font-sans) no index.css.
    """
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
            bg_color = reqs.get("bg_color") or profile["bg_color"]
            surface_color = reqs.get("surface_color") or profile.get("surface_color", "#181614")
            border_color = reqs.get("border_color") or profile.get("border_color", "#2E2924")
            text_color = reqs.get("text_color") or profile["text_color"]
            muted_color = reqs.get("muted_color") or profile.get("muted_color", "#A8A29E")
            font_heading = reqs.get("font_heading") or profile.get("font_heading", "Plus Jakarta Sans")
            font_body = reqs.get("font_body") or profile.get("font_body", "Inter")

            root_vars = f"""@import "tailwindcss";
@config "../tailwind.config.js";

:root {{
  --primary-color: {p_color};
  --secondary-color: {s_color};
  --bg-color: {bg_color};
  --surface-color: {surface_color};
  --border-color: {border_color};
  --text-color: {text_color};
  --muted-color: {muted_color};
  --font-display: '{font_heading}', Georgia, serif;
  --font-sans: '{font_body}', system-ui, -apple-system, sans-serif;
}}

html, body, #root {{
  background-color: var(--bg-color, {bg_color});
  color: var(--text-color, {text_color});
  font-family: var(--font-sans);
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
}}

.font-display {{
  font-family: var(--font-display);
}}

.font-sans {{
  font-family: var(--font-sans);
}}

"""
            css_clean = re.sub(r'@import\s+["\'][^"\']+["\'];?', "", css)
            css_clean = re.sub(r'@config\s+["\'][^"\']+["\'];?', "", css_clean)
            css_clean = re.sub(r":root\s*\{[^}]*\}", "", css_clean)
            css_clean = re.sub(r"html,\s*body,\s*#root\s*\{[^}]*\}", "", css_clean)
            css_clean = re.sub(r"\.font-display\s*\{[^}]*\}", "", css_clean)
            css_clean = re.sub(r"\.font-sans\s*\{[^}]*\}", "", css_clean)
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
    Agente Desenvolvedor / Injetor de Código (Passe 2 — Code Generation):
    Aplica a Design Direction completa, injeta Google Fonts no index.html e tokens semânticos
    no index.css, grava ai_config.json, gera a LandingPage.jsx com a skill `/frontend-design`
    e provisiona o esquema SQL.
    """
    print("\n--- [Agente: Desenvolvedor / Injetor — Passe 2: Frontend Design] ---")
    target_path = state.get("target_project_path", "workspace/AppCustomizado")
    template_path = state.get("template_path") or "gold_templates/template_base_app"
    raw_reqs = state.get("customization_requirements", {})
    lead_raw = state.get("lead_raw_json", {})
    last_report = state.get("last_qa_report", {})

    reqs = _merge_with_fallback_direction(raw_reqs, lead_raw)
    app_name = reqs.get("app_name", "AppCustomizado")

    update_project_frontend_entrypoints(target_path, app_name, reqs=reqs)
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

    contexto_path = os.path.join(target_path, "contexto_arquitetura.md")
    with open(contexto_path, "w", encoding="utf-8") as f:
        f.write(contexto_arquitetura)

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
