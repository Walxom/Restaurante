"""Pruebas del acceso a datos del motor IA: lectura real y modo solo-lectura."""
import sqlite3
import pytest
from ai_engine.database import get_connection, fetch_all, fetch_one


def test_connection_reads_real_data():
    conn = get_connection()
    try:
        n = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert n > 0  # la dev.db tiene productos cargados
    finally:
        conn.close()


def test_connection_is_read_only():
    """El motor IA abre la BD en solo-lectura: una escritura debe fallar."""
    conn = get_connection()
    try:
        with pytest.raises(sqlite3.OperationalError):
            conn.execute("CREATE TABLE _ia_should_not_write (a INTEGER)")
    finally:
        conn.close()


def test_fetch_all_returns_list_of_dicts():
    rows = fetch_all("SELECT id, name FROM products LIMIT 3")
    assert isinstance(rows, list)
    assert len(rows) > 0
    assert set(["id", "name"]).issubset(rows[0].keys())


def test_fetch_one_returns_dict_or_none():
    one = fetch_one("SELECT id FROM products LIMIT 1")
    assert one is not None and "id" in one
    none = fetch_one("SELECT id FROM products WHERE id = ?", ("__inexistente__",))
    assert none is None
