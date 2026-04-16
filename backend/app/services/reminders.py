"""Scheduler per promemoria scadenza certificato medico.

Gira come background task all'avvio dell'app (via asyncio).
Ogni giorno alle 08:00 (o al primo avvio) controlla i certificati in scadenza
entro N giorni (default 30, configurabile in app_settings).
"""

import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.member import Member
from app.services.email import send_email

logger = logging.getLogger(__name__)


def _get_db_smtp_settings(db: Session) -> dict:
    """Legge le impostazioni SMTP dalla tabella app_settings."""
    from app.api.settings import get_smtp_settings

    s = get_smtp_settings(db)
    return {
        "smtp_host": s.smtp_host,
        "smtp_port": s.smtp_port,
        "smtp_user": s.smtp_user,
        "smtp_password": s.smtp_password,
        "smtp_from": s.smtp_from,
    }


def _build_reminder_html(member_name: str, expiry: date) -> str:
    return f"""
    <div style="font-family: 'Lato', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a3a4a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #c8963e; margin: 0; font-family: 'Playfair Display', serif;">
                Remiera Zonca
            </h1>
            <p style="color: #6b8fa3; margin: 4px 0 0;">Scuola di Voga alla Veneta</p>
        </div>
        <div style="background: #0d2535; padding: 32px; border-radius: 0 0 12px 12px; color: #e8f4f8;">
            <h2 style="color: #c8963e; margin-top: 0;">Promemoria Certificato Medico</h2>
            <p>Ciao <strong>{member_name}</strong>,</p>
            <p>Ti ricordiamo che il tuo certificato medico sportivo scade il
            <strong style="color: #d35400;">{expiry.strftime('%d/%m/%Y')}</strong>.</p>
            <p>Per continuare a partecipare alle uscite in barca, è necessario
            rinnovare il certificato prima della scadenza.</p>
            <p>Puoi caricare il nuovo certificato direttamente nel tuo profilo
            sul gestionale della Remiera.</p>
            <hr style="border: none; border-top: 1px solid #2d7d9a44; margin: 24px 0;">
            <p style="color: #6b8fa3; font-size: 12px;">
                Scuola Padovana di Voga alla Veneta "Vittorio Zonca"<br>
                Golena del Bastione dell'Arena - Corso Garibaldi, 41 - 35131 Padova<br>
                scuolazonca@gmail.com | tel. 347 084 1787
            </p>
        </div>
    </div>
    """


async def check_and_send_reminders():
    """Controlla e invia promemoria per certificati in scadenza."""
    db = SessionLocal()
    try:
        # Legge il numero di giorni dal DB
        from app.api.settings import get_smtp_settings

        smtp_settings = get_smtp_settings(db)
        days_before = smtp_settings.reminder_days_before
        smtp_kwargs = _get_db_smtp_settings(db)

        threshold = date.today() + timedelta(days=days_before)

        # Soci attivi con certificato in scadenza entro N giorni,
        # che non hanno già ricevuto il promemoria
        members = (
            db.query(Member)
            .filter(
                Member.is_active == True,
                Member.email != None,
                Member.email != "",
                Member.medical_cert_expiry != None,
                Member.medical_cert_expiry <= threshold,
                Member.medical_cert_reminded == False,
            )
            .all()
        )

        sent = 0
        for m in members:
            html = _build_reminder_html(m.name, m.medical_cert_expiry)
            ok = await send_email(
                to=m.email,
                subject="Promemoria: certificato medico in scadenza",
                body_html=html,
                **smtp_kwargs,
            )
            if ok:
                m.medical_cert_reminded = True
                sent += 1
                logger.info("Reminder sent to %s (%s)", m.name, m.email)

        if sent:
            db.commit()
            logger.info("Medical cert reminders sent: %d/%d", sent, len(members))
        else:
            logger.info("No medical cert reminders to send")

    except Exception:
        logger.exception("Error in medical cert reminder job")
    finally:
        db.close()


WEEK_SECONDS = 7 * 24 * 3600  # 604800


async def reminder_loop():
    """Loop infinito: esegue il check una volta a settimana."""
    # Attende 30 secondi al boot per dare tempo al DB di essere pronto
    await asyncio.sleep(30)
    logger.info("Medical cert reminder scheduler started (weekly)")

    while True:
        try:
            await check_and_send_reminders()
        except Exception:
            logger.exception("Reminder loop error")

        # Aspetta 7 giorni prima del prossimo check
        await asyncio.sleep(WEEK_SECONDS)
