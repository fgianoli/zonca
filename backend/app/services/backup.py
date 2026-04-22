"""Automatic database backup service.

Esegue `pg_dump` del database ogni notte alle 03:00 UTC e mantiene gli
ultimi 30 backup in /app/uploads/backups/.
"""

import asyncio
import gzip
import logging
import os
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)

BACKUP_DIR = Path("/app/uploads/backups")
MAX_BACKUPS = 30
BACKUP_HOUR_UTC = 3  # 03:00 UTC


def _ensure_dir() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def _cleanup_old_backups() -> int:
    """Cancella file più vecchi del 30esimo più recente. Ritorna quanti eliminati."""
    files = sorted(
        [p for p in BACKUP_DIR.glob("zonca_*.sql.gz") if p.is_file()],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    removed = 0
    for old in files[MAX_BACKUPS:]:
        try:
            old.unlink()
            removed += 1
            logger.info("Backup vecchio rimosso: %s", old.name)
        except OSError:
            logger.exception("Impossibile rimuovere backup %s", old)
    return removed


def run_backup() -> dict:
    """Esegue pg_dump e comprime il risultato con gzip.

    Returns dict {filename, size_bytes, created_at, status}.
    """
    _ensure_dir()
    settings = get_settings()

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"zonca_{ts}.sql.gz"
    final_path = BACKUP_DIR / filename
    tmp_sql_path = BACKUP_DIR / f"zonca_{ts}.sql.tmp"

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.postgres_password

    cmd = [
        "pg_dump",
        "-h", settings.postgres_host,
        "-p", str(settings.postgres_port),
        "-U", settings.postgres_user,
        "-d", settings.postgres_db,
        "--no-owner",
        "--no-privileges",
        "-f", str(tmp_sql_path),
    ]

    try:
        logger.info("Avvio pg_dump: %s", filename)
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            logger.error("pg_dump fallito: %s", result.stderr)
            if tmp_sql_path.exists():
                tmp_sql_path.unlink()
            return {
                "filename": filename,
                "size_bytes": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "error",
                "error": result.stderr.strip()[:500],
            }

        # Comprimi con gzip
        with open(tmp_sql_path, "rb") as f_in, gzip.open(final_path, "wb", compresslevel=6) as f_out:
            shutil.copyfileobj(f_in, f_out)
        tmp_sql_path.unlink()

        size = final_path.stat().st_size
        removed = _cleanup_old_backups()
        logger.info(
            "Backup completato: %s (%.2f MB), rimossi %d vecchi",
            filename, size / 1024 / 1024, removed,
        )
        return {
            "filename": filename,
            "size_bytes": size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "ok",
        }
    except subprocess.TimeoutExpired:
        logger.exception("pg_dump timeout per %s", filename)
        if tmp_sql_path.exists():
            tmp_sql_path.unlink()
        return {
            "filename": filename,
            "size_bytes": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "timeout",
        }
    except FileNotFoundError:
        logger.error("pg_dump non trovato nel PATH. Installa postgresql-client.")
        return {
            "filename": filename,
            "size_bytes": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "error",
            "error": "pg_dump non disponibile",
        }
    except Exception as exc:
        logger.exception("Errore durante il backup")
        if tmp_sql_path.exists():
            try:
                tmp_sql_path.unlink()
            except OSError:
                pass
        return {
            "filename": filename,
            "size_bytes": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "error",
            "error": str(exc)[:500],
        }


def _seconds_until_next_run() -> float:
    now = datetime.now(timezone.utc)
    target = now.replace(hour=BACKUP_HOUR_UTC, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def backup_loop() -> None:
    """Loop infinito: backup di test al boot, poi ogni notte alle 03:00 UTC."""
    # Attende 60 secondi al boot per dare tempo al DB
    await asyncio.sleep(60)
    logger.info("Backup scheduler avviato (ogni giorno alle 03:00 UTC)")

    # Backup di test al primo avvio
    try:
        entry = await asyncio.to_thread(run_backup)
        logger.info("Backup iniziale: %s", entry.get("status"))
    except Exception:
        logger.exception("Errore nel backup iniziale")

    while True:
        try:
            delay = _seconds_until_next_run()
            logger.info("Prossimo backup tra %.0f secondi", delay)
            await asyncio.sleep(delay)
            entry = await asyncio.to_thread(run_backup)
            logger.info("Backup notturno eseguito: %s", entry.get("status"))
            # Dormi 24h per evitare doppie esecuzioni nella stessa finestra
            await asyncio.sleep(24 * 3600)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Errore nel backup loop")
            await asyncio.sleep(3600)  # retry tra un'ora
