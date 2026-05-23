import os
import json
import re
import time
import hashlib
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)


class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.timeout = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "3.0"))
        self.failure_threshold = int(os.getenv("GEMINI_CIRCUIT_FAILURE_THRESHOLD", "5"))
        self.recovery_seconds = int(os.getenv("GEMINI_CIRCUIT_RECOVERY_SECONDS", "60"))

        self.circuit_open = False
        self.failure_count = 0
        self.last_failure_time = 0.0

        self.client = None
        self._narrative_cache: dict[str, dict] = {}
        self._last_call_time = 0.0
        self._min_call_interval = 3.0

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                print("[LLM] Google Gemini 2.0 configurado exitosamente (google.genai).")
            except Exception as e:
                print(f"[LLM] Error configurando Gemini: {e}")
        else:
            print("[LLM] Sin API key de Gemini. Usando solo fallback local.")

    def _can_retry(self) -> bool:
        if not self.circuit_open:
            return True
        elapsed = time.time() - self.last_failure_time
        return elapsed >= self.recovery_seconds

    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.circuit_open = True
            print(f"[Circuit Breaker] Circuito ABIERTO tras {self.failure_count} fallos consecutivos.")

    def _record_success(self):
        self.failure_count = 0
        self.circuit_open = False

    def _select_template(self, insight_type: str, ml_data: dict) -> str:
        if insight_type == "forecast":
            forecasts = ml_data.get("forecasts", [])
            if not forecasts:
                return "No hay datos de forecasting disponibles en este momento."
            top = forecasts[0]
            total = sum(f.get("total_predicted", 0) for f in forecasts)
            return (
                f"Proyeccion de Demanda: Se estima un total de {total} platos vendidos "
                f"en los proximos 7 dias. El plato lider es '{top.get('product_name', 'N/A')}' "
                f"con {top.get('total_predicted', 0)} unidades proyectadas "
                f"({top.get('avg_daily', 0)} diarias)."
            )

        elif insight_type == "inventory":
            ml_alerts = ml_data.get("alerts", [])
            critical = [a for a in ml_alerts if a.get("status") == "CRITICAL"]
            warning = [a for a in ml_alerts if a.get("status") == "WARNING"]

            parts = []
            if critical:
                parts.append(
                    f"ALERTA CRITICA: {len(critical)} insumo(s) requieren atencion inmediata. "
                    + "; ".join(
                        f"'{a['ingredient_name']}' (stock: {a['current_stock']} {a['unit']}, "
                        f"faltan {a['stock_gap']})"
                        for a in critical[:3]
                    )
                )
            if warning:
                parts.append(
                    f"PRECAUCION: {len(warning)} insumo(s) estan por debajo del punto de reorden. "
                    + "; ".join(f"'{a['ingredient_name']}'" for a in warning[:3])
                )
            if not parts:
                parts.append("Estado de inventario OK. Todos los insumos tienen stock suficiente.")

            return " | ".join(parts)

        elif insight_type == "market_basket":
            suggestions = ml_data.get("suggestions", [])
            rules = ml_data.get("rules", [])
            if suggestions:
                top = suggestions[0]
                second = suggestions[1] if len(suggestions) > 1 else top
                return (
                    f"Sugerencia de Venta: Los clientes que piden "
                    f"'{top.get('product_name', 'este producto')}' "
                    f"suelen anadir '{second.get('product_name', 'otro producto')}' "
                    f"con una confianza del {round(top.get('confidence', 0) * 100)}%. "
                    f"Recomienda la combinacion para aumentar el ticket promedio."
                )
            elif rules:
                top = rules[0]
                return (
                    f"Regla de Asociacion: {', '.join(top.get('antecedents', []))} "
                    f"-> {', '.join(top.get('consequents', []))} "
                    f"(Confianza: {round(top.get('confidence', 0) * 100)}%, "
                    f"Lift: {round(top.get('lift', 0), 2)})."
                )
            return "No hay suficientes datos de ventas para generar recomendaciones."

        return "Insight no disponible en este momento."

    def _rate_limit(self):
        now = time.time()
        elapsed = now - self._last_call_time
        if elapsed < self._min_call_interval:
            wait = self._min_call_interval - elapsed
            print(f"[LLM] Rate limit interno: esperando {wait:.1f}s...")
            time.sleep(wait)
        self._last_call_time = time.time()

    def _parse_retry_delay(self, error_str: str) -> int:
        try:
            m = re.search(r'retryDelay["\s:]+(\d+)', error_str)
            if m:
                return int(m.group(1))
        except Exception:
            pass
        return 35

    def _call_gemini_api(self, prompt: str) -> str:
        if not self.client:
            raise RuntimeError("Gemini no configurado (sin client)")

        try:
            from google.genai import types
        except ImportError:
            pass

        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            self._rate_limit()

            try:
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.4,
                        max_output_tokens=2048,
                        top_p=0.8,
                    ),
                )
            except NameError:
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={
                        "temperature": 0.4,
                        "max_output_tokens": 2048,
                        "top_p": 0.8,
                    }
                )
            except Exception as e:
                error_str = str(e)
                is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str

                if is_rate_limit and attempt < max_retries:
                    delay = self._parse_retry_delay(error_str)
                    print(f"[LLM] 429 Rate limit: esperando {delay}s (intento {attempt + 1}/{max_retries + 1})...")
                    time.sleep(delay)
                    last_error = e
                    continue
                elif is_rate_limit:
                    delay = self._parse_retry_delay(error_str)
                    raise RuntimeError(f"Rate limit 429 tras {max_retries} reintentos. Espera {delay}s.")
                else:
                    raise

            finish_reason = "unknown"
            text = ""
            try:
                if response.candidates:
                    c = response.candidates[0]
                    finish_reason = str(c.finish_reason) if hasattr(c, 'finish_reason') else "unknown"
                    for part in c.content.parts if hasattr(c, 'content') else []:
                        if hasattr(part, 'text') and part.text:
                            text += part.text
            except Exception:
                text = response.text if hasattr(response, 'text') else ""

            if not text:
                raise RuntimeError(f"Respuesta vacia de Gemini (finish_reason={finish_reason})")

            print(f"[LLM] Respuesta Gemini: {len(text)} chars, finish_reason={finish_reason}")
            return text

        raise RuntimeError(f"Gemini no disponible tras {max_retries} reintentos")

    def _cache_key(self, ml_data: dict) -> str:
        raw = json.dumps(ml_data, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(raw.encode()).hexdigest()

    def generate_insight(self, ml_data: dict, prompt_ml: dict = None) -> dict:
        insight_type = ml_data.get("tipo", "forecast")
        api_data = prompt_ml if prompt_ml is not None else ml_data
        ckey = self._cache_key(ml_data)
        cached = self._narrative_cache.get(ckey)
        if cached is not None:
            return cached

        if self.circuit_open and not self._can_retry():
            mensaje = self._select_template(insight_type, ml_data)
            result = {
                "type": "fallback",
                "mensaje": mensaje,
                "tipo": insight_type,
                "timestamp": datetime.now().isoformat(),
                "reason": "circuit_open"
            }
            self._narrative_cache[ckey] = result
            return result

        if self.client and self.api_key:
            try:
                template = self._select_template(insight_type, ml_data)
                system_prompt = (
                    "Eres un asistente de inteligencia de negocios para una cevicheria peruana llamada 'Fondo Marino'. "
                    "Recibes datos de ventas y debes generar un parrafo fluido, completo y bien redactado "
                    "con recomendaciones UTILES y CONCRETAS en espanol. No te cortes a medio camino: "
                    "escribe el parrafo completo aunque sean 4-6 oraciones. "
                    "Responde SOLO con la recomendacion, sin introducciones ni despedidas. "
                    "Usa emojis solo cuando sea relevante para la accion.\n\n"
                    f"Datos:\n{json.dumps(api_data, indent=2, ensure_ascii=False)}\n\n"
                    f"Contexto base:\n{template}"
                )

                response_text = self._call_gemini_api(system_prompt)
                self._record_success()
                result = {
                    "type": "llm",
                    "mensaje": response_text,
                    "tipo": insight_type,
                    "timestamp": datetime.now().isoformat()
                }
                self._narrative_cache[ckey] = result
                return result

            except Exception as e:
                error_str = str(e)
                is_rate_limit = "429" in error_str or "Rate limit" in error_str or "RESOURCE_EXHAUSTED" in error_str
                if is_rate_limit:
                    print(f"[LLM] 429 rate limit agotado, usando fallback.")
                else:
                    print(f"[LLM] Error llamando a Gemini: {e}")
                    self._record_failure()

        mensaje = self._select_template(insight_type, ml_data)
        result = {
            "type": "fallback",
            "mensaje": mensaje,
            "tipo": insight_type,
            "timestamp": datetime.now().isoformat(),
            "reason": "no_llm_available"
        }
        self._narrative_cache[ckey] = result
        return result
