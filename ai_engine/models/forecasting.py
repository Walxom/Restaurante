import json
import math
from pathlib import Path
from typing import Optional
import pandas as pd
import numpy as np

CACHE_DIR = Path(__file__).parent.parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

try:
    from prophet import Prophet
    from prophet.serialize import model_to_json, model_from_json
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False
    Prophet = None
    model_to_json = None
    model_from_json = None


def _simple_forecast(daily_series: pd.Series, periods: int = 7) -> dict:
    """Forecasting simple basado en promedios moviles y estacionalidad semanal.
    Funciona sin Prophet. Calcula tendencia + estacionalidad semanal."""
    if len(daily_series) < 7:
        avg = daily_series.mean() if len(daily_series) > 0 else 0
        predictions = [max(0, round(avg))] * periods
        return {
            "predictions": [
                {"value": v, "lower": max(0, v - 2), "upper": v + 2}
                for v in predictions
            ],
            "total_predicted": sum(predictions),
            "avg_daily": round(sum(predictions) / periods, 1),
            "method": "average"
        }

    daily_array = daily_series.values
    n = len(daily_array)

    # Tendencia lineal simple
    x = np.arange(n)
    slope, intercept = np.polyfit(x, daily_array, 1)
    trend = slope * (n + np.arange(periods)) + intercept

    # Estacionalidad semanal
    weekly_pattern = np.zeros(7)
    for i in range(7):
        week_indices = np.arange(i, n, 7)
        if len(week_indices) > 0:
            weekly_pattern[i] = np.mean(daily_array[week_indices])

    predictions = []
    for i in range(periods):
        day_of_week = (len(daily_series) + i) % 7
        seasonal = weekly_pattern[day_of_week]
        value = trend[i] * 0.4 + seasonal * 0.6
        value = max(0, round(value))
        residual = np.std(daily_array - (slope * x + intercept)) if n > 2 else 0
        predictions.append({
            "value": value,
            "lower": max(0, round(value - 1.645 * residual)),
            "upper": round(value + 1.645 * residual)
        })

    total = sum(p["value"] for p in predictions)
    return {
        "predictions": predictions,
        "total_predicted": total,
        "avg_daily": round(total / periods, 1),
        "method": "seasonal_decomposition"
    }


