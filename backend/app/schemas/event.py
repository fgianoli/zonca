from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class EventType(str, Enum):
    regata = "regata"
    festa = "festa"
    corso = "corso"
    altro = "altro"


class RegistrationStatus(str, Enum):
    confirmed = "confirmed"
    waitlist = "waitlist"
    cancelled = "cancelled"


class EventCreate(BaseModel):
    title: str
    event_type: EventType
    date_start: datetime
    date_end: datetime | None = None
    location: str | None = None
    description: str | None = None
    max_participants: int | None = None
    requires_registration: bool = True
    is_public: bool = False


class EventUpdate(BaseModel):
    title: str | None = None
    event_type: EventType | None = None
    date_start: datetime | None = None
    date_end: datetime | None = None
    location: str | None = None
    description: str | None = None
    max_participants: int | None = None
    requires_registration: bool | None = None
    is_public: bool | None = None


class _MemberMini(BaseModel):
    id: int
    name: str
    ruolo: str | None = None

    model_config = {"from_attributes": True}


class RegistrationRead(BaseModel):
    id: int
    event_id: int
    member_id: int
    status: RegistrationStatus
    note: str | None
    created_at: datetime
    member: _MemberMini | None = None

    model_config = {"from_attributes": True}


class EventRead(BaseModel):
    id: int
    title: str
    event_type: EventType
    date_start: datetime
    date_end: datetime | None
    location: str | None
    description: str | None
    max_participants: int | None
    requires_registration: bool
    is_public: bool
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    participants_count: int = 0
    available_spots: int | None = None

    model_config = {"from_attributes": True}


class EventDetail(EventRead):
    registrations: list[RegistrationRead] = []


class EventRegisterBody(BaseModel):
    member_id: int | None = None
    note: str | None = None
