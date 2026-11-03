import os
import shutil
import pytest
from ai_software_factory.niche_backend_synthesizer import (
    normalize_niche_family,
    synthesize_niche_backend,
)
from ai_software_factory.workspace_provisioner import provision_modular_tenant_stack

TEST_WORKSPACE_DIR = os.path.join(".scratch", "test_niche_workspace")

@pytest.fixture(autouse=True)
def cleanup():
    if os.path.exists(TEST_WORKSPACE_DIR):
        shutil.rmtree(TEST_WORKSPACE_DIR, ignore_errors=True)
    yield
    if os.path.exists(TEST_WORKSPACE_DIR):
        shutil.rmtree(TEST_WORKSPACE_DIR, ignore_errors=True)


def test_normalize_niche_family():
    # Gastronomia
    assert normalize_niche_family("restaurant") == "gastronomia"
    assert normalize_niche_family("pizzaria_forno_a_lenha") == "gastronomia"
    assert normalize_niche_family("cafe") == "gastronomia"
    assert normalize_niche_family("bakery") == "gastronomia"
    assert normalize_niche_family("bar") == "gastronomia"

    # Varejo
    assert normalize_niche_family("clothing_store") == "varejo"
    assert normalize_niche_family("pet_shop") == "varejo"
    assert normalize_niche_family("loja_calcados") == "varejo"
    assert normalize_niche_family("mercado") == "varejo"

    # Serviços (default)
    assert normalize_niche_family("barbershop") == "servicos"
    assert normalize_niche_family("beauty_salon") == "servicos"
    assert normalize_niche_family("dentist") == "servicos"
    assert normalize_niche_family(None) == "servicos"
    assert normalize_niche_family("") == "servicos"


def test_synthesize_gastronomia_backend():
    project_path = os.path.join(TEST_WORKSPACE_DIR, "pizzaria_artesanal")
    res = synthesize_niche_backend(project_path, niche="restaurant", company_name="Pizzaria Bella")

    assert res["success"] is True
    assert res["niche_family"] == "gastronomia"
    assert "cardapio" in res["routes_mounted"]
    assert "pedidos" in res["routes_mounted"]

    cardapio_file = os.path.join(project_path, "backend", "routes", "cardapio.js")
    pedidos_file = os.path.join(project_path, "backend", "routes", "pedidos.js")
    schema_file = os.path.join(project_path, "database", "001_gastronomia_schema.sql")

    assert os.path.isfile(cardapio_file)
    assert os.path.isfile(pedidos_file)
    assert os.path.isfile(schema_file)

    with open(cardapio_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "validateRequest" in content
        assert "itemSchema" in content

    with open(pedidos_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "validateRequest" in content
        assert "pedidoSchema" in content


def test_synthesize_varejo_backend():
    project_path = os.path.join(TEST_WORKSPACE_DIR, "loja_moda")
    res = synthesize_niche_backend(project_path, niche="clothing_store", company_name="Moda Viva")

    assert res["success"] is True
    assert res["niche_family"] == "varejo"
    assert "produtos" in res["routes_mounted"]
    assert "carrinho" in res["routes_mounted"]

    produtos_file = os.path.join(project_path, "backend", "routes", "produtos.js")
    carrinho_file = os.path.join(project_path, "backend", "routes", "carrinho.js")
    schema_file = os.path.join(project_path, "database", "001_varejo_schema.sql")

    assert os.path.isfile(produtos_file)
    assert os.path.isfile(carrinho_file)
    assert os.path.isfile(schema_file)

    with open(carrinho_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "validateRequest" in content
        assert "checkoutSchema" in content


def test_synthesize_servicos_backend():
    project_path = os.path.join(TEST_WORKSPACE_DIR, "clinica_estetica")
    res = synthesize_niche_backend(project_path, niche="beauty_salon", company_name="Clínica Bella")

    assert res["success"] is True
    assert res["niche_family"] == "servicos"
    assert "servicos" in res["routes_mounted"]
    assert "agendamentos" in res["routes_mounted"]

    servicos_file = os.path.join(project_path, "backend", "routes", "servicos.js")
    agendamentos_file = os.path.join(project_path, "backend", "routes", "agendamentos.js")
    schema_file = os.path.join(project_path, "database", "001_servicos_schema.sql")

    assert os.path.isfile(servicos_file)
    assert os.path.isfile(agendamentos_file)
    assert os.path.isfile(schema_file)

    with open(agendamentos_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "validateRequest" in content
        assert "agendamentoSchema" in content


def test_provision_modular_tenant_stack_with_niche():
    import json
    target = provision_modular_tenant_stack(
        app_name="Hamburgueria Alpha",
        workspace_root=TEST_WORKSPACE_DIR,
        niche="hamburgueria_artesanal",
    )

    cardapio_route = os.path.join(target, "backend", "routes", "cardapio.js")
    pedidos_route = os.path.join(target, "backend", "routes", "pedidos.js")
    assert os.path.isfile(cardapio_route)
    assert os.path.isfile(pedidos_route)

    cfg_file = os.path.join(target, "frontend", "ai_config.json")
    assert os.path.isfile(cfg_file)
    with open(cfg_file, "r", encoding="utf-8") as f:
        cfg = json.load(f)
        assert cfg.get("nicho_detectado") == "gastronomia"
        assert cfg.get("modules") == ["cardapio", "pedidos"]
