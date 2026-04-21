from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, EmailStr


class MemberRuolo(str, Enum):
    pope = "pope"
    paron = "paron"
    provin = "provin"
    ospite = "ospite"


class MemberCreate(BaseModel):
    name: str
    ruolo: MemberRuolo
    tessera: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    note: str | None = None
    medical_cert_expiry: date | None = None
    fee_paid: bool = False
    fee_year: int | None = None


class MemberRead(BaseModel):
    id: int
    name: str
    ruolo: MemberRuolo
    tessera: str | None
    email: str | None
    phone: str | None
    note: str | None
    is_active: bool
    medical_cert_expiry: date | None
    medical_cert_file: str | None
    medical_cert_reminded: bool
    fee_paid: bool
    fee_year: int | None
    fee_paid_current_year: bool = False  # computed da tabella fees
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberUpdate(BaseModel):
    name: str | None = None
    ruolo: MemberRuolo | None = None
    tessera: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    note: str | None = None
    is_active: bool | None = None
    medical_cert_expiry: date | None = None
    fee_paid: bool | None = None
    fee_year: int | None = None
