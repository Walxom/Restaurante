"""Pruebas de la capa de datos que alimenta los modelos de IA."""
from ai_engine.services.data_service import DataService


def test_get_products_returns_real_catalog():
    products = DataService.get_products()
    assert isinstance(products, list)
    assert len(products) > 0
    p = products[0]
    for key in ("id", "name", "price", "category_name"):
        assert key in p


def test_get_ingredients_returns_inventory():
    ingredients = DataService.get_ingredients()
    assert isinstance(ingredients, list)
    assert len(ingredients) > 0
    ing = ingredients[0]
    for key in ("id", "name", "currentStock", "cost"):
        assert key in ing


def test_time_windowed_queries_return_lists():
    # Estructura correcta aunque la ventana no tenga datos.
    assert isinstance(DataService.get_order_items(days_back=365), list)
    assert isinstance(DataService.get_transactions(days_back=365), list)
    assert isinstance(DataService.get_daily_sales(days_back=365), list)
