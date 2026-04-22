from datetime import datetime

from pydantic import BaseModel

from app.schemas.member import MemberRead


class CrewCreate(BaseModel):
    name: str
    description: str | None = None
    default_slot: str | None = None
    pope_id: int | None = None
    member_ids: list[int] = []


class CrewUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    default_slot: str | None = None
    pope_id: int | None = None
    member_ids: list[int] | None = None
    is_active: bool | None = None


class CrewRead(BaseModel):
    id: int
    name: str
    description: str | None
    default_slot: str | None
    pope_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    pope: MemberRead | None = None
    members: list[MemberRead] = []

    model_config = {"from_attributes": True}
