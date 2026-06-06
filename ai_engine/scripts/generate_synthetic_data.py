"""
Generador de Datos Sinteticos para "Fondo Marino"
==================================================
Genera 90 dias de datos historicos de ventas, pedidos y facturas
para que los modelos de Machine Learning puedan entrenarse.

Uso:
    python -m ai_engine.scripts.generate_synthetic_data

Requiere:
    - Base de datos SQLite con seed de productos, ingredientes, recetas
    - Ejecutar 'pnpm db:setup' primero
"""

import sqlite3
import random
import string
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Optional

# Usar la misma conexion que el resto del sistema
import sys
_root = Path(__file__).parent.parent.parent.resolve()
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from ai_engine.database import get_database_path


def connect():
    db_path = get_database_path()
    # El generador necesita escribir, asi que no usamos modo read-only
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def exists_data(conn) -> bool:
    """Verifica si ya existen datos historicos en la BD."""
    count = conn.execute(
        "SELECT COUNT(*) as c FROM orders WHERE status IN ('COMPLETED', 'PAID')"
    ).fetchone()["c"]
    return count > 0


def get_products(conn) -> list[dict]:
    rows = conn.execute("""
        SELECT p.id, p.name, p.price, p.categoryId, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.categoryId
        WHERE p.isActive = 1
    """).fetchall()
    return [dict(r) for r in rows]


def get_ingredients(conn) -> list[dict]:
    rows = conn.execute("""
        SELECT i.id, i.name, i.unit, i.currentStock, i.minStock, i.cost
        FROM ingredients i WHERE i.isActive = 1
    """).fetchall()
    return [dict(r) for r in rows]


def get_recipes(conn) -> list[dict]:
    rows = conn.execute("""
        SELECT r.productId, ri.ingredientId, ri.quantity,
               ri.unit, i.name as ingredientName, i.unit as storeUnit
        FROM recipes r
        JOIN recipe_ingredients ri ON ri.recipeId = r.id
        JOIN ingredients i ON i.id = ri.ingredientId
        WHERE r.isActive = 1
    """).fetchall()
    return [dict(r) for r in rows]


def get_users(conn) -> list[dict]:
    rows = conn.execute(
        "SELECT id, name, username, role FROM users WHERE isActive = 1"
    ).fetchall()
    return [dict(r) for r in rows]


def get_tables(conn) -> list[dict]:
    rows = conn.execute(
        "SELECT id, number, capacity FROM tables WHERE isActive = 1"
    ).fetchall()
    return [dict(r) for r in rows]


def random_order_number(existing: set) -> str:
    while True:
        num = f"ORD-{random.randint(1000, 9999)}"
        if num not in existing:
            existing.add(num)
            return num


def random_invoice_number(existing: set, prefix="B001") -> str:
    while True:
        num = f"{prefix}-{random.randint(1, 99999):05d}"
        if num not in existing:
            existing.add(num)
            return num


def generate_dates(days: int = 90) -> list[date]:
    today = date.today()
    return [today - timedelta(days=i) for i in range(days, 0, -1)]


def daily_volume(d: date, base: int = 25) -> int:
    weekday = d.weekday()
    multiplier = 1.0
    if weekday >= 5:
        multiplier = 1.4
    if d.day in [1, 15, 28]:
        multiplier *= 1.2
    if d.weekday() == 4:
        multiplier *= 1.1
    noise = random.uniform(0.7, 1.3)
    return max(3, int(base * multiplier * noise))


def select_products_for_order(products: list[dict], count: int) -> list[dict]:
    if not products:
        return []
    count = min(count, len(products))
    weights = []
    for p in products:
        cat = p.get("category_name", "")
        if "alitas" in cat.lower() or "carne" in cat.lower() or "pollo" in cat.lower():
            weights.append(3)
        elif "bebida" in cat.lower() or "gaseosa" in cat.lower():
            weights.append(2)
        elif "agregado" in cat.lower() or "extracto" in cat.lower():
            weights.append(0.5)
        else:
            weights.append(1)
    total_w = sum(weights)
    probs = [w / total_w for w in weights]
    chosen = []
    seen_ids = set()
    for _ in range(count):
        if len(chosen) >= count:
            break
        attempts = 0
        while attempts < 20:
            idx = random.choices(range(len(products)), weights=probs, k=1)[0]
            if products[idx]["id"] not in seen_ids:
                seen_ids.add(products[idx]["id"])
                chosen.append(products[idx])
                break
            attempts += 1
    return chosen


