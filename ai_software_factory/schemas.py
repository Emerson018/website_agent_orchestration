from pydantic import BaseModel, Field

from typing import Optional

class ClientConfig(BaseModel):
    """
    Modelo de dados para a configuração customizada gerada pela IA,
    mapeando as chaves esperadas pelo frontend no arquivo ai_config.json.
    """
    app_name: str = Field(
        ...,
        description="O nome comercial customizado da aplicação (ex: Barbearia Navalha de Ouro)."
    )
    primary_color: str = Field(
        ...,
        description="A cor primária em formato hexadecimal (ex: #D4AF37)."
    )
    secondary_color: str = Field(
        ...,
        description="A cor secundária em formato hexadecimal (ex: #1A1A1A)."
    )
    logo_url: Optional[str] = Field(
        None,
        description="A URL ou caminho do logotipo especificado no LEAD (ex: imagem ou link de logo enviado pelo cliente). Se não houver, deixe nulo."
    )
    address: Optional[str] = Field(
        None,
        description="O endereço físico do estabelecimento extraído do LEAD (ex: Av. Padre Cacique, 580 - Menino Deus, Porto Alegre)."
    )
    working_hours: Optional[str] = Field(
        None,
        description="Os horários de funcionamento do estabelecimento extraídos do LEAD (ex: Terça a Sábado das 18h às 23h30)."
    )
    phone: Optional[str] = Field(
        None,
        description="O número de telefone/WhatsApp de contato do estabelecimento (ex: (51) 99999-9999)."
    )
    niche: Optional[str] = Field(
        None,
        description="O segmento de mercado/nicho do negócio (ex: Odontologia, Barbearia, Pet Shop, Estética, Gastronomia)."
    )
    tagline: Optional[str] = Field(
        None,
        description="O slogan ou frase marcante da empresa extraída ou sugerida."
    )
    color_reasoning: Optional[str] = Field(
        None,
        description="Justificativa da escolha da paleta de cores primária e secundária baseada na psicologia das cores para o nicho do cliente."
    )
    recommended_sections: Optional[list[str]] = Field(
        None,
        description="Lista de seções recomendadas para o site (ex: ['Hero', 'Serviços', 'Sobre Nós', 'Agendamento', 'Depoimentos', 'Contato'])."
    )
