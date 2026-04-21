import secrets
from datetime import datetime


def generate_ical_token() -> str:
    return secrets.token_urlsafe(32)


def _escape(text: str) -> str:
    if text is None:
        return ""
    return (
        text.replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\n", "\\n")
    )


def build_ical(events: list[dict], calendar_name: str) -> str:
    """events: list of dicts with keys uid, summary, dtstart, dtend, description, location.
    dtstart/dtend must already be formatted as YYYYMMDDTHHMMSSZ."""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Remiera Zonca//EN",
        f"X-WR-CALNAME:{_escape(calendar_name)}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    for ev in events:
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{ev['uid']}",
                f"DTSTAMP:{now}",
                f"DTSTART:{ev['dtstart']}",
                f"DTEND:{ev['dtend']}",
                f"SUMMARY:{_escape(ev.get('summary', ''))}",
                f"DESCRIPTION:{_escape(ev.get('description', ''))}",
                f"LOCATION:{_escape(ev.get('location', 'Remiera Zonca, Padova'))}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
