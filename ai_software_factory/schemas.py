from pydantic import BaseModel, Field

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
