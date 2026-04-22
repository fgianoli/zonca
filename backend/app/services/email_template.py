"""Email template rendering with DB-first lookup and hardcoded fallback."""

import json
import re
from typing import Tuple

from sqlalchemy.orm import Session

from app.models.email_template import EmailTemplate


DEFAULT_TEMPLATES: dict[str, dict] = {
    "medical_cert_reminder": {
        "name": "Promemoria certificato medico",
        "subject": "Promemoria: certificato medico in scadenza",
        "body_html": (
            "<p>Ciao <strong>{{ name }}</strong>,</p>"
            "<p>Ti ricordiamo che il tuo certificato medico &egrave; in scadenza il "
            "<strong>{{ expiry_date }}</strong>.</p>"
            "<p>Provvedi al rinnovo il prima possibile.</p>"
        ),
        "available_vars": json.dumps(["name", "expiry_date"]),
    },
    "booking_created": {
        "name": "Nuova prenotazione",
        "subject": "Nuova prenotazione",
        "body_html": (
            "<p>Ciao <strong>{{ pope_name }}</strong>,</p>"
            "<p>&Egrave; stata creata una nuova prenotazione:</p>"
            "<ul>"
            "<li>Barca: {{ boat_name }}</li>"
            "<li>Data: {{ date }}</li>"
            "<li>Fascia: {{ slot }}</li>"
            "<li>Equipaggio: {{ participants }}</li>"
            "</ul>"
        ),
        "available_vars": json.dumps(
            ["pope_name", "boat_name", "date", "slot", "participants"]
        ),
    },
    "booking_confirmed": {
        "name": "Prenotazione confermata",
        "subject": "Prenotazione confermata",
        "body_html": (
            "<p>Ciao,</p>"
            "<p>La prenotazione con pope <strong>{{ pope_name }}</strong> sulla barca "
            "<strong>{{ boat_name }}</strong> del {{ date }} ({{ slot }}) &egrave; stata confermata.</p>"
            "<p>Equipaggio: {{ participants }}</p>"
        ),
        "available_vars": json.dumps(
            ["pope_name", "boat_name", "date", "slot", "participants"]
        ),
    },
    "booking_cancelled": {
        "name": "Prenotazione cancellata",
        "subject": "Prenotazione cancellata",
        "body_html": (
            "<p>Ciao,</p>"
            "<p>La prenotazione del {{ date }} ({{ slot }}) sulla barca "
            "<strong>{{ boat_name }}</strong> con pope <strong>{{ pope_name }}</strong> "
            "&egrave; stata cancellata.</p>"
            "<p>Equipaggio: {{ participants }}</p>"
        ),
        "available_vars": json.dumps(
            ["pope_name", "boat_name", "date", "slot", "participants"]
        ),
    },
    "circular": {
        "name": "Circolare",
        "subject": "{{ subject }}",
        "body_html": (
            "<h2>{{ subject }}</h2>"
            "<div>{{ body }}</div>"
        ),
        "available_vars": json.dumps(["subject", "body"]),
    },
}


_VAR_RE = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def _render(template: str, vars: dict) -> str:
    def sub(m: re.Match) -> str:
        key = m.group(1)
        val = vars.get(key, "")
        return str(val) if val is not None else ""

    return _VAR_RE.sub(sub, template)


def render_template(db: Session, key: str, vars: dict) -> Tuple[str, str]:
    """Returns (rendered_subject, rendered_html).

    Tries DB first, falls back to hardcoded DEFAULT_TEMPLATES.
    """
    tmpl = db.query(EmailTemplate).filter(EmailTemplate.key == key).first()
    if tmpl:
        return _render(tmpl.subject, vars), _render(tmpl.body_html, vars)

    default = DEFAULT_TEMPLATES.get(key)
    if default:
        return _render(default["subject"], vars), _render(default["body_html"], vars)

    return "", ""


def seed_defaults(db: Session) -> int:
    """Idempotent seed of default templates. Returns count of inserted rows."""
    inserted = 0
    for key, data in DEFAULT_TEMPLATES.items():
        existing = db.query(EmailTemplate).filter(EmailTemplate.key == key).first()
        if existing:
            continue
        db.add(
            EmailTemplate(
                key=key,
                name=data["name"],
                subject=data["subject"],
                body_html=data["body_html"],
                available_vars=data.get("available_vars"),
                is_system=True,
            )
        )
        inserted += 1
    db.commit()
    return inserted
