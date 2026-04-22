from datetime import date as _date, datetime
from decimal import Decimal

from pydantic import BaseModel


class InvoiceCreate(BaseModel):
    date: _date
    recipient_name: str
    recipient_fiscal_code: str | None = None
    recipient_address: str | None = None
    amount: Decimal
    description: str
    payment_method: str | None = None
    fee_id: int | None = None
    finance_record_id: int | None = None
    member_id: int | None = None


class InvoiceRead(BaseModel):
    id: int
    number: str
    date: _date
    recipient_name: str
    recipient_fiscal_code: str | None
    recipient_address: str | None
    amount: Decimal
    description: str
    payment_method: str | None
    fee_id: int | None
    finance_record_id: int | None
    member_id: int | None
    pdf_path: str | None
    created_by: int | None
    created_at: datetime
    member_name: str | None = None

    model_config = {"from_attributes": True}


class InvoiceNumberInfo(BaseModel):
    year: int
    next_number: str
