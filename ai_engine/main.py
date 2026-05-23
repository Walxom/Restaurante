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

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from ai_engine.services.insight_service import InsightService
from ai_engine.chat_service import ChatService

insight_service = InsightService()
chat_service = ChatService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        insight_service.ensure_trained()
        print("[AI Engine] Modelos cargados exitosamente.")
    except Exception as e:
        print(f"[AI Engine] Advertencia: No se pudieron cargar modelos iniciales: {e}")
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


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ai-engine",
        "trained": insight_service._trained,
        "timestamp": time.time()
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
    uvicorn.run("ai_engine.main:app", host="0.0.0.0", port=8000, reload=True)
