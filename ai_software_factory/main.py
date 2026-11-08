import os
import sys
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

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

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app_api = FastAPI(
    title="Fábrica de Software API",
    description="Serviço de raspagem profunda (Scrapling) usado na coleta de dados do Lead Dossier.",
)

app_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeDeepRequest(BaseModel):
    urls: list[str] = []
    timeout: Optional[int] = 15


@app_api.post("/api/scrape/deep")
async def api_scrape_deep(payload: ScrapeDeepRequest):
    """
    Endpoint para raspagem profunda com Scrapling e fallback automático.
    Extrai catálogo/cardápio de produtos, dados institucionais e markdown enriquecido.
    """
    from ai_software_factory.scraper_service import scrape_urls_deep
    try:
        resultado = scrape_urls_deep(urls=payload.urls, timeout=payload.timeout or 15)
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar raspagem profunda: {str(e)}",
        )


if __name__ == "__main__":
    uvicorn.run("main:app_api", host="0.0.0.0", port=8000, reload=True)
