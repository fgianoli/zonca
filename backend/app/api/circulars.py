"""Admin circulars (Comunicazioni ai Soci) - mass email to members."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.settings import get_smtp_settings
from app.database import get_db
from app.models.circular import Circular
from app.models.member import Member
from app.models.user import User
from app.schemas.circular import CircularCreate, CircularRead
from app.services.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/circulars", tags=["circulars"])

# ── Zonca theme colours ──────────────────────────────────────────────
WATER = "#1a3a4a"
DEEP = "#0d2535"
FOAM = "#e8f4f8"
GOLD = "#c8963e"
LAGOON = "#2d7d9a"


def _wrap_circular_html(subject: str, body_html: str) -> str:
    """Wrap the admin-authored HTML body in the Zonca-themed email template."""
    return f"""\
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:{FOAM};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{FOAM};padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- header -->
        <tr>
          <td style="background:linear-gradient(135deg,{DEEP},{WATER});padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:{GOLD};font-size:22px;letter-spacing:1px;">Remiera Zonca</h1>
            <p style="margin:6px 0 0;color:{FOAM};font-size:14px;">Comunicazione ai Soci</p>
          </td>
        </tr>
        <!-- subject bar -->
        <tr>
          <td style="background:{LAGOON};padding:14px 32px;">
            <h2 style="margin:0;color:#ffffff;font-size:17px;">{subject}</h2>
          </td>
        </tr>
        <!-- body -->
        <tr>
          <td style="padding:28px 32px;color:{DEEP};font-size:15px;line-height:1.6;">
            {body_html}
          </td>
        </tr>
        <!-- footer -->
        <tr>
          <td style="background:{FOAM};padding:16px 32px;text-align:center;font-size:12px;color:{LAGOON};">
            Remiera Zonca &mdash; Cannaregio, Venezia
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def _send_circular_emails(
    circular_id: int,
    subject: str,
    full_html: str,
    recipient_emails: list[str],
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    smtp_from: str,
) -> None:
    """Background task: send the circular to all recipients and update sent_count."""
    from app.database import SessionLocal

    sent = 0
    for email in recipient_emails:
        ok = await send_email(
            to=email,
            subject=subject,
            body_html=full_html,
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            smtp_from=smtp_from,
        )
        if ok:
            sent += 1

    # Update the circular record with actual sent count
    db = SessionLocal()
    try:
        circ = db.get(Circular, circular_id)
        if circ:
            circ.sent_count = sent
            db.commit()
    finally:
        db.close()

    logger.info("Circular %d: sent %d/%d emails", circular_id, sent, len(recipient_emails))


@router.get("/", response_model=list[CircularRead])
def list_circulars(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return (
        db.query(Circular)
        .order_by(Circular.created_at.desc())
        .all()
    )


@router.post("/", response_model=CircularRead, status_code=201)
def create_circular(
    body: CircularCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # Query target members
    q = db.query(Member).filter(Member.is_active.is_(True))
    if body.target_ruolo:
        q = q.filter(Member.ruolo == body.target_ruolo)

    members = q.all()
    recipient_emails = [m.email for m in members if m.email]

    # Create the circular record
    circular = Circular(
        subject=body.subject,
        body_html=body.body_html,
        target_ruolo=body.target_ruolo,
        sent_by=admin.id,
        sent_count=len(recipient_emails),  # optimistic; background task updates actual
        sent_at=datetime.now(timezone.utc),
    )
    db.add(circular)
    db.commit()
    db.refresh(circular)

    # Prepare themed email and schedule background sending
    full_html = _wrap_circular_html(body.subject, body.body_html)
    smtp = get_smtp_settings(db)

    background_tasks.add_task(
        _send_circular_emails,
        circular.id,
        body.subject,
        full_html,
        recipient_emails,
        smtp.smtp_host,
        smtp.smtp_port,
        smtp.smtp_user,
        smtp.smtp_password,
        smtp.smtp_from,
    )

    return circular


@router.get("/{circular_id}", response_model=CircularRead)
def get_circular(
    circular_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    circular = db.get(Circular, circular_id)
    if not circular:
        raise HTTPException(status_code=404, detail="Circolare non trovata")
    return circular
