from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_pope_or_admin
from app.database import get_db
from app.models.booking import Booking, BookingParticipant
from app.models.member import Member
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/", response_model=list[BookingRead])
def list_bookings(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    boat_id: int | None = Query(None),
    confirmed: bool | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Booking)
    if date_from:
        q = q.filter(Booking.date >= date_from)
    if date_to:
        q = q.filter(Booking.date <= date_to)
    if boat_id:
        q = q.filter(Booking.boat_id == boat_id)
    if confirmed is not None:
        q = q.filter(Booking.confirmed == confirmed)
    return q.order_by(Booking.date, Booking.slot).all()


@router.get("/{booking_id}", response_model=BookingRead)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    return booking


@router.post("/", response_model=BookingRead, status_code=201)
def create_booking(
    body: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check slot availability
    existing = (
        db.query(Booking)
        .filter(
            Booking.date == body.date,
            Booking.slot == body.slot,
            Booking.boat_id == body.boat_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slot già prenotato per questa barca",
        )

    booking = Booking(
        date=body.date,
        slot=body.slot,
        boat_id=body.boat_id,
        pope_id=body.pope_id,
        note=body.note,
        created_by=current_user.id,
    )
    db.add(booking)
    db.flush()

    # Add participants
    for mid in body.participant_ids:
        db.add(BookingParticipant(booking_id=booking.id, member_id=mid))

    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/{booking_id}", response_model=BookingRead)
def update_booking(
    booking_id: int,
    body: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")

    # Permission: admin/pope always, socio only own bookings
    if current_user.role == "socio" and booking.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Non puoi modificare questa prenotazione")

    data = body.model_dump(exclude_unset=True)
    participant_ids = data.pop("participant_ids", None)

    for key, val in data.items():
        setattr(booking, key, val)

    if participant_ids is not None:
        db.query(BookingParticipant).filter(
            BookingParticipant.booking_id == booking_id
        ).delete()
        for mid in participant_ids:
            db.add(BookingParticipant(booking_id=booking_id, member_id=mid))

    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/confirm", response_model=BookingRead)
def confirm_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_pope_or_admin),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    booking.confirmed = True
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/{booking_id}", status_code=204)
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")

    if current_user.role == "socio" and booking.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Non puoi cancellare questa prenotazione")

    db.delete(booking)
    db.commit()
