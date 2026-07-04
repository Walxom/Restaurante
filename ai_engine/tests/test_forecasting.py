"""Prueba de la lógica de forecasting de demanda (función pura, sin Prophet ni BD)."""
import pandas as pd
from ai_engine.models.forecasting import _simple_forecast


def test_forecast_returns_seven_day_projection():
    serie = pd.Series([5, 7, 6, 8, 4, 9, 6, 5, 7, 6, 8, 4, 9, 6])  # 14 días
    out = _simple_forecast(serie, periods=7)
    assert len(out["predictions"]) == 7
    for p in out["predictions"]:
        assert p["value"] >= 0
        assert p["lower"] <= p["value"] <= p["upper"]
    assert out["total_predicted"] == sum(p["value"] for p in out["predictions"])


def test_forecast_short_series_uses_average():
    out = _simple_forecast(pd.Series([5, 5, 5]), periods=7)  # < 7 días
    assert out["method"] == "average"
    assert len(out["predictions"]) == 7
    assert all(p["value"] >= 0 for p in out["predictions"])


def test_forecast_empty_series_is_safe():
    out = _simple_forecast(pd.Series([], dtype=float), periods=7)
    assert len(out["predictions"]) == 7
