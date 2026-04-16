from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_pope_or_admin
from app.database import get_db
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceRead,
    AttendanceStats,
)

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/", response_model=list[AttendanceRead])
def list_attendance(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    member_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Attendance)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    if member_id:
        q = q.filter(Attendance.member_id == member_id)
    return q.order_by(Attendance.date.desc(), Attendance.slot).all()


@router.post("/bulk", response_model=list[AttendanceRead], status_code=201)
def bulk_create_attendance(
    body: AttendanceBulkCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_pope_or_admin),
):
    results = []
    for entry in body.entries:
        # Check if attendance already exists for this member/date/slot
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.date == body.date,
                Attendance.slot == body.slot,
                Attendance.member_id == entry.member_id,
            )
            .first()
        )
        if existing:
            # Update existing record
            existing.present = entry.present
            existing.note = entry.note
            if body.booking_id is not None:
                existing.booking_id = body.booking_id
            if body.boat_id is not None:
                existing.boat_id = body.boat_id
            results.append(existing)
        else:
            attendance = Attendance(
                date=body.date,
                slot=body.slot,
                member_id=entry.member_id,
                boat_id=body.boat_id,
                booking_id=body.booking_id,
                present=entry.present,
                note=entry.note,
            )
            db.add(attendance)
            results.append(attendance)
    db.commit()
    for r in results:
        db.refresh(r)
    return results


@router.get("/member/{member_id}/stats", response_model=AttendanceStats)
def member_attendance_stats(
    member_id: int,
    year: int | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(func.count(Attendance.id)).filter(
        Attendance.member_id == member_id,
        Attendance.present == True,
    )
    if year:
        q = q.filter(extract("year", Attendance.date) == year)
    count = q.scalar()
    return AttendanceStats(
        member_id=member_id,
        total_presences=count or 0,
        year=year,
    )


@router.delete("/{attendance_id}", status_code=204)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    attendance = db.get(Attendance, attendance_id)
    if not attendance:
        raise HTTPException(status_code=404, detail="Presenza non trovata")
    db.delete(attendance)
    db.commit()
