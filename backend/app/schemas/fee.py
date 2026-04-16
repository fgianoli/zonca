from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class FeeCreate(BaseModel):
    member_id: int
    year: int
    amount: Decimal
    paid: bool = False
    paid_date: date | None = None
    payment_method: str | None = None
    receipt_number: str | None = None
    note: str | None = None


class FeeRead(BaseModel):
    id: int
    member_id: int
    year: int
    amount: Decimal
    paid: bool
    paid_date: date | None
    payment_method: str | None
    receipt_number: str | None
    note: str | None
    created_at: datetime
    updated_at: datetime
    member_name: str | None = None

    model_config = {"from_attributes": True}


class FeeUpdate(BaseModel):
    year: int | None = None
    amount: Decimal | None = None
    paid: bool | None = None
    paid_date: date | None = None
    payment_method: str | None = None
    receipt_number: str | None = None
    note: str | None = None


class FeeSummary(BaseModel):
    year: int
    total_expected: Decimal
    total_paid: Decimal
    total_unpaid: Decimal
    count_paid: int
    count_unpaid: int
