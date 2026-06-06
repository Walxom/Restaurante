from ai_engine.database import fetch_all, fetch_one


class DataService:

    @staticmethod
    def get_products() -> list[dict]:
        return fetch_all("""
            SELECT p.id, p.name, p.price, p.isAvailable, p.isActive,
                   c.name as category_name, c.id as category_id
            FROM products p
            LEFT JOIN categories c ON c.id = p.categoryId
            WHERE p.isActive = 1
            ORDER BY c.name, p.name
        """)

    @staticmethod
    def get_orders_completed(days_back: int = 90) -> list[dict]:
        return fetch_all("""
            SELECT o.id, o.orderNumber, o.totalAmount, o.type, o.status,
                   o.createdAt, o.updatedAt, o.tableId, o.userId
            FROM orders o
            WHERE o.status IN ('COMPLETED', 'PAID', 'SERVED')
              AND o.createdAt >= datetime('now', ? || ' days')
            ORDER BY o.createdAt ASC
        """, (f"-{days_back}",))

    @staticmethod
    def get_order_items(days_back: int = 90) -> list[dict]:
        return fetch_all("""
            SELECT oi.id, oi.quantity, oi.unitPrice, oi.subtotal,
                   oi.productId, oi.orderId, oi.status,
                   o.createdAt as orderDate
            FROM order_items oi
            JOIN orders o ON o.id = oi.orderId
            WHERE o.status IN ('COMPLETED', 'PAID', 'SERVED')
              AND o.createdAt >= datetime('now', ? || ' days')
            ORDER BY o.createdAt ASC
        """, (f"-{days_back}",))

    @staticmethod
    def get_ingredients() -> list[dict]:
        return fetch_all("""
            SELECT i.id, i.name, i.unit, i.currentStock, i.minStock,
                   i.maxStock, i.cost, i.categoryId,
                   ic.name as category_name, ic.color as category_color
            FROM ingredients i
            LEFT JOIN ingredient_categories ic ON ic.id = i.categoryId
            WHERE i.isActive = 1
            ORDER BY i.name
        """)

    @staticmethod
    def get_recipes_with_ingredients() -> list[dict]:
        return fetch_all("""
            SELECT r.id as recipeId, r.productId, r.servings,
                   ri.ingredientId, ri.quantity as ingredientQuantity,
                   ri.unit as ingredientUnit, i.name as ingredientName,
                   i.unit as ingredientStoreUnit, i.currentStock
            FROM recipes r
            JOIN recipe_ingredients ri ON ri.recipeId = r.id
            JOIN ingredients i ON i.id = ri.ingredientId
            WHERE r.isActive = 1 AND i.isActive = 1
            ORDER BY r.productId, ri.ingredientId
        """)

    @staticmethod
    def get_transactions(days_back: int = 90) -> list[dict]:
        return fetch_all("""
            SELECT o.id as order_id, oi.productId, p.name as productName
            FROM order_items oi
            JOIN orders o ON o.id = oi.orderId
            JOIN products p ON p.id = oi.productId
            WHERE o.status IN ('COMPLETED', 'PAID', 'SERVED')
              AND o.createdAt >= datetime('now', ? || ' days')
            ORDER BY o.id
        """, (f"-{days_back}",))

    @staticmethod
    def get_daily_sales(days_back: int = 90) -> list[dict]:
        return fetch_all("""
            SELECT date(o.createdAt) as date,
                   COUNT(DISTINCT o.id) as order_count,
                   SUM(o.totalAmount) as total_revenue,
                   AVG(o.totalAmount) as avg_ticket
            FROM orders o
            WHERE o.status IN ('COMPLETED', 'PAID', 'SERVED')
              AND o.createdAt >= datetime('now', ? || ' days')
            GROUP BY date(o.createdAt)
            ORDER BY date ASC
        """, (f"-{days_back}",))

    @staticmethod
    def get_top_products(days_back: int = 30, limit: int = 5) -> list[dict]:
        return fetch_all("""
            SELECT p.name, SUM(oi.quantity) as total_sold
            FROM order_items oi
            JOIN orders o ON o.id = oi.orderId
            JOIN products p ON p.id = oi.productId
            WHERE o.status IN ('COMPLETED', 'PAID', 'SERVED')
              AND o.createdAt >= datetime('now', ? || ' days')
            GROUP BY p.id, p.name
            ORDER BY total_sold DESC
            LIMIT ?
        """, (f"-{days_back}", limit))
