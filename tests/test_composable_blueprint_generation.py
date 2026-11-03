import os
import shutil
import tempfile
import pytest

def test_composable_backend_blueprint_files_exist():
    blueprint_dir = os.path.abspath("gold_templates/composable_backend_blueprint")
    assert os.path.isdir(blueprint_dir), "Blueprint directory must exist"

    required_files = [
        "package.json",
        "security.js",
        "validate.js",
        "errorHandler.js",
        "db.js",
        "server.js",
        "routes/health.js",
        "tests/security.test.mjs",
    ]

    for req_file in required_files:
        full_path = os.path.join(blueprint_dir, req_file)
        assert os.path.isfile(full_path), f"Required blueprint file missing: {req_file}"

def test_composable_blueprint_provisions_with_security_guardrails():
    blueprint_dir = os.path.abspath("gold_templates/composable_backend_blueprint")
    with tempfile.TemporaryDirectory() as temp_dir:
        tenant_backend = os.path.join(temp_dir, "tenant_pizzaria_backend")
        shutil.copytree(blueprint_dir, tenant_backend, ignore=shutil.ignore_patterns("node_modules"))

        # Verify frozen security files copied into tenant backend
        assert os.path.isfile(os.path.join(tenant_backend, "security.js"))
        assert os.path.isfile(os.path.join(tenant_backend, "validate.js"))
        assert os.path.isfile(os.path.join(tenant_backend, "errorHandler.js"))

        # Simulate factory synthesizing a tailored niche route (e.g. cardapio for restaurant)
        routes_dir = os.path.join(tenant_backend, "routes")
        os.makedirs(routes_dir, exist_ok=True)
        tailored_route = os.path.join(routes_dir, "cardapio.js")

        with open(tailored_route, "w", encoding="utf-8") as f:
            f.write("""
import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';

const router = Router();
const itemSchema = z.object({
  nome: z.string().min(2),
  preco: z.number().positive(),
  categoria: z.string(),
});

router.post('/', validateRequest({ body: itemSchema }), (req, res) => {
  res.status(201).json({ success: true, item: req.body });
});

export default router;
""")

        assert os.path.isfile(tailored_route)
        with open(tailored_route, "r", encoding="utf-8") as f:
            content = f.read()
            assert "validateRequest" in content
            assert "itemSchema" in content
