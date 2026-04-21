import csv
from datetime import date
from io import StringIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_admin
from app.database import get_db
from app.models.attendance import Attendance
from app.models.boat import Boat
from app.models.booking import Booking
from app.models.fee import Fee
from app.models.finance import FinanceRecord
from app.models.member import Member
from app.models.user import User

router = APIRouter(prefix="/export", tags=["exports"])


def csv_response(rows, headers, filename):
    buf = StringIO()
    buf.write("\ufeff")  # BOM per Excel
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(headers)
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/members.csv")
def export_members(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    members = (
        db.query(Member)
        .options(selectinload(Member.fees))
        .order_by(Member.name)
        .all()
    )
    current_year = date.today().year
    rows = []
    for m in members:
        fee_current = any(
            f.paid for f in (m.fees or []) if f.year == current_year
        )
        rows.append(
            [
                m.id,
                m.name,
                m.ruolo,
                m.tessera or "",
                m.email or "",
                m.phone or "",
                "SI" if m.is_active else "NO",
                m.medical_cert_expiry.isoformat() if m.medical_cert_expiry else "",
                "SI" if fee_current else "NO",
                m.created_at.isoformat() if m.created_at else "",
            ]
        )
    headers = [
        "ID",
        "Nome",
        "Ruolo",
        "Tessera",
        "Email",
        "Telefono",
        "Attivo",
        "Scadenza certificato",
        "Quota anno corrente",
        "Creato",
    ]
    return csv_response(rows, headers, "soci.csv")


@router.get("/fees.csv")
def export_fees(
    year: int | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Fee).options(selectinload(Fee.member))
    if year:
        q = q.filter(Fee.year == year)
    fees = q.order_by(Fee.year.desc()).all()
    rows = []
    for f in fees:
        rows.append(
            [
                f.member.name if f.member else "",
                f.member.tessera if f.member and f.member.tessera else "",
                f.year,
                str(f.amount),
                "SI" if f.paid else "NO",
                f.paid_date.isoformat() if f.paid_date else "",
                f.payment_method or "",
                f.receipt_number or "",
                (f.note or "").replace("\n", " "),
            ]
        )
    headers = [
        "Socio",
        "Tessera",
        "Anno",
        "Importo",
        "Pagata",
        "Data pagamento",
        "Metodo",
        "Ricevuta",
        "Note",
    ]
    return csv_response(rows, headers, "quote.csv")


@router.get("/finance.csv")
def export_finance(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(FinanceRecord).options(selectinload(FinanceRecord.member))
    if date_from:
        q = q.filter(FinanceRecord.date >= date_from)
    if date_to:
        q = q.filter(FinanceRecord.date <= date_to)
    records = q.order_by(FinanceRecord.date.desc()).all()
    rows = []
    for r in records:
        rows.append(
            [
                r.date.isoformat(),
                r.type,
                str(r.amount),
                r.category,
                (r.description or "").replace("\n", " "),
                r.member.name if r.member else "",
                r.receipt_ref or "",
            ]
        )
    headers = [
        "Data",
        "Tipo",
        "Importo",
        "Categoria",
        "Descrizione",
        "Socio",
        "Ricevuta",
    ]
    return csv_response(rows, headers, "finanze.csv")


@router.get("/attendance.csv")
def export_attendance(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Attendance).options(
        selectinload(Attendance.member), selectinload(Attendance.boat)
    )
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    items = q.order_by(Attendance.date.desc()).all()
    rows = []
    for a in items:
        rows.append(
            [
                a.date.isoformat(),
                a.slot,
                a.member.name if a.member else "",
                a.boat.name if a.boat else "",
                "SI" if a.present else "NO",
                (a.note or "").replace("\n", " "),
            ]
        )
    headers = ["Data", "Slot", "Socio", "Barca", "Presente", "Note"]
    return csv_response(rows, headers, "presenze.csv")


@router.get("/bookings.csv")
def export_bookings(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Booking).options(
        selectinload(Booking.boat),
        selectinload(Booking.pope),
        selectinload(Booking.participants),
    )
    if date_from:
        q = q.filter(Booking.date >= date_from)
    if date_to:
        q = q.filter(Booking.date <= date_to)
    items = q.order_by(Booking.date.desc()).all()

    # prefetch users
    user_ids = {b.created_by for b in items if b.created_by}
    users_by_id: dict[int, User] = {}
    if user_ids:
        for u in db.query(User).filter(User.id.in_(user_ids)).all():
            users_by_id[u.id] = u

    rows = []
    for b in items:
        creator = users_by_id.get(b.created_by) if b.created_by else None
        rows.append(
            [
                b.date.isoformat(),
                b.slot,
                b.boat.name if b.boat else "",
                b.pope.name if b.pope else "",
                len(b.participants or []),
                "SI" if b.confirmed else "NO",
                creator.email if creator else "",
                (b.note or "").replace("\n", " "),
            ]
        )
    headers = [
        "Data",
        "Slot",
        "Barca",
        "Pope",
        "Partecipanti",
        "Confermata",
        "Creata da",
        "Note",
    ]
    return csv_response(rows, headers, "prenotazioni.csv")
