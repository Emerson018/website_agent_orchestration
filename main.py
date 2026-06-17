import uvicorn
from ai_software_factory.main import app_api

if __name__ == "__main__":
    print("Iniciando a API da Fábrica de Software a partir do ponto de entrada da raiz...")
    uvicorn.run("ai_software_factory.main:app_api", host="0.0.0.0", port=8000, reload=True)