def main():
    print("=" * 60)
    print("Generador de Datos Sinteticos - Fondo Marino")
    print("=" * 60)

    conn = connect()
    if exists_data(conn):
        print("[OK] Ya existen datos historicos. Se agregaran mas datos a los existentes.")
    else:
        print("[INFO] Generando datos desde cero...")

    products = get_products(conn)
    users = get_users(conn)
    tables = get_tables(conn)
    recipes = get_recipes(conn)

    print(f"  Productos: {len(products)}")
    print(f"  Usuarios: {len(users)}")
    print(f"  Mesas: {len(tables)}")
    print(f"  Recetas: {len(recipes)}")

    if not products:
        print("[ERROR] No hay productos en la BD. Ejecuta 'pnpm db:setup' primero.")
        return

    if not users:
        print("[ERROR] No hay usuarios en la BD.")
        return

    dates = generate_dates(90)
    order_numbers = set()
    invoice_numbers = set()
    created_orders = 0
    created_items = 0

    mesero_users = [u for u in users if u["role"] in ("MESERO", "JEFE")]
    if not mesero_users:
        mesero_users = users

    order_types_weighted = ["MESA"] * 60 + ["PARA_LLEVAR"] * 25 + ["DELIVERY"] * 15

    # Obtener estado actual de ingredientes
    for ing in get_ingredients(conn):
        pass  # Solo para referencia

    conn.execute("BEGIN TRANSACTION;")
    try:
        for d in dates:
            volume = daily_volume(d, base=random.randint(20, 35))
            dt_start = datetime.combine(d, datetime.min.time())

            for i in range(volume):
                otype = random.choice(order_types_weighted)
                user = random.choice(mesero_users)

                use_table = otype == "MESA" and random.random() < 0.7 and tables
                table_id = random.choice(tables)["id"] if use_table else None

                order_status = "COMPLETED"
                item_statuses = []
                selected = select_products_for_order(products, random.randint(1, 6))

                if not selected:
                    continue

                total = 0
                items_data = []
                for p in selected:
                    qty = random.choices([1, 2, 3, 4], weights=[40, 35, 15, 10])[0]
                    price = float(p["price"])
                    subtotal = round(price * qty, 2)
                    total += subtotal
                    items_data.append({
                        "productId": p["id"],
                        "quantity": qty,
                        "unitPrice": price,
                        "subtotal": subtotal
                    })

                total = round(total, 2)
                order_id = f"syn-{d.strftime('%Y%m%d')}-{i:03d}"
                order_number = random_order_number(order_numbers)

                # Hora del dia: almuerzo 11-15 o cena 18-22
                if random.random() < 0.6:
                    hour = random.randint(11, 15)
                else:
                    hour = random.randint(18, 22)
                minute = random.randint(0, 59)
                created_at = dt_start + timedelta(hours=hour, minutes=minute)

                customer_name = random.choice([
                    "Juan Perez", "Maria Lopez", "Carlos Ruiz", "Ana Garcia",
                    "Pedro Sanchez", "Rosa Martinez", "Luis Torres", None
                ])
                customer_dni = None
                if customer_name and random.random() < 0.3:
                    customer_dni = f"{random.randint(10000000, 99999999)}"

                conn.execute("""
                    INSERT INTO orders (id, orderNumber, type, status, totalAmount,
                        tableId, userId, customerName, customerDni,
                        notes, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    order_id, order_number, otype, order_status, total,
                    table_id, user["id"], customer_name, customer_dni,
                    None, created_at.isoformat(), created_at.isoformat()
                ))

                for idx, item in enumerate(items_data):
                    item_id = f"{order_id}-item-{idx}"
                    item_status = random.choices(
                        ["SERVED", "SERVED", "SERVED", "CANCELLED"],
                        weights=[45, 45, 5, 5]
                    )[0]
                    conn.execute("""
                        INSERT INTO order_items (id, quantity, unitPrice, subtotal,
                            notes, status, orderId, productId, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item_id, item["quantity"], item["unitPrice"], item["subtotal"],
                        None, item_status, order_id, item["productId"],
                        created_at.isoformat(), created_at.isoformat()
                    ))
                    created_items += 1

                # 50% de las ordenes completadas tienen factura
                if order_status == "COMPLETED" and random.random() < 0.5:
                    inv_type = random.choice(["BOLETA", "BOLETA", "BOLETA", "FACTURA"])
                    if inv_type == "FACTURA":
                        inv_number = random_invoice_number(invoice_numbers, "F001")
                        fact_customer = customer_name or "Cliente General"
                        fact_ruc = f"{random.randint(10000000000, 20999999999)}"
                    else:
                        inv_number = random_invoice_number(invoice_numbers, "B001")
                        fact_customer = customer_name
                        fact_ruc = None

                    igv = round(total * 0.18 / 1.18, 2)
                    subtotal_inv = round(total - igv, 2)
                    payment = random.choice(["EFECTIVO", "EFECTIVO", "YAPE", "PLIN", "TARJETA"])
                    amount_paid = total if payment != "EFECTIVO" else round(total + random.choice([0, 0.5, 1, 2, 5, 10]), 2)
                    change = round(max(0, amount_paid - total), 2)

                    invoice_id = f"inv-{d.strftime('%Y%m%d')}-{i:03d}"
                    conn.execute("""
                        INSERT INTO invoices (id, number, type, orderId,
                            customerName, customerRuc, subtotal, igv, total,
                            paymentMethod, amountPaid, change, issuedAt,
                            issuedBy, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED')
                    """, (
                        invoice_id, inv_number, inv_type, order_id,
                        fact_customer, fact_ruc, subtotal_inv, igv, total,
                        payment, amount_paid, change,
                        created_at.isoformat(), user["id"]
                    ))

                    for idx, item in enumerate(items_data):
                        inv_item_id = f"{invoice_id}-i-{idx}"
                        p = selected[idx]
                        conn.execute("""
                            INSERT INTO invoice_items (id, invoiceId, description,
                                quantity, unitPrice, total)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            inv_item_id, invoice_id,
                            p["name"], item["quantity"],
                            item["unitPrice"], item["subtotal"]
                        ))

                created_orders += 1

            if (d - dates[0]).days % 15 == 0 or d == dates[-1]:
                print(f"  Generado: {d.isoformat()} ({volume} ordenes)")

        conn.execute("COMMIT;")
        print(f"\n[EXITO] Datos sinteticos generados:")
        print(f"  Ordenes: {created_orders}")
        print(f"  Items de orden: {created_items}")
        print(f"  Periodo: {dates[0].isoformat()} a {dates[-1].isoformat()}")

    except Exception as e:
        conn.execute("ROLLBACK;")
        print(f"\n[ERROR] Fallo la generacion: {e}")
        raise
    finally:
        conn.close()

    print("=" * 60)


if __name__ == "__main__":
    main()
