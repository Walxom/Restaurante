# ==============================================================================
# Dockerfile: SIGER-IA - Motor de Inteligencia Artificial (FastAPI)
# ==============================================================================
FROM python:3.10-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Dependencias del sistema mínimas para dependencias científicas y healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY ai_engine/requirements.txt ./ai_engine/requirements.txt
RUN pip install --no-cache-dir -r ./ai_engine/requirements.txt

# Copiar código fuente del microservicio de IA
COPY ai_engine/ ./ai_engine/

# Usuario sin privilegios (CIS Docker Benchmark). UID 1000 = mismo usuario "node" del
# contenedor web: así el motor puede crear el archivo -shm del modo WAL en el volumen compartido.
RUN useradd -u 1000 -m appuser && \
    mkdir -p /app/ai_engine/cache && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["uvicorn", "ai_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
