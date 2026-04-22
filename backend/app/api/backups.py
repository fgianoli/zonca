"""Admin-only API per gestire i backup del database."""

import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.api.deps import require_admin
from app.models.user import User
from app.services.backup import BACKUP_DIR, run_backup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backups", tags=["backups"])


def _safe_backup_path(filename: str) -> Path:
    """Risolve filename nella BACKUP_DIR, rifiutando path traversal."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nome file non valido")
    path = (BACKUP_DIR / filename).resolve()
    try:
        path.relative_to(BACKUP_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Nome file non valido")
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Backup non trovato")
    return path


def _list_entries() -> list[dict]:
    if not BACKUP_DIR.exists():
        return []
    entries = []
    for p in BACKUP_DIR.glob("zonca_*.sql.gz"):
        if not p.is_file():
            continue
        st = p.stat()
        entries.append({
            "filename": p.name,
            "size": st.st_size,
            "created_at": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
        })
    entries.sort(key=lambda e: e["created_at"], reverse=True)
    return entries


@router.get("/")
def list_backups(_admin: User = Depends(require_admin)) -> list[dict]:
    """Lista i backup disponibili."""
    return _list_entries()


@router.post("/run-now")
async def run_backup_now(_admin: User = Depends(require_admin)) -> dict:
    """Esegue un backup immediato e ritorna l'entry."""
    import asyncio

    entry = await asyncio.to_thread(run_backup)
    if entry.get("status") != "ok":
        raise HTTPException(
            status_code=500,
            detail=f"Backup fallito: {entry.get('error') or entry.get('status')}",
        )
    # Integra con info file per coerenza con list
    path = BACKUP_DIR / entry["filename"]
    if path.exists():
        entry["size"] = path.stat().st_size
    return entry


@router.get("/{filename}/download")
def download_backup(
    filename: str,
    _admin: User = Depends(require_admin),
) -> FileResponse:
    """Scarica un backup."""
    path = _safe_backup_path(filename)
    return FileResponse(
        path=str(path),
        filename=filename,
        media_type="application/gzip",
    )


@router.delete("/{filename}")
def delete_backup(
    filename: str,
    _admin: User = Depends(require_admin),
) -> dict:
    """Cancella un backup."""
    path = _safe_backup_path(filename)
    try:
        path.unlink()
    except OSError as exc:
        logger.exception("Impossibile cancellare %s", filename)
        raise HTTPException(status_code=500, detail=f"Errore cancellazione: {exc}")
    return {"deleted": filename}
