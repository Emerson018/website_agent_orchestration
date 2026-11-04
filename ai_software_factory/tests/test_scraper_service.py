import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from ai_software_factory.scraper_service import (
    fetch_with_resilient_fallback,
    extract_cardapio_and_products,
    extract_institutional_data,
    scrape_urls_deep,
)
from ai_software_factory.main import app_api


class MockResponseNode:
    def __init__(self, text, attrib=None):
        self.text = text
        self.attrib = attrib or {}

    def get_all_text(self):
        return self.text

    def css(self, selector):
        return []


class MockCardapioElement:
    def __init__(self, name, price, desc="", img=""):
        self.name = name
        self.price = price
        self.desc = desc
        self.img = img

    def get_all_text(self):
        return f"{self.name} - {self.price}\n{self.desc}"

    def css(self, selector):
        if any(tag in selector for tag in ["h2", "h3", "h4", "strong", "b", ".title", ".nome", ".name"]):
            return [MockResponseNode(self.name)]
        if any(tag in selector for tag in [".desc", ".descricao", ".description", "p", "span"]):
            return [MockResponseNode(self.desc)] if self.desc else []
        if "img" in selector and self.img:
            return [MockResponseNode("", attrib={"src": self.img})]
        return []


class MockScraplingResponse:
    def __init__(self, status=200, items=None, title="", desc="", text=""):
        self.status = status
        self.items = items or []
        self._title = title
        self._desc = desc
        self.text = text

    def markdown(self):
        return f"# {self._title}\n\n{self._desc}\n\n{self.text}"

    def get_all_text(self):
        return f"{self._title} {self._desc} {self.text}"

    def css(self, selector):
        if "title::text" in selector or 'meta[property="og:title"]' in selector:
            return [self._title] if self._title else []
        if 'meta[name="description"]' in selector or 'meta[property="og:description"]' in selector:
            return [self._desc] if self._desc else []
        if any(sel in selector for sel in [".cardapio-item", ".menu-item", ".produto"]):
            return self.items
        return []


def test_fallback_when_stealth_fails():
    """
    Verifica que se o StealthyFetcher disparar erro (falta de Chromium em produção),
    a função executa o fallback transparente para o Fetcher HTTP.
    """
    mock_http_response = MockScraplingResponse(status=200, title="Site HTTP")

    with patch("scrapling.fetchers.Fetcher.get", return_value=mock_http_response):
        # Simula erro de execução ou ausência do navegador
        try:
            with patch("scrapling.fetchers.StealthyFetcher.fetch", side_effect=RuntimeError("Executable doesn't exist at path...")):
                resp, method = fetch_with_resilient_fallback("https://test-restaurante.com")
                assert method == "http_fallback"
                assert resp.status == 200
        except (ModuleNotFoundError, ImportError):
            # Se o módulo de stealth não puder ser importado na plataforma, o próprio fallback é testado diretamente
            resp, method = fetch_with_resilient_fallback("https://test-restaurante.com")
            assert method == "http_fallback"
            assert resp.status == 200


def test_extract_cardapio_and_products():
    """
    Verifica se a extração de itens de menu/produtos funciona com itens com nome, preço e descrição.
    """
    mock_items = [
        MockCardapioElement(
            name="Pizza Calabresa Especial",
            price="R$ 49,90",
            desc="Molho de tomate artesanal, calabresa fatiada, cebola e azeitonas",
            img="https://test.com/pizza.jpg"
        ),
        MockCardapioElement(
            name="Hambúrguer Artesanal Smash",
            price="R$ 32,00",
            desc="Blend 160g com queijo cheddar inglês e maionese da casa"
        ),
    ]
    mock_resp = MockScraplingResponse(items=mock_items)
    extracted = extract_cardapio_and_products(mock_resp)

    assert len(extracted) == 2
    assert extracted[0]["nome"] == "Pizza Calabresa Especial"
    assert extracted[0]["preco"] == "R$ 49,90"
    assert "calabresa" in extracted[0]["descricao"].lower()
    assert extracted[0]["imagem_url"] == "https://test.com/pizza.jpg"
    assert extracted[1]["nome"] == "Hambúrguer Artesanal Smash"
    assert extracted[1]["preco"] == "R$ 32,00"


def test_extract_institutional_data():
    """
    Verifica a extração de título, descrição, e-mails, telefones e endereços.
    """
    raw_md = (
        "Contato: contato@pizzaria.com ou suporte@pizzaria.com. "
        "Fale conosco no WhatsApp (11) 98765-4321. "
        "Venha nos visitar na Rua das Flores, 123 - Centro."
    )
    mock_resp = MockScraplingResponse(
        title="Pizzaria Bella Napoli",
        desc="A melhor pizza da região central desde 1980.",
        text=raw_md
    )
    inst = extract_institutional_data(mock_resp, raw_md)

    assert inst["titulo"] == "Pizzaria Bella Napoli"
    assert "melhor pizza" in inst["descricao"]
    assert "contato@pizzaria.com" in inst["contato"]["emails"]
    assert any("98765-4321" in tel for tel in inst["contato"]["telefones"])
    assert any("Rua das Flores" in addr for addr in inst["contato"]["enderecos"])


def test_api_scrape_deep_endpoint():
    """
    Testa o endpoint FastAPI /api/scrape/deep com payload JSON.
    """
    client = TestClient(app_api)

    mock_resp = MockScraplingResponse(
        title="Restaurante Teste",
        desc="Especializado em massas frescas.",
        items=[MockCardapioElement("Lasanha Bolonhesa", "R$ 45,00", "Massa fresca")]
    )

    with patch("ai_software_factory.scraper_service.fetch_with_resilient_fallback", return_value=(mock_resp, "stealth_browser")):
        response = client.post("/api/scrape/deep", json={"urls": ["https://exemplo-restaurante.com.br"]})
        assert response.status_code == 200
        data = response.json()
        assert data["sucesso"] is True
        assert data["metodo_utilizado"] == "stealth_browser"
        assert len(data["cardapio"]) == 1
        assert data["cardapio"][0]["nome"] == "Lasanha Bolonhesa"
        assert "Lasanha Bolonhesa" in data["markdown_resumo"]


if __name__ == "__main__":
    test_fallback_when_stealth_fails()
    print("✓ test_fallback_when_stealth_fails passou!")
    test_extract_cardapio_and_products()
    print("✓ test_extract_cardapio_and_products passou!")
    test_extract_institutional_data()
    print("✓ test_extract_institutional_data passou!")
    test_api_scrape_deep_endpoint()
    print("✓ test_api_scrape_deep_endpoint passou!")
    print("TODOS OS TESTES DO SCRAPER PASSARAM COM SUCESSO!")
