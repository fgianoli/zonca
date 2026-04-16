from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel

from app.schemas.member import MemberRead


class AttendanceCreate(BaseModel):
    date: date
    slot: str
    member_id: int
    boat_id: int | None = None
    booking_id: int | None = None
    present: bool = True
    note: str | None = None


class AttendanceRead(BaseModel):
    id: int
    booking_id: int | None
    member_id: int
    date: date
    slot: str
    boat_id: int | None
    present: bool
    note: str | None
    created_at: datetime
    updated_at: datetime
    member: MemberRead

    model_config = {"from_attributes": True}


class AttendanceBulkEntry(BaseModel):
    member_id: int
    present: bool = True
    note: str | None = None


class AttendanceBulkCreate(BaseModel):
    date: date
    slot: str
    booking_id: int | None = None
    boat_id: int | None = None
    entries: list[AttendanceBulkEntry]


class AttendanceStats(BaseModel):
    member_id: int
    total_presences: int
    year: int | None = None