class DemandForecaster:
    def __init__(self):
        self.models: dict[str, dict] = {}
        self.product_names: dict[str, str] = {}
        self._loaded = False
        self._method = "prophet" if HAS_PROPHET else "simple"

    def _model_path(self, product_id: str) -> Path:
        return CACHE_DIR / f"forecast_{product_id}.json"

    def ensure_trained(self):
        if self._loaded:
            return
        cache_files = list(CACHE_DIR.glob("forecast_*.json"))
        if cache_files:
            for f in cache_files:
                product_id = f.stem.replace("forecast_", "")
                with open(f, "r") as fh:
                    data = json.load(fh)
                    self.models[product_id] = data
                    self.product_names[product_id] = data.get("product_name", product_id)
            self._loaded = True
            print(f"[Forecaster] Cargados {len(self.models)} modelos desde cache (metodo: {self._method}).")

    def train(self, products: list[dict], order_items: list[dict]):
        if not order_items:
            print("[Forecaster] Sin datos de entrenamiento. Saltando.")
            return

        df_items = pd.DataFrame(order_items)
        df_items["orderDate"] = pd.to_datetime(df_items["orderDate"], unit='ms')
        df_items["ds"] = df_items["orderDate"].dt.date
        df_items["ds"] = pd.to_datetime(df_items["ds"])

        product_map = {p["id"]: p["name"] for p in products}
        trained_count = 0

        for pid in df_items["productId"].unique():
            product_df = df_items[df_items["productId"] == pid].copy()
            daily = (
                product_df.groupby("ds")
                .agg({"quantity": "sum"})
                .reset_index()
                .sort_values("ds")
            )

            if len(daily) < 3:
                continue

            product_name = product_map.get(pid, pid)
            self.product_names[pid] = product_name

            cache_data = {
                "product_name": product_name,
                "method": self._method,
                "trained_on": str(daily["ds"].max().date()) if not daily.empty else "unknown",
                "daily_data": {
                    str(row["ds"].date()): int(row["quantity"])
                    for _, row in daily.iterrows()
                }
            }
            self.models[pid] = cache_data

            with open(self._model_path(pid), "w") as f:
                json.dump(cache_data, f, indent=2)

            trained_count += 1

        self._loaded = True
        print(f"[Forecaster] {trained_count} modelos entrenados (metodo: {self._method}).")

        if HAS_PROPHET:
            self._train_prophet_models(products, order_items)

    def _train_prophet_models(self, products: list[dict], order_items: list[dict]):
        """Entrenamiento adicional con Prophet si esta disponible."""
        df_items = pd.DataFrame(order_items)
        df_items["orderDate"] = pd.to_datetime(df_items["orderDate"], unit='ms')
        product_map = {p["id"]: p["name"] for p in products}

        for pid in [
            p for p in df_items["productId"].unique() if p in self.models
        ]:
            product_df = df_items[df_items["productId"] == pid]
            daily = (
                product_df.groupby(product_df["orderDate"].dt.date)
                .agg({"quantity": "sum"})
                .reset_index()
            )
            daily.columns = ["ds", "y"]
            daily["ds"] = pd.to_datetime(daily["ds"])
            daily = daily.sort_values("ds")

            if len(daily) < 7:
                continue

            try:
                model = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=True,
                    daily_seasonality=False,
                    seasonality_mode="multiplicative",
                    changepoint_prior_scale=0.05,
                    interval_width=0.80
                )
                model.add_seasonality(name="weekly", period=7, fourier_order=5)
                model.fit(daily)

                model_json = model_to_json(model)
                cache_data = self.models.get(pid, {})
                cache_data["prophet_model"] = model_json
                cache_data["method"] = "prophet"

                with open(self._model_path(pid), "w") as f:
                    json.dump(cache_data, f, indent=2)

                self.models[pid] = cache_data

            except Exception as e:
                print(f"[Forecaster] Prophet fallo para {pid}: {e}")

    def predict(self, product_id: str, periods: int = 7) -> Optional[dict]:
        if product_id not in self.models:
            return None

        cache_data = self.models[product_id]
        method = cache_data.get("method", "simple")
        product_name = cache_data.get("product_name", product_id)

        # Intentar con Prophet si esta disponible
        if HAS_PROPHET and "prophet_model" in cache_data:
            try:
                model = model_from_json(cache_data["prophet_model"])
                future = model.make_future_dataframe(periods=periods, include_history=False)
                forecast = model.predict(future)
                result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(periods)
                total_predicted = round(result["yhat"].sum())
                avg_daily = total_predicted / periods if periods > 0 else 0

                return {
                    "product_id": product_id,
                    "product_name": product_name,
                    "forecast_periods": periods,
                    "total_predicted": total_predicted,
                    "avg_daily": round(avg_daily, 1),
                    "method": "prophet",
                    "predictions": [
                        {
                            "date": str(row["ds"].date()),
                            "value": round(row["yhat"]),
                            "lower": round(max(0, row["yhat_lower"])),
                            "upper": round(row["yhat_upper"]),
                        }
                        for _, row in result.iterrows()
                    ],
                }
            except Exception as e:
                print(f"[Forecaster] Prophet predict fallo para {product_id}: {e}")

        # Fallback al metodo simple
        daily_data = cache_data.get("daily_data", {})
        if not daily_data:
            return None

        series = pd.Series(daily_data).sort_index()
        series.index = pd.to_datetime(series.index)
        series = series.sort_index()

        if len(series) == 0:
            return None

        result = _simple_forecast(series, periods)
        result["product_id"] = product_id
        result["product_name"] = product_name
        result["forecast_periods"] = periods
        return result

    def predict_all(self, periods: int = 7) -> list[dict]:
        results = []
        for pid in self.models:
            pred = self.predict(pid, periods)
            if pred:
                results.append(pred)
        results.sort(key=lambda x: x.get("total_predicted", 0), reverse=True)
        return results
