from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.app_settings import AppSetting
from app.models.user import User
from app.schemas.settings import SmtpSettings, SmtpSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

# Default SMTP keys with descriptions
SMTP_DEFAULTS = {
    "smtp_host": ("ssl0.ovh.net", "Server SMTP"),
    "smtp_port": ("465", "Porta SMTP"),
    "smtp_user": ("", "Utente SMTP"),
    "smtp_password": ("", "Password SMTP"),
    "smtp_from": ("", "Indirizzo mittente (es. Remiera Zonca <noreply@dominio.it>)"),
    "reminder_days_before": ("30", "Giorni prima della scadenza per inviare promemoria"),
}


def _get_setting(db: Session, key: str, default: str = "") -> str:
    s = db.get(AppSetting, key)
    return s.value if s else default


def _set_setting(db: Session, key: str, value: str, description: str | None = None):
    s = db.get(AppSetting, key)
    if s:
        s.value = value
    else:
        s = AppSetting(key=key, value=value, description=description)
        db.add(s)


def get_smtp_settings(db: Session) -> SmtpSettings:
    """Helper usato anche dallo scheduler per leggere SMTP dal DB."""
    return SmtpSettings(
        smtp_host=_get_setting(db, "smtp_host", "ssl0.ovh.net"),
        smtp_port=int(_get_setting(db, "smtp_port", "465")),
        smtp_user=_get_setting(db, "smtp_user"),
        smtp_password=_get_setting(db, "smtp_password"),
        smtp_from=_get_setting(db, "smtp_from"),
        reminder_days_before=int(_get_setting(db, "reminder_days_before", "30")),
    )


@router.get("/smtp", response_model=SmtpSettings)
def read_smtp_settings(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return get_smtp_settings(db)


@router.patch("/smtp", response_model=SmtpSettings)
def update_smtp_settings(
    body: SmtpSettingsUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    for key, val in body.model_dump(exclude_unset=True).items():
        desc = SMTP_DEFAULTS.get(key, (None, None))[1]
        _set_setting(db, key, str(val), desc)
    db.commit()
    return get_smtp_settings(db)


@router.post("/smtp/seed", status_code=201)
def seed_smtp_defaults(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Popola i valori default se non esistono ancora."""
    created = 0
    for key, (default, desc) in SMTP_DEFAULTS.items():
        if not db.get(AppSetting, key):
            db.add(AppSetting(key=key, value=default, description=desc))
            created += 1
    db.commit()
    return {"created": created}
