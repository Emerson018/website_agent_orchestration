from typing import List, Literal, Optional
from pydantic import BaseModel, Field


LayoutArchetype = Literal[
    "editorial_asymmetric",
    "bento_modular",
    "cinematic_immersive",
    "swiss_typographic_catalog",
    "narrative_scrollytelling",
]


class ServiceItem(BaseModel):
    """Serviço ou especialidade real extraída do briefing do cliente."""

    name: str = Field(..., description="Nome do serviço, corte, prato ou procedimento.")
    price: str = Field(
        "Sob consulta",
        description="Valor ou faixa de preço praticada pelo estabelecimento (ex: R$ 85, Consulte).",
    )
    description: str = Field(
        ...,
        description="Descrição autoral, objetiva e específica do serviço sem adjetivos genéricos.",
    )
    badge: Optional[str] = Field(
        None,
        description="Selo curto opcional que destaca a especificidade técnica do item.",
    )


class ClientConfig(BaseModel):
    """
    Contrato Canônico `BrandDesignSpec` / `ClientConfig` (Passe 1 — Diagnóstico de Marca & Design Direction):
    Reúne identidade de negócio, serviços reais, essência editorial, paleta de 6 tokens,
    tipografia e o arquétipo estrutural único de layout para geração de `LandingPage.jsx`.
    """

    app_name: str = Field(
        ...,
        description="O nome comercial legível da aplicação (ex: Barbearia Navalha de Ouro).",
    )
    primary_color: str = Field(
        ...,
        description="A cor de destaque principal em formato hexadecimal (ex: #D4AF37).",
    )
    secondary_color: str = Field(
        ...,
        description="A cor de suporte/contraste secundária em formato hexadecimal (ex: #1E293B).",
    )
    bg_color: Optional[str] = Field(
        None,
        description="Cor hexadecimal do plano de fundo principal da página (ex: #F8FAFC para light, #141210 para dark).",
    )
    surface_color: Optional[str] = Field(
        None,
        description="Cor hexadecimal das superfícies elevadas/painéis (ex: #FFFFFF para light, #1F1C19 para dark).",
    )
    text_color: Optional[str] = Field(
        None,
        description="Cor hexadecimal do texto principal de alta legibilidade (ex: #0F172A para light, #F5F4F0 para dark).",
    )
    muted_color: Optional[str] = Field(
        None,
        description="Cor hexadecimal para textos secundários e metadados (ex: #475569 para light, #A8A29E para dark).",
    )
    theme: Optional[str] = Field(
        None,
        description="Polaridade do tema visual: 'light' ou 'dark'.",
    )
    font_heading: Optional[str] = Field(
        None,
        description="Família tipográfica do Google Fonts para títulos/display (ex: 'Fraunces', 'Cormorant Garamond', 'Plus Jakarta Sans', 'Space Grotesk').",
    )
    font_body: Optional[str] = Field(
        None,
        description="Família tipográfica do Google Fonts para leitura de corpo (ex: 'DM Sans', 'Source Sans 3', 'Work Sans', 'Plus Jakarta Sans').",
    )
    logo_url: Optional[str] = Field(
        None,
        description="A URL ou caminho do logotipo especificado no Lead Briefing. Se não houver, deixe nulo.",
    )
    address: Optional[str] = Field(
        None,
        description="O endereço físico completo do estabelecimento extraído do Lead Briefing.",
    )
    working_hours: Optional[str] = Field(
        None,
        description="Os horários reais de funcionamento do estabelecimento extraídos do Lead Briefing.",
    )
    phone: Optional[str] = Field(
        None,
        description="O número de telefone/WhatsApp de contato do estabelecimento.",
    )
    niche: Optional[str] = Field(
        None,
        description="O segmento de mercado/nicho do negócio (ex: Odontologia, Barbearia, Pet Shop, Estética, Gastronomia).",
    )
    tagline: Optional[str] = Field(
        None,
        description="Título principal (Hero headline) autoral, direto e sem clichês de IA que expressa a proposta real da casa.",
    )
    brand_essence: Optional[str] = Field(
        None,
        description="Síntese autoral da história, matéria-prima, ritual de atendimento e personalidade real da marca extraída do briefing.",
    )
    value_proposition: Optional[str] = Field(
        None,
        description="Proposta de valor concreta e verificável do estabelecimento para o cliente final.",
    )
    target_audience: Optional[str] = Field(
        None,
        description="Perfil específico do público-alvo real atendido pelo negócio, baseado nas conversas, notas e referências.",
    )
    brand_pillars: Optional[List[str]] = Field(
        None,
        description="Lista de 3 a 4 diferenciais operacionais ou técnicos reais da marca.",
    )
    real_services: Optional[List[ServiceItem]] = Field(
        None,
        description="Lista estruturada de serviços, especialidades ou produtos reais extraídos do briefing do cliente.",
    )
    color_reasoning: Optional[str] = Field(
        None,
        description="Justificativa da paleta de 6 cores ancorada na matéria-prima e ambiente físico do estabelecimento.",
    )
    layout_archetype: Optional[str] = Field(
        None,
        description=(
            "Arquétipo estrutural único da página: 'editorial_asymmetric', 'bento_modular', "
            "'cinematic_immersive', 'swiss_typographic_catalog' ou 'narrative_scrollytelling'."
        ),
    )
    layout_concept: Optional[str] = Field(
        None,
        description="Conceito de layout e alinhamento (Passe 1 do frontend-design), descrevendo como a estrutura codifica a informação sem cair no SaaS-card kit genérico.",
    )
    focal_element: Optional[str] = Field(
        None,
        description="O único ponto de ousadia visual memorável da página ('Spend your boldness in one place').",
    )
    design_critique: Optional[str] = Field(
        None,
        description="Auto-crítica do Passe 1 explicando o que foi revisado para evitar os tells de páginas geradas por IA.",
    )
    copy_tone: Optional[str] = Field(
        None,
        description="Diretriz de escrita UX (voz ativa, verbos simples, sentence case, zero adjetivos vazios).",
    )
    section_blueprint: Optional[List[str]] = Field(
        None,
        description="Blueprint ordenado das seções exclusivas da LandingPage, descrevendo a mecânica visual de cada bloco.",
    )
    recommended_sections: Optional[List[str]] = Field(
        None,
        description="Lista de seções específicas para o negócio do cliente.",
    )
    execution_engine: Optional[str] = Field(
        None,
        description="Motor e modelo de IA que realizou a síntese (ex: 'Gemini CLI (gemini-2.5-pro)', 'Google Gemini API (gemini-3.8-flash)').",
    )


BrandDesignSpec = ClientConfig
