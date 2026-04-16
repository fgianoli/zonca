from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.boat import Boat
from app.models.booking import Booking
from app.models.finance import FinanceRecord
from app.models.member import Member
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    today = date.today()
    current_year = today.year
    thirty_days = today + timedelta(days=30)
    month_start = today.replace(day=1)

    # --- Members ---
    total_active = db.query(func.count(Member.id)).filter(Member.is_active.is_(True)).scalar() or 0

    ruolo_rows = (
        db.query(Member.ruolo, func.count(Member.id))
        .filter(Member.is_active.is_(True))
        .group_by(Member.ruolo)
        .all()
    )
    by_ruolo = {r: 0 for r in ("pope", "paron", "provin", "ospite")}
    for ruolo, cnt in ruolo_rows:
        by_ruolo[ruolo] = cnt

    certs_expiring_30d = (
        db.query(func.count(Member.id))
        .filter(
            Member.is_active.is_(True),
            Member.medical_cert_expiry.isnot(None),
            Member.medical_cert_expiry > today,
            Member.medical_cert_expiry <= thirty_days,
        )
        .scalar()
        or 0
    )

    certs_expired = (
        db.query(func.count(Member.id))
        .filter(
            Member.is_active.is_(True),
            Member.medical_cert_expiry.isnot(None),
            Member.medical_cert_expiry <= today,
        )
        .scalar()
        or 0
    )

    fees_paid_current_year = (
        db.query(func.count(Member.id))
        .filter(
            Member.is_active.is_(True),
            Member.fee_paid.is_(True),
            Member.fee_year == current_year,
        )
        .scalar()
        or 0
    )

    fees_unpaid_current_year = total_active - fees_paid_current_year

    # --- Boats ---
    # The Boat model has a `status` field: attiva, manutenzione, fuori_servizio
    total_boats = db.query(func.count(Boat.id)).scalar() or 0
    active_boats = db.query(func.count(Boat.id)).filter(Boat.status == "attiva").scalar() or 0
    maintenance_boats = db.query(func.count(Boat.id)).filter(Boat.status == "manutenzione").scalar() or 0
    oos_boats = db.query(func.count(Boat.id)).filter(Boat.status == "fuori_servizio").scalar() or 0

    # --- Bookings ---
    bookings_this_month = (
        db.query(func.count(Booking.id))
        .filter(Booking.date >= month_start, Booking.date <= today)
        .scalar()
        or 0
    )

    pending_confirmation = (
        db.query(func.count(Booking.id))
        .filter(Booking.confirmed.is_(False), Booking.date >= today)
        .scalar()
        or 0
    )

    # --- Finance ---
    year_start = date(current_year, 1, 1)
    year_end = date(current_year, 12, 31)

    year_income = (
        db.query(func.sum(FinanceRecord.amount))
        .filter(
            FinanceRecord.type == "entrata",
            FinanceRecord.date >= year_start,
            FinanceRecord.date <= year_end,
        )
        .scalar()
    ) or 0.0

    year_expenses = (
        db.query(func.sum(FinanceRecord.amount))
        .filter(
            FinanceRecord.type == "uscita",
            FinanceRecord.date >= year_start,
            FinanceRecord.date <= year_end,
        )
        .scalar()
    ) or 0.0

    year_income = float(year_income)
    year_expenses = float(year_expenses)

    return {
        "members": {
            "total_active": total_active,
            "by_ruolo": by_ruolo,
            "certs_expiring_30d": certs_expiring_30d,
            "certs_expired": certs_expired,
            "fees_paid_current_year": fees_paid_current_year,
            "fees_unpaid_current_year": fees_unpaid_current_year,
        },
        "boats": {
            "total": total_boats,
            "active": active_boats,
            "in_maintenance": maintenance_boats,
            "out_of_service": oos_boats,
        },
        "bookings": {
            "this_month": bookings_this_month,
            "pending_confirmation": pending_confirmation,
        },
        "finance": {
            "year_income": year_income,
            "year_expenses": year_expenses,
            "year_balance": round(year_income - year_expenses, 2),
        },
    }
