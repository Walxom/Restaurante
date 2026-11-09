import os
import sys
import time
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

_root = Path(__file__).parent.parent.resolve()
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

for candidate in [Path(__file__).parent / ".env", Path(__file__).parent.parent / ".env"]:
    if candidate.exists():
        load_dotenv(candidate)

from ai_engine.services.insight_service import InsightService
from ai_engine.chat_service import ChatService

insight_service = InsightService()
chat_service = ChatService()
# Compartir la misma instancia de LLMService para sincronización de credenciales y rate limits
chat_service.llm = insight_service.llm


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        insight_service.ensure_trained()
        cache_vacio = (
            not insight_service.forecaster.models
            or not insight_service.basket_analyzer.rules
        )
        if cache_vacio:
            print("[AI Engine] Cache vacio, entrenando modelos automaticamente...")
            insight_service.train_all()
        print("[AI Engine] Modelos listos.")
    except Exception as e:
        print(f"[AI Engine] Advertencia al cargar modelos: {e}")
    yield


app = FastAPI(
    title="Fondo Marino - AI Analytics Engine",
    description="Microservicio de inteligencia artificial hibrida para la Cevicheria Fondo Marino.",
    version="1.0.0",
    lifespan=lifespan
)

origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
origins = [o.strip() for o in origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ForecastRequest(BaseModel):
    productId: Optional[str] = None


class MarketBasketRequest(BaseModel):
    productId: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[dict]] = None


class GeminiConfigRequest(BaseModel):
    apiKey: str
    model: Optional[str] = None


@app.get("/health")
async def health():
    llm = insight_service.llm
    is_ready = bool(llm.client and llm.api_key)
    return {
        "status": "ok",
        "service": "ai-engine",
        "trained": insight_service._trained,
        "gemini": {
            "configured": is_ready,
            "model": llm._gemini_model,
            "status": "ready" if is_ready else "missing_key",
            "circuit_open": llm.circuit_open,
        },
        "timestamp": time.time()
    }


@app.post("/api/config/gemini")
async def configure_gemini(req: GeminiConfigRequest):
    key = (req.apiKey or "").strip()
    target_model = (req.model or "").strip() or insight_service.llm._gemini_model

    if not key:
        insight_service.llm.update_api_key("")
        return {
            "status": "ok",
            "message": "Clave de Gemini removida. El motor opera en modo reglas locales.",
            "gemini": {
                "configured": False,
                "model": target_model,
                "status": "missing_key",
                "circuit_open": False,
            }
        }

    # Validación de formato seguro
    if len(key) < 20 or len(key) > 60 or any(c in key for c in ["\n", "\r", " ", "\t"]):
        raise HTTPException(
            status_code=400,
            detail="Formato de API Key no válido. Las claves de Google Gemini no contienen espacios ni saltos de línea."
        )

    # Smoke test en vivo con el SDK oficial de Google
    try:
        from google import genai
        test_client = genai.Client(api_key=key)
        resp = test_client.models.generate_content(
            model=target_model,
            contents="Hola",
            config={"max_output_tokens": 5}
        )
        if not resp:
            raise ValueError("Respuesta vacía de Google Gemini.")
    except Exception as e:
        err_msg = str(e)
        print(f"[Gemini Smoke Test Error]: {err_msg}")
        raise HTTPException(
            status_code=400,
            detail=f"Error al validar con Google AI Studio: {err_msg[:120]}"
        )

    success = insight_service.llm.update_api_key(key, target_model)
    if not success:
        raise HTTPException(status_code=500, detail="Fallo al activar cliente de Gemini en memoria.")

    return {
        "status": "ok",
        "message": "API Key de Google Gemini verificada y activada correctamente.",
        "gemini": {
            "configured": True,
            "model": target_model,
            "status": "ready",
            "circuit_open": False,
        }
    }


def _trim_ml_data(ml_data: dict, max_items: int = 5) -> dict:
    trimmed = dict(ml_data)
    if "forecasts" in trimmed and len(trimmed["forecasts"]) > max_items:
        trimmed["forecasts"] = trimmed["forecasts"][:max_items]
    if "rules" in trimmed and len(trimmed["rules"]) > max_items:
        trimmed["rules"] = trimmed["rules"][:max_items]
    return trimmed


@app.post("/api/insights/forecast")
async def forecast_insight(req: ForecastRequest):
    try:
        ml_data = insight_service.get_forecast_insight(req.productId)
        prompt_ml = _trim_ml_data(ml_data)
        narrative = insight_service.get_narrative_insight("forecast", ml_data, prompt_ml)
        return {"ml": ml_data, "narrative": narrative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/insights/inventory")
async def inventory_insight():
    try:
        ml_data = insight_service.get_inventory_insight()
        prompt_ml = _trim_ml_data(ml_data)
        narrative = insight_service.get_narrative_insight("inventory", ml_data, prompt_ml)
        return {"ml": ml_data, "narrative": narrative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/insights/market-basket")
async def market_basket_insight(req: MarketBasketRequest):
    try:
        ml_data = insight_service.get_market_basket_insight(req.productId)
        prompt_ml = _trim_ml_data(ml_data)
        narrative = insight_service.get_narrative_insight("market_basket", ml_data, prompt_ml)
        return {"ml": ml_data, "narrative": narrative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/train/all")
async def retrain_all():
    try:
        insight_service.train_all()
        return {"status": "ok", "message": "Todos los modelos re-entrenados exitosamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/train/forecast")
async def retrain_forecast():
    try:
        from ai_engine.services.data_service import DataService
        from ai_engine.models.forecasting import DemandForecaster
        products = DataService.get_products()
        order_items = DataService.get_order_items()
        forecaster = DemandForecaster()
        forecaster.train(products, order_items)
        return {"status": "ok", "message": f"Modelos de forecasting re-entrenados para {len(products)} productos."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/train/market-basket")
async def retrain_market_basket():
    try:
        from ai_engine.services.data_service import DataService
        from ai_engine.models.clustering import MarketBasketAnalyzer
        transactions = DataService.get_transactions()
        analyzer = MarketBasketAnalyzer()
        analyzer.train(transactions)
        return {"status": "ok", "message": f"Reglas de asociacion recalculadas con {len(transactions)} transacciones."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        result = chat_service.chat(req.message, req.history)
        return result
    except Exception as e:
        return {
            "role": "assistant",
            "content": f"Lo siento, ocurrio un error al procesar tu pregunta: {str(e)[:100]}",
            "timestamp": time.time(),
            "type": "error"
        }


if __name__ == "__main__":
    import uvicorn
    # Bind solo a localhost: el frontend llama al motor en http://localhost:8000
    # (mismo equipo). Exponer en 0.0.0.0 dejaba que cualquier cliente de la LAN
    # disparara /api/train/* o /api/chat sin auth (quemando cuota de Gemini).
    uvicorn.run("ai_engine.main:app", host="127.0.0.1", port=8000, reload=True)
