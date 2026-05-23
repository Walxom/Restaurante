import os
import json
import time
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from ai_engine.llm_service import LLMService


class ChatService:
    def __init__(self):
        self.llm = LLMService()
        self.max_history = 10

    def _build_system_context(self) -> str:
        try:
            from ai_engine.services.data_service import DataService
            products = DataService.get_products()
            ingredients = DataService.get_ingredients()
            daily_sales = DataService.get_daily_sales(7)

            total_products = len(products)
            total_ingredients = len(ingredients)
            weekly_revenue = sum(s.get("total_revenue", 0) or 0 for s in daily_sales)
            weekly_orders = sum(s.get("order_count", 0) or 0 for s in daily_sales)

            context = (
                f"Eres un asistente de inteligencia de negocios para la cevicheria peruana 'Fondo Marino'. "
                f"Tienes acceso a estos datos del restaurante en tiempo real:\n"
                f"- Productos en menu: {total_products}\n"
                f"- Insumos en inventario: {total_ingredients}\n"
                f"- Ventas ultimos 7 dias: {weekly_orders} ordenes, S/ {weekly_revenue:.2f}\n"
                f"- Hoy es: {datetime.now().strftime('%A %d de %B de %Y')}\n\n"
                f"Responde preguntas sobre el negocio de forma util, profesional y directa en espanol. "
                f"Usa datos concretos cuando sea posible. Si no sabes la respuesta, sugieres donde "
                f"encontrar la informacion en el sistema."
            )
            return context
        except Exception as e:
            return (
                "Eres un asistente de inteligencia de negocios para la cevicheria 'Fondo Marino'. "
                "Responde preguntas sobre el negocio de forma util, profesional y directa en espanol. "
                f"Nota: No se pudieron cargar datos en tiempo real ({e})."
            )

    def _get_forecast_context(self) -> str:
        try:
            from ai_engine.models.forecasting import DemandForecaster
            forecaster = DemandForecaster()
            forecaster.ensure_trained()
            forecasts = forecaster.predict_all()
            if not forecasts:
                return ""
            top5 = forecasts[:5]
            lines = ["Top 5 productos mas vendidos (proyeccion 7 dias):"]
            for f in top5:
                trend = "+" if f.get("trend", 0) >= 0 else ""
                lines.append(
                    f"- {f['product_name']}: {f['total_predicted']}uds "
                    f"({f['avg_daily']}/dia)"
                )
            return "\n".join(lines)
        except Exception:
            return "Pronosticos no disponibles."

    def _get_inventory_context(self) -> str:
        try:
            from ai_engine.models.inventory_predictor import InventoryPredictor
            predictor = InventoryPredictor()
            predictor.ensure_trained(None)
            alerts = predictor.get_alerts()
            critical = [a for a in alerts if a["status"] == "CRITICAL"]
            warning = [a for a in alerts if a["status"] == "WARNING"]
            parts = []
            if critical:
                parts.append(f"Alertas CRITICAS: {len(critical)} insumos")
                for a in critical[:3]:
                    parts.append(f"  - {a['ingredient_name']}: stock {a['current_stock']}{a['unit']}")
            if warning:
                parts.append(f"Alertas WARNING: {len(warning)} insumos")
            return "\n".join(parts) if parts else "Inventario sin novedades."
        except Exception:
            return "Alertas de inventario no disponibles."

    def chat(self, message: str, history: Optional[list[dict]] = None) -> dict:
        if not message or not message.strip():
            return {
                "role": "assistant",
                "content": "Por favor, escribe una pregunta valida.",
                "timestamp": datetime.now().isoformat()
            }

        system_context = self._build_system_context()
        forecast_context = self._get_forecast_context()
        inventory_context = self._get_inventory_context()

        system_prompt = (
            f"{system_context}\n\n"
            f"Datos de pronostico:\n{forecast_context}\n\n"
            f"Datos de inventario:\n{inventory_context}\n\n"
            f"INSTRUCCIONES:\n"
            f"- Responde en espanol, maximo 4 oraciones.\n"
            f"- Usa datos concretos siempre que puedas.\n"
            f"- Se directo y operativo (que el usuario pueda actuar).\n"
            f"- No inventes datos que no esten en el contexto.\n"
            f"- Si la pregunta es sobre algo que no sabes, di que no tienes esa informacion.\n"
        )

        messages = [{"role": "user", "parts": [system_prompt]}]
        if history:
            recent = [m for m in history if m.get("role") in ("user", "assistant")][-self.max_history:]
            for msg in recent:
                messages.append({
                    "role": msg["role"],
                    "parts": [msg.get("content", "")]
                })

        messages.append({"role": "user", "parts": [message]})

        try:
            if self.llm.client and self.llm.api_key:
                from google import genai
                client = genai.Client(api_key=self.llm.api_key)

                full_prompt = f"{system_prompt}\n\nHistorial:\n"
                if history:
                    for msg in history[-self.max_history:]:
                        full_prompt += f"{msg.get('role')}: {msg.get('content', '')}\n"
                full_prompt += f"\nPregunta del usuario: {message}\n\nRespuesta:"

                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=full_prompt,
                    config={
                        "temperature": 0.5,
                        "max_output_tokens": 300,
                        "top_p": 0.9,
                    }
                )

                if response.text:
                    return {
                        "role": "assistant",
                        "content": response.text.strip(),
                        "timestamp": datetime.now().isoformat(),
                        "type": "llm"
                    }

            raise RuntimeError("Gemini no disponible")

        except Exception as e:
            err_msg = str(e)
            print(f"[Chat] Gemini fallo: {err_msg[:100]}")

            return {
                "role": "assistant",
                "content": self._fallback_response(message),
                "timestamp": datetime.now().isoformat(),
                "type": "fallback"
            }

    def _fallback_response(self, message: str) -> str:
        msg_lower = message.lower()

        if any(p in msg_lower for p in ["vend", "venta", "factur", "ingreso", "dinero", "plat", "menu"]):
            try:
                from ai_engine.services.data_service import DataService
                ds = DataService.get_daily_sales(7)
                total = sum(s.get("total_revenue", 0) or 0 for s in ds)
                orders = sum(s.get("order_count", 0) or 0 for s in ds)
                return (
                    f"Segun los datos disponibles, en los ultimos 7 dias se registraron "
                    f"{orders} ordenes por un total de S/ {total:.2f}. "
                    f"El ticket promedio es de S/ {(total/orders):.2f} por orden. "
                    f"Para ver el detalle completo, revisa el Dashboard de Ventas."
                )
            except Exception:
                pass

        if any(p in msg_lower for p in ["inventario", "stock", "insumo", "ingrediente", "falta", "comprar"]):
            try:
                from ai_engine.services.data_service import DataService
                ingredients = DataService.get_ingredients()
                critical = [i for i in ingredients if i["currentStock"] <= i["minStock"]]
                if critical:
                    items = ", ".join(f"{i['name']} ({i['currentStock']}/{i['minStock']} {i['unit']})" for i in critical[:5])
                    return (
                        f"Hay {len(critical)} insumos con stock por debajo del minimo: {items}. "
                        f"Revisa el modulo de Inventario para gestionar las compras."
                    )
                return "Actualmente todos los insumos estan dentro de los niveles de stock adecuados."
            except Exception:
                pass

        if any(p in msg_lower for p in ["recomienda", "sugiere", "combina", "cross", "canasta", "juntos"]):
            try:
                from ai_engine.models.clustering import MarketBasketAnalyzer
                analyzer = MarketBasketAnalyzer()
                analyzer.ensure_trained()
                if analyzer.has_rules():
                    rules = analyzer.get_top_rules(3)
                    lines = ["Reglas de asociacion encontradas:"]
                    for r in rules:
                        ants = ", ".join(r["antecedents"][:2])
                        cons = ", ".join(r["consequents"][:2])
                        lines.append(f"- {ants} -> {cons} (confianza {r['confidence']*100:.0f}%)")
                    return "\n".join(lines)
                return "No hay suficientes datos de ventas para generar recomendaciones de combinaciones."
            except Exception:
                pass

        return (
            "Puedo ayudarte con informacion sobre ventas, inventario, pronosticos y recomendaciones. "
            "Prueba preguntando: 'Cuales son los platos mas vendidos?', "
            "'Que insumos estan por agotarse?', o 'Que productos se venden juntos?'."
        )
