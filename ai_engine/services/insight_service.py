from ai_engine.services.data_service import DataService
from ai_engine.models.forecasting import DemandForecaster
from ai_engine.models.clustering import MarketBasketAnalyzer
from ai_engine.models.inventory_predictor import InventoryPredictor
from ai_engine.llm_service import LLMService
from typing import Optional


class InsightService:
    def __init__(self):
        self.forecaster = DemandForecaster()
        self.basket_analyzer = MarketBasketAnalyzer()
        self.inventory_predictor = InventoryPredictor()
        self.llm = LLMService()
        self._trained = False

    def ensure_trained(self):
        if not self._trained:
            self.forecaster.ensure_trained()
            self.basket_analyzer.ensure_trained()
            self.inventory_predictor.ensure_trained(self.forecaster)
            self._trained = True

    def train_all(self):
        products = DataService.get_products()
        order_items = DataService.get_order_items()
        transactions = DataService.get_transactions()
        ingredients = DataService.get_ingredients()
        recipes = DataService.get_recipes_with_ingredients()

        self.forecaster.train(products, order_items)
        self.basket_analyzer.train(transactions)
        self.inventory_predictor.train(ingredients, recipes, self.forecaster)
        self._trained = True

    def get_forecast_insight(self, product_id: Optional[str] = None) -> dict:
        self.ensure_trained()
        if product_id:
            forecast = self.forecaster.predict(product_id)
            if forecast is None:
                return {
                    "tipo": "forecast",
                    "forecasts": [],
                    "error": f"No hay datos suficientes para el producto {product_id}"
                }
            forecasts = [forecast]
        else:
            forecasts = self.forecaster.predict_all()
        return {
            "tipo": "forecast",
            "forecasts": forecasts
        }

    def get_inventory_insight(self) -> dict:
        self.ensure_trained()
        alerts = self.inventory_predictor.get_alerts()
        return {
            "tipo": "inventory",
            "alerts": alerts
        }

    def get_market_basket_insight(self, product_id: Optional[str] = None) -> dict:
        self.ensure_trained()
        if not self.basket_analyzer.has_rules():
            return {
                "tipo": "market_basket",
                "suggestions": [],
                "rules": [],
                "error": "No hay suficientes datos para generar reglas de asociacion."
            }
        products = DataService.get_products()
        product_map = {p["id"]: p["name"] for p in products}
        if product_id:
            suggestions = self.basket_analyzer.get_suggestions(product_id, product_map)
            return {
                "tipo": "market_basket",
                "target_product": product_id,
                "target_product_name": product_map.get(product_id, "Desconocido"),
                "suggestions": suggestions
            }
        top_rules = self.basket_analyzer.get_top_rules(10)
        enriched = []
        for r in top_rules:
            enriched.append({
                "antecedents": [product_map.get(pid, pid) for pid in r["antecedents"]],
                "consequents": [product_map.get(pid, pid) for pid in r["consequents"]],
                "support": round(r["support"], 3),
                "confidence": round(r["confidence"], 3),
                "lift": round(r["lift"], 3)
            })
        return {
            "tipo": "market_basket",
            "rules": enriched
        }

    def get_narrative_insight(self, insight_type: str, ml_data: dict) -> dict:
        return self.llm.generate_insight(ml_data)
