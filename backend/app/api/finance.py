from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.finance import FinanceRecord
from app.models.user import User
from app.schemas.finance import (
    FinanceCreate,
    FinanceRead,
    FinanceSummary,
    FinanceUpdate,
)

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/", response_model=list[FinanceRead])
def list_finance(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    type: str | None = Query(None),
    category: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(FinanceRecord)
    if date_from:
        q = q.filter(FinanceRecord.date >= date_from)
    if date_to:
        q = q.filter(FinanceRecord.date <= date_to)
    if type:
        q = q.filter(FinanceRecord.type == type)
    if category:
        q = q.filter(FinanceRecord.category == category)
    return q.order_by(FinanceRecord.date.desc()).all()


@router.post("/", response_model=FinanceRead, status_code=status.HTTP_201_CREATED)
def create_finance(
    body: FinanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    record = FinanceRecord(
        **body.model_dump(),
        created_by=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{record_id}", response_model=FinanceRead)
def update_finance(
    record_id: int,
    body: FinanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    record = db.get(FinanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record non trovato")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_finance(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    record = db.get(FinanceRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record non trovato")
    db.delete(record)
    db.commit()


@router.get("/summary", response_model=FinanceSummary)
def finance_summary(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(FinanceRecord)
    if date_from:
        q = q.filter(FinanceRecord.date >= date_from)
    if date_to:
        q = q.filter(FinanceRecord.date <= date_to)

    records = q.all()

    total_income = Decimal("0")
    total_expenses = Decimal("0")
    by_category: dict[str, Decimal] = {}

    for r in records:
        amount = Decimal(str(r.amount))
        if r.type == "entrata":
            total_income += amount
        else:
            total_expenses += amount
        by_category[r.category] = by_category.get(r.category, Decimal("0")) + amount

    period_parts = []
    if date_from:
        period_parts.append(f"dal {date_from.isoformat()}")
    if date_to:
        period_parts.append(f"al {date_to.isoformat()}")
    period = " ".join(period_parts) if period_parts else "tutto il periodo"

    return FinanceSummary(
        period=period,
        total_income=total_income,
        total_expenses=total_expenses,
        balance=total_income - total_expenses,
        by_category=by_category,
    )
