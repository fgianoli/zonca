from datetime import date as _date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel


class TransactionType(str, Enum):
    entrata = "entrata"
    uscita = "uscita"


class FinanceCategory(str, Enum):
    quota_sociale = "quota_sociale"
    donazione = "donazione"
    contributo = "contributo"
    manutenzione = "manutenzione"
    materiali = "materiali"
    affitto = "affitto"
    assicurazione = "assicurazione"
    evento = "evento"
    altro = "altro"


class FinanceCreate(BaseModel):
    date: _date
    type: TransactionType
    amount: Decimal
    category: FinanceCategory
    description: str
    member_id: int | None = None
    receipt_ref: str | None = None


class FinanceRead(BaseModel):
    id: int
    date: _date
    type: TransactionType
    amount: Decimal
    category: str
    description: str
    member_id: int | None
    receipt_ref: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinanceUpdate(BaseModel):
    date: _date | None = None
    type: TransactionType | None = None
    amount: Decimal | None = None
    category: FinanceCategory | None = None
    description: str | None = None
    member_id: int | None = None
    receipt_ref: str | None = None


class FinanceSummary(BaseModel):
    period: str
    total_income: Decimal
    total_expenses: Decimal
    balance: Decimal
    by_category: dict[str, Decimal]
