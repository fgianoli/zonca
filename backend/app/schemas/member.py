from datetime import datetime
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


class MemberRead(BaseModel):
    id: int
    name: str
    ruolo: MemberRuolo
    tessera: str | None
    email: str | None
    phone: str | None
    note: str | None
    is_active: bool
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
