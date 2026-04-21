from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models.booking import Booking
from app.models.event import Event, EventRegistration
from app.models.user import User
from app.services.ical import build_ical, generate_ical_token

router = APIRouter(prefix="/ical", tags=["ical"])


def _fmt_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _parse_slot(slot: str) -> tuple[int, int]:
    try:
        hh, mm = slot.split(":")
        return int(hh), int(mm)
    except Exception:
        return 7, 0


def _booking_to_vevent(b: Booking) -> dict:
    hh, mm = _parse_slot(b.slot)
    start = datetime(
        b.date.year, b.date.month, b.date.day, hh, mm, tzinfo=timezone.utc
    )
    end = start + timedelta(hours=1)
    participants_names = ", ".join(p.name for p in (b.participants or []))
    boat_name = b.boat.name if b.boat else "Barca"
    pope_name = b.pope.name if b.pope else ""
    return {
        "uid": f"booking-{b.id}@remierazonca",
        "summary": f"{boat_name} - {pope_name}",
        "dtstart": _fmt_dt(start),
        "dtend": _fmt_dt(end),
        "description": f"Partecipanti: {participants_names}"
        + (f"\nNote: {b.note}" if b.note else ""),
        "location": "Remiera Zonca, Padova",
    }


def _event_to_vevent(ev: Event) -> dict:
    start = ev.date_start
    end = ev.date_end or (ev.date_start + timedelta(hours=2))
    return {
        "uid": f"event-{ev.id}@remierazonca",
        "summary": f"[{ev.event_type}] {ev.title}",
        "dtstart": _fmt_dt(start),
        "dtend": _fmt_dt(end),
        "description": ev.description or "",
        "location": ev.location or "Remiera Zonca, Padova",
    }


def _ics_response(content: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


def _build_urls(request: Request, token: str) -> dict:
    base = str(request.base_url).rstrip("/")
    return {
        "all": f"{base}/api/ical/feed/{token}/all.ics",
        "mine": f"{base}/api/ical/feed/{token}/me.ics",
    }


@router.post("/token")
def create_token(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.ical_token = generate_ical_token()
    db.commit()
    db.refresh(current_user)
    return {
        "token": current_user.ical_token,
        "urls": _build_urls(request, current_user.ical_token),
    }


@router.delete("/token", status_code=204)
def delete_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.ical_token = None
    db.commit()


@router.get("/feed/{token}/all.ics")
def feed_all(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.ical_token == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Token non valido")

    bookings = (
        db.query(Booking)
        .options(
            selectinload(Booking.boat),
            selectinload(Booking.pope),
            selectinload(Booking.participants),
        )
        .order_by(Booking.date.asc())
        .all()
    )

    # eventi pubblici + eventi a cui l'utente è iscritto
    public_events = (
        db.query(Event).filter(Event.is_public == True).all()
    )
    event_ids = {e.id for e in public_events}
    if user.member_id:
        registered = (
            db.query(Event)
            .join(EventRegistration, EventRegistration.event_id == Event.id)
            .filter(EventRegistration.member_id == user.member_id)
            .filter(EventRegistration.status != "cancelled")
            .all()
        )
        for e in registered:
            if e.id not in event_ids:
                public_events.append(e)
                event_ids.add(e.id)

    vevents = [_booking_to_vevent(b) for b in bookings]
    vevents.extend(_event_to_vevent(e) for e in public_events)

    ics = build_ical(vevents, "Remiera Zonca - Tutte le attività")
    return _ics_response(ics, "remiera-zonca-all.ics")


@router.get("/feed/{token}/me.ics")
def feed_me(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.ical_token == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Token non valido")
    if not user.member_id:
        return _ics_response(
            build_ical([], "Remiera Zonca - Le mie attività"),
            "remiera-zonca-me.ics",
        )

    member_id = user.member_id

    bookings_q = (
        db.query(Booking)
        .options(
            selectinload(Booking.boat),
            selectinload(Booking.pope),
            selectinload(Booking.participants),
        )
        .filter(
            (Booking.pope_id == member_id)
            | Booking.participants.any(id=member_id)
        )
    )
    bookings = bookings_q.order_by(Booking.date.asc()).all()

    registered_events = (
        db.query(Event)
        .join(EventRegistration, EventRegistration.event_id == Event.id)
        .filter(EventRegistration.member_id == member_id)
        .filter(EventRegistration.status != "cancelled")
        .all()
    )

    vevents = [_booking_to_vevent(b) for b in bookings]
    vevents.extend(_event_to_vevent(e) for e in registered_events)

    ics = build_ical(vevents, "Remiera Zonca - Le mie attività")
    return _ics_response(ics, "remiera-zonca-me.ics")
