from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.fee import Fee
from app.models.member import Member
from app.models.user import User
from app.schemas.fee import FeeCreate, FeeRead, FeeSummary, FeeUpdate

router = APIRouter(prefix="/fees", tags=["fees"])


def _fee_to_read(fee: Fee) -> FeeRead:
    """Convert Fee ORM object to FeeRead, including member_name."""
    data = {
        "id": fee.id,
        "member_id": fee.member_id,
        "year": fee.year,
        "amount": fee.amount,
        "paid": fee.paid,
        "paid_date": fee.paid_date,
        "payment_method": fee.payment_method,
        "receipt_number": fee.receipt_number,
        "note": fee.note,
        "created_at": fee.created_at,
        "updated_at": fee.updated_at,
        "member_name": fee.member.name if fee.member else None,
    }
    return FeeRead(**data)


@router.get("/", response_model=list[FeeRead])
def list_fees(
    year: int | None = Query(None),
    member_id: int | None = Query(None),
    paid: bool | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Fee).join(Member)
    if year is not None:
        q = q.filter(Fee.year == year)
    if member_id is not None:
        q = q.filter(Fee.member_id == member_id)
    if paid is not None:
        q = q.filter(Fee.paid == paid)
    fees = q.order_by(Fee.year.desc(), Member.name).all()
    return [_fee_to_read(f) for f in fees]


@router.post("/", response_model=FeeRead, status_code=201)
def create_fee(
    body: FeeCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    # Check member exists
    member = db.get(Member, body.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")

    # Check unique constraint proactively
    existing = (
        db.query(Fee)
        .filter(Fee.member_id == body.member_id, Fee.year == body.year)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Quota per l'anno {body.year} gia' presente per questo socio",
        )

    fee = Fee(**body.model_dump())
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return _fee_to_read(fee)


@router.patch("/{fee_id}", response_model=FeeRead)
def update_fee(
    fee_id: int,
    body: FeeUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    fee = db.get(Fee, fee_id)
    if not fee:
        raise HTTPException(status_code=404, detail="Quota non trovata")

    data = body.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(fee, key, val)
    db.commit()
    db.refresh(fee)
    return _fee_to_read(fee)


@router.delete("/{fee_id}", status_code=204)
def delete_fee(
    fee_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    fee = db.get(Fee, fee_id)
    if not fee:
        raise HTTPException(status_code=404, detail="Quota non trovata")
    db.delete(fee)
    db.commit()


@router.get("/summary", response_model=FeeSummary)
def fee_summary(
    year: int = Query(..., description="Anno per il riepilogo"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    fees = db.query(Fee).filter(Fee.year == year).all()

    total_expected = sum(f.amount for f in fees) or Decimal("0.00")
    total_paid = sum(f.amount for f in fees if f.paid) or Decimal("0.00")
    total_unpaid = total_expected - total_paid
    count_paid = sum(1 for f in fees if f.paid)
    count_unpaid = sum(1 for f in fees if not f.paid)

    return FeeSummary(
        year=year,
        total_expected=total_expected,
        total_paid=total_paid,
        total_unpaid=total_unpaid,
        count_paid=count_paid,
        count_unpaid=count_unpaid,
    )
