from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class BoatTipo(str, Enum):
    mascareta = "mascareta"
    sandolo_w = "sandolo-w"
    sandolo_4 = "sandolo-4"
    gondolino_4 = "gondolino-4"
    caorlina_6 = "caorlina-6"
    altro = "altro"


class BoatCreate(BaseModel):
    name: str
    tipo: BoatTipo
    seats: int = 2
    color: str = "#2d7d9a"
    available: bool = True
    note: str | None = None


class BoatRead(BaseModel):
    id: int
    name: str
    tipo: BoatTipo
    seats: int
    color: str
    available: bool
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BoatUpdate(BaseModel):
    name: str | None = None
    tipo: BoatTipo | None = None
    seats: int | None = None
    color: str | None = None
    available: bool | None = None
    note: str | None = None
