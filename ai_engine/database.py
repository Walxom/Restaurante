import sqlite3
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv


def _find_root() -> Path:
    """Busca la raiz del proyecto (donde esta prisma/)."""
    candidates = [
        Path.cwd(),
        Path(__file__).parent.parent,  # ai_engine -> raiz
        Path(__file__).parent.parent.parent,  # ai_engine/scripts -> ai_engine -> raiz
    ]
    for c in candidates:
        if (c / "prisma" / "dev.db").exists():
            return c
    return Path.cwd()


def get_database_path() -> Path:
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    root = _find_root()
    url = os.getenv("DATABASE_URL", "")

    if url:
        if url.startswith("file:"):
            clean = url.replace("file:", "", 1)
            if "?mode=ro" in clean:
                clean = clean.split("?")[0]
            path = Path(clean)
            if not path.is_absolute():
                path = root / path
            if path.exists():
                return path.resolve()

    default = root / "prisma" / "dev.db"
    if default.exists():
        return default.resolve()

    raise FileNotFoundError(
        f"Base de datos no encontrada en: {default}. "
        "Ejecuta 'pnpm db:setup' primero."
    )


def get_connection() -> sqlite3.Connection:
    db_path = get_database_path()
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_all(query: str, params: Optional[tuple] = None) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.execute(query, params or ())
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def fetch_one(query: str, params: Optional[tuple] = None) -> Optional[dict]:
    conn = get_connection()
    try:
        cursor = conn.execute(query, params or ())
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
