from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.event import Event, EventRegistration
from app.models.member import Member
from app.models.user import User
from app.schemas.event import (
    EventCreate,
    EventDetail,
    EventRead,
    EventRegisterBody,
    EventUpdate,
    RegistrationRead,
)

router = APIRouter(prefix="/events", tags=["events"])


def _to_read(ev: Event) -> dict:
    confirmed = [r for r in (ev.registrations or []) if r.status == "confirmed"]
    count = len(confirmed)
    available = (
        (ev.max_participants - count) if ev.max_participants is not None else None
    )
    return {
        "id": ev.id,
        "title": ev.title,
        "event_type": ev.event_type,
        "date_start": ev.date_start,
        "date_end": ev.date_end,
        "location": ev.location,
        "description": ev.description,
        "max_participants": ev.max_participants,
        "requires_registration": ev.requires_registration,
        "is_public": ev.is_public,
        "created_by": ev.created_by,
        "created_at": ev.created_at,
        "updated_at": ev.updated_at,
        "participants_count": count,
        "available_spots": available,
    }


@router.get("/", response_model=list[EventRead])
def list_events(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    event_type: str | None = Query(None),
    upcoming: bool = Query(False),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Event).options(selectinload(Event.registrations))
    if date_from:
        q = q.filter(Event.date_start >= date_from)
    if date_to:
        q = q.filter(Event.date_start <= date_to)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    if upcoming:
        q = q.filter(Event.date_start >= datetime.now(timezone.utc))
    events = q.order_by(Event.date_start.asc()).all()
    return [_to_read(e) for e in events]


@router.get("/public", response_model=list[EventRead])
def list_public_events(db: Session = Depends(get_db)):
    q = (
        db.query(Event)
        .options(selectinload(Event.registrations))
        .filter(Event.is_public == True)
        .filter(Event.date_start >= datetime.now(timezone.utc))
        .order_by(Event.date_start.asc())
    )
    return [_to_read(e) for e in q.all()]


@router.get("/{event_id}", response_model=EventDetail)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    ev = (
        db.query(Event)
        .options(selectinload(Event.registrations).selectinload(EventRegistration.member))
        .filter(Event.id == event_id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    data = _to_read(ev)
    data["registrations"] = [RegistrationRead.model_validate(r) for r in ev.registrations]
    return data


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ev = Event(**body.model_dump(), created_by=current_user.id)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return _to_read(ev)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    body: EventUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ev, k, v)
    db.commit()
    db.refresh(ev)
    return _to_read(ev)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    db.delete(ev)
    db.commit()


@router.post("/{event_id}/register", response_model=RegistrationRead, status_code=201)
def register_to_event(
    event_id: int,
    body: EventRegisterBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = (
        db.query(Event)
        .options(selectinload(Event.registrations))
        .filter(Event.id == event_id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Evento non trovato")

    member_id = body.member_id or current_user.member_id
    if not member_id:
        raise HTTPException(
            status_code=400, detail="Nessun socio associato all'utente"
        )

    # Solo admin può iscrivere altri soci
    if body.member_id and body.member_id != current_user.member_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Solo admin può iscrivere altri soci"
        )

    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")

    existing = (
        db.query(EventRegistration)
        .filter_by(event_id=event_id, member_id=member_id)
        .first()
    )
    if existing and existing.status != "cancelled":
        raise HTTPException(status_code=400, detail="Iscrizione già presente")

    confirmed_count = sum(
        1 for r in ev.registrations if r.status == "confirmed"
    )
    reg_status = "confirmed"
    if (
        ev.max_participants is not None
        and confirmed_count >= ev.max_participants
    ):
        reg_status = "waitlist"

    if existing:
        existing.status = reg_status
        existing.note = body.note
        reg = existing
    else:
        reg = EventRegistration(
            event_id=event_id,
            member_id=member_id,
            status=reg_status,
            note=body.note,
        )
        db.add(reg)

    db.commit()
    db.refresh(reg)
    return reg


@router.delete("/{event_id}/register/{member_id}", status_code=204)
def cancel_registration(
    event_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.member_id != member_id:
        raise HTTPException(status_code=403, detail="Accesso negato")

    reg = (
        db.query(EventRegistration)
        .filter_by(event_id=event_id, member_id=member_id)
        .first()
    )
    if not reg:
        raise HTTPException(status_code=404, detail="Iscrizione non trovata")
    reg.status = "cancelled"
    db.commit()


@router.post(
    "/{event_id}/registrations/{reg_id}/confirm",
    response_model=RegistrationRead,
)
def confirm_registration(
    event_id: int,
    reg_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    reg = db.get(EventRegistration, reg_id)
    if not reg or reg.event_id != event_id:
        raise HTTPException(status_code=404, detail="Iscrizione non trovata")
    reg.status = "confirmed"
    db.commit()
    db.refresh(reg)
    return reg
