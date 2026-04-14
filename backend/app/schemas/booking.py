from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel

from app.schemas.boat import BoatRead
from app.schemas.member import MemberRead


class TimeSlot(str, Enum):
    s0600 = "06:00"
    s0730 = "07:30"
    s0900 = "09:00"
    s1030 = "10:30"
    s1400 = "14:00"
    s1530 = "15:30"
    s1700 = "17:00"
    s1830 = "18:30"


class BookingCreate(BaseModel):
    date: date
    slot: TimeSlot
    boat_id: int
    pope_id: int
    participant_ids: list[int] = []
    note: str | None = None


class BookingRead(BaseModel):
    id: int
    date: date
    slot: TimeSlot
    boat_id: int
    pope_id: int
    confirmed: bool
    note: str | None
    created_at: datetime
    boat: BoatRead
    pope: MemberRead
    participants: list[MemberRead]

    model_config = {"from_attributes": True}


class BookingUpdate(BaseModel):
    date: date | None = None
    slot: TimeSlot | None = None
    boat_id: int | None = None
    pope_id: int | None = None
    participant_ids: list[int] | None = None
    confirmed: bool | None = None
    note: str | None = None
