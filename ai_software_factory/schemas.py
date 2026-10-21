from typing import Optional
from pydantic import BaseModel, Field


class ClientConfig(BaseModel):
    """
    Modelo de dados para a Design Direction e configuração customizada gerada pela IA (Passe 1),
    mapeando as chaves esperadas pelo frontend no arquivo ai_config.json.
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
        description="Subtítulo curto, direto e sem clichês de IA que descreve o que a casa faz na perspectiva do cliente.",
    )
    color_reasoning: Optional[str] = Field(
        None,
        description="Justificativa da paleta de 6 cores ancorada na matéria-prima e ambiente físico do estabelecimento.",
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
    recommended_sections: Optional[list[str]] = Field(
        None,
        description="Lista de seções específicas para o negócio do cliente.",
    )
