"""Booking email notifications for Remiera Zonca."""

import logging

from sqlalchemy.orm import Session

from app.api.settings import get_smtp_settings
from app.models.booking import Booking
from app.models.member import Member
from app.models.user import User
from app.services.email import send_email

logger = logging.getLogger(__name__)

# ── Zonca theme colours ──────────────────────────────────────────────
WATER = "#1a3a4a"
DEEP = "#0d2535"
FOAM = "#e8f4f8"
GOLD = "#c8963e"
LAGOON = "#2d7d9a"


def _zonca_email_template(title: str, body_content: str) -> str:
    """Wrap *body_content* (raw HTML) in the Zonca-themed email shell."""
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
            <p style="margin:6px 0 0;color:{FOAM};font-size:14px;">{title}</p>
          </td>
        </tr>
        <!-- body -->
        <tr>
          <td style="padding:28px 32px;color:{DEEP};font-size:15px;line-height:1.6;">
            {body_content}
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


def _booking_details_html(booking: Booking) -> str:
    """Return an HTML snippet with the booking summary table."""
    participants = ", ".join(p.name for p in booking.participants) or "&mdash;"
    boat_name = booking.boat.name if booking.boat else str(booking.boat_id)
    pope_name = booking.pope.name if booking.pope else str(booking.pope_id)
    return f"""\
<table width="100%" cellpadding="8" cellspacing="0"
       style="border:1px solid {LAGOON};border-radius:6px;border-collapse:separate;margin:12px 0;">
  <tr style="background:{FOAM};">
    <td style="font-weight:bold;color:{WATER};width:140px;">Data</td>
    <td>{booking.date.strftime('%d/%m/%Y')}</td>
  </tr>
  <tr>
    <td style="font-weight:bold;color:{WATER};">Fascia oraria</td>
    <td>{booking.slot}</td>
  </tr>
  <tr style="background:{FOAM};">
    <td style="font-weight:bold;color:{WATER};">Barca</td>
    <td>{boat_name}</td>
  </tr>
  <tr>
    <td style="font-weight:bold;color:{WATER};">Pope</td>
    <td>{pope_name}</td>
  </tr>
  <tr style="background:{FOAM};">
    <td style="font-weight:bold;color:{WATER};">Equipaggio</td>
    <td>{participants}</td>
  </tr>
</table>"""


async def _send_with_db_smtp(db: Session, to: str, subject: str, body_html: str) -> bool:
    """Send an email using SMTP settings stored in the DB."""
    smtp = get_smtp_settings(db)
    return await send_email(
        to=to,
        subject=subject,
        body_html=body_html,
        smtp_host=smtp.smtp_host,
        smtp_port=smtp.smtp_port,
        smtp_user=smtp.smtp_user,
        smtp_password=smtp.smtp_password,
        smtp_from=smtp.smtp_from,
    )


# ── Public notification helpers ──────────────────────────────────────

async def notify_booking_created(booking: Booking, db: Session) -> None:
    """Email the pope when a booking is created for their slot."""
    pope: Member | None = booking.pope
    if not pope or not pope.email:
        logger.info("notify_booking_created: pope has no email, skipping")
        return

    details = _booking_details_html(booking)
    body = _zonca_email_template(
        "Nuova prenotazione",
        f"<p>Ciao <strong>{pope.name}</strong>,</p>"
        f"<p>Ti informiamo che &egrave; stata creata una nuova prenotazione di cui sei pope:</p>"
        f"{details}"
        f"<p>Accedi al gestionale per confermare o gestire la prenotazione.</p>",
    )

    await _send_with_db_smtp(db, pope.email, "Nuova prenotazione - Remiera Zonca", body)


async def notify_booking_confirmed(booking: Booking, db: Session) -> None:
    """Email the creator and all participants when a booking is confirmed."""
    details = _booking_details_html(booking)
    subject = "Prenotazione confermata - Remiera Zonca"

    # Notify the creator (user who made the booking)
    if booking.created_by:
        creator: User | None = db.get(User, booking.created_by)
        if creator and creator.email:
            body = _zonca_email_template(
                "Prenotazione confermata",
                f"<p>Ciao,</p>"
                f"<p>La tua prenotazione &egrave; stata <span style='color:{GOLD};font-weight:bold;'>confermata</span>.</p>"
                f"{details}",
            )
            await _send_with_db_smtp(db, creator.email, subject, body)

    # Notify all participants
    for member in booking.participants:
        if member.email:
            body = _zonca_email_template(
                "Prenotazione confermata",
                f"<p>Ciao <strong>{member.name}</strong>,</p>"
                f"<p>Una prenotazione a cui partecipi &egrave; stata <span style='color:{GOLD};font-weight:bold;'>confermata</span>.</p>"
                f"{details}",
            )
            await _send_with_db_smtp(db, member.email, subject, body)


def prepare_booking_cancelled(booking: Booking, db: Session):
    """Eagerly capture all data needed for cancellation emails.

    Must be called while the booking and its relationships are still in the
    DB session (before delete + commit).  Returns an async callable that
    can be passed to ``BackgroundTasks.add_task`` and needs no ORM objects.
    """
    # Snapshot data while ORM objects are alive
    details = _booking_details_html(booking)
    smtp = get_smtp_settings(db)

    recipients: list[tuple[str, str]] = []  # (name, email)

    pope: Member | None = booking.pope
    if pope and pope.email:
        recipients.append((pope.name, pope.email))

    for member in booking.participants:
        if member.email and (not pope or member.email != pope.email):
            recipients.append((member.name, member.email))

    async def _send() -> None:
        subject = "Prenotazione cancellata - Remiera Zonca"
        for name, email in recipients:
            body = _zonca_email_template(
                "Prenotazione cancellata",
                f"<p>Ciao <strong>{name}</strong>,</p>"
                f"<p>Ti informiamo che la seguente prenotazione &egrave; stata "
                f"<span style='color:#c0392b;font-weight:bold;'>cancellata</span>.</p>"
                f"{details}",
            )
            await send_email(
                to=email,
                subject=subject,
                body_html=body,
                smtp_host=smtp.smtp_host,
                smtp_port=smtp.smtp_port,
                smtp_user=smtp.smtp_user,
                smtp_password=smtp.smtp_password,
                smtp_from=smtp.smtp_from,
            )

    return _send
