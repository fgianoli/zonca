import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    body_html: str,
    *,
    smtp_host: str | None = None,
    smtp_port: int | None = None,
    smtp_user: str | None = None,
    smtp_password: str | None = None,
    smtp_from: str | None = None,
) -> bool:
    """Invia una email.

    Se i parametri SMTP sono passati esplicitamente (dallo scheduler che li legge
    dalla tabella app_settings) li usa, altrimenti fallback al .env.
    """
    settings = get_settings()
    host = smtp_host or settings.smtp_host
    port = smtp_port or settings.smtp_port
    user = smtp_user or settings.smtp_user
    password = smtp_password or settings.smtp_password
    sender = smtp_from or settings.smtp_from or user

    if not user:
        logger.warning("SMTP not configured, skipping email to %s", to)
        return False

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body_html, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user,
            password=password,
            use_tls=True,
        )
        logger.info("Email sent to %s", to)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False
