from datetime import date as _date, datetime
from decimal import Decimal

from pydantic import BaseModel


class MaintenanceCreate(BaseModel):
    boat_id: int
    date: _date
    description: str
    cost: Decimal | None = None
    performed_by: str | None = None
    next_check_date: _date | None = None
    create_finance_record: bool = False


class MaintenanceUpdate(BaseModel):
    boat_id: int | None = None
    date: _date | None = None
    description: str | None = None
    cost: Decimal | None = None
    performed_by: str | None = None
    next_check_date: _date | None = None
    finance_record_id: int | None = None


class MaintenanceRead(BaseModel):
    id: int
    boat_id: int
    date: _date
    description: str
    cost: Decimal | None
    performed_by: str | None
    next_check_date: _date | None
    finance_record_id: int | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    boat_name: str | None = None
    boat_tipo: str | None = None

    model_config = {"from_attributes": True}
