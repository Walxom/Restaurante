import numpy as np
import pandas as pd
from typing import Optional
from ai_engine.services.data_service import DataService


class InventoryPredictor:
    def __init__(self):
        self.ingredients: list[dict] = []
        self.recipes: list[dict] = []
        self.alerts: list[dict] = []
        self._trained = False

    def ensure_trained(self, forecaster=None):
        if self._trained:
            return
        ingredients = DataService.get_ingredients()
        recipes = DataService.get_recipes_with_ingredients()
        if ingredients and recipes:
            self.train(ingredients, recipes, forecaster)
        else:
            print("[Inventory Predictor] Sin datos de ingredientes o recetas.")

    def train(self, ingredients: list[dict], recipes: list[dict],
              forecaster: Optional['DemandForecaster'] = None):
        self.ingredients = ingredients
        self.recipes = recipes
        self._trained = True

        if forecaster and forecaster._loaded:
            self._generate_alerts(forecaster)
        else:
            print("[Inventory Predictor] Modelos cargados. Alertas generadas sin forecast externo.")

    def _generate_alerts(self, forecaster: Optional['DemandForecaster'] = None):
        self.alerts = []

        if not forecaster or not forecaster._loaded:
            for ing in self.ingredients:
                stock_ratio = ing["currentStock"] / max(ing["minStock"], 1)
                self.alerts.append(self._make_alert(ing, stock_ratio, None))
            return

        recipe_df = pd.DataFrame(self.recipes)
        if recipe_df.empty or "ingredientId" not in recipe_df.columns:
            for ing in self.ingredients:
                stock_ratio = ing["currentStock"] / max(ing["minStock"], 1)
                self.alerts.append(self._make_alert(ing, stock_ratio, None))
            return

        for ing in self.ingredients:
            ing_id = ing["id"]
            related = recipe_df[recipe_df["ingredientId"] == ing_id]

            if related.empty:
                stock_ratio = ing["currentStock"] / max(ing["minStock"], 1)
                self.alerts.append(self._make_alert(ing, stock_ratio, None))
                continue

            total_demand = 0
            for _, row in related.iterrows():
                product_id = row["productId"]
                try:
                    forecast = forecaster.predict(product_id, periods=3)
                    if forecast:
                        daily = forecast.get("avg_daily", 0)
                        qty_per_unit = row.get("ingredientQuantity", 1)
                        total_demand += daily * qty_per_unit
                except Exception:
                    continue

            days_until_out = ing["currentStock"] / max(total_demand, 0.001)

            if total_demand > 0:
                safe_stock = 1.645 * max(ing["minStock"] * 0.2, 0.5)
                rop = (1 * total_demand) + safe_stock
                stock_gap = rop - ing["currentStock"]
            else:
                stock_ratio = ing["currentStock"] / max(ing["minStock"], 1)
                self.alerts.append(self._make_alert(ing, stock_ratio, None))
                continue

            if days_until_out <= 1:
                status = "CRITICAL"
            elif days_until_out <= 3:
                status = "WARNING"
            else:
                status = "OK"

            stock_ratio = ing["currentStock"] / max(rop, 1)

            self.alerts.append({
                "ingredient_id": ing["id"],
                "ingredient_name": ing["name"],
                "unit": ing["unit"],
                "current_stock": ing["currentStock"],
                "min_stock": ing["minStock"],
                "predicted_daily_demand": round(total_demand, 2),
                "rop": round(rop, 2),
                "stock_gap": round(max(0, stock_gap), 2),
                "days_until_stockout": round(days_until_out, 1),
                "stock_ratio": round(stock_ratio, 2),
                "status": status,
                "cost": ing.get("cost", 0),
                "category": ing.get("category_name", "")
            })

    def _make_alert(self, ing: dict, stock_ratio: float,
                    forecast_demand: Optional[float]) -> dict:
        if stock_ratio <= 0:
            status = "CRITICAL"
        elif stock_ratio <= 0.5:
            status = "WARNING"
        else:
            status = "OK"

        gap = max(0, ing["minStock"] - ing["currentStock"])

        return {
            "ingredient_id": ing["id"],
            "ingredient_name": ing["name"],
            "unit": ing["unit"],
            "current_stock": ing["currentStock"],
            "min_stock": ing["minStock"],
            "predicted_daily_demand": forecast_demand or 0,
            "rop": ing["minStock"],
            "stock_gap": gap,
            "days_until_stockout": None if ing["currentStock"] <= 0 and ing["minStock"] <= 0
                                   else round(ing["currentStock"] / max(1, forecast_demand or 1), 1),
            "stock_ratio": round(stock_ratio, 2),
            "status": status,
            "cost": ing.get("cost", 0),
            "category": ing.get("category_name", "")
        }

    def get_alerts(self) -> list[dict]:
        critical = [a for a in self.alerts if a["status"] == "CRITICAL"]
        warning = [a for a in self.alerts if a["status"] == "WARNING"]
        ok_alerts = [a for a in self.alerts if a["status"] == "OK"]
        return critical + warning + ok_alerts
