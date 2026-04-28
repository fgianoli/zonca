from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, field_validator


class MemberRuolo(str, Enum):
    pope = "pope"
    paron = "paron"
    provin = "provin"
    ospite = "ospite"


def _empty_to_none(v):
    """Converte stringhe vuote in None — utile per campi opzionali."""
    if isinstance(v, str) and v.strip() == "":
        return None
    return v


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

    @field_validator("tessera", "phone", "note", mode="before")
    @classmethod
    def _blank_to_none_text(cls, v):
        return _empty_to_none(v)

    @field_validator("email", mode="before")
    @classmethod
    def _blank_to_none_email(cls, v):
        return _empty_to_none(v)


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

    @field_validator("tessera", "phone", "note", mode="before")
    @classmethod
    def _blank_to_none_text(cls, v):
        return _empty_to_none(v)

    @field_validator("email", mode="before")
    @classmethod
    def _blank_to_none_email(cls, v):
        return _empty_to_none(v)
