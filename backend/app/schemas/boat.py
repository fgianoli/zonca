from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class BoatTipo(str, Enum):
    mascareta = "mascareta"
    sandolo_w = "sandolo-w"
    sandolo_4 = "sandolo-4"
    gondolino_4 = "gondolino-4"
    caorlina_6 = "caorlina-6"
    altro = "altro"


class BoatStatus(str, Enum):
    attiva = "attiva"
    manutenzione = "manutenzione"
    fuori_servizio = "fuori_servizio"


class BoatCreate(BaseModel):
    name: str
    tipo: BoatTipo
    seats: int = 2
    color: str = "#2d7d9a"
    status: BoatStatus = BoatStatus.attiva
    maintenance_reason: str | None = None
    maintenance_until: date | None = None
    note: str | None = None


class BoatRead(BaseModel):
    id: int
    name: str
    tipo: BoatTipo
    seats: int
    color: str
    status: BoatStatus
    maintenance_reason: str | None
    maintenance_until: date | None
    available: bool
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BoatUpdate(BaseModel):
    name: str | None = None
    tipo: BoatTipo | None = None
    seats: int | None = None
    color: str | None = None
    status: BoatStatus | None = None
    maintenance_reason: str | None = None
    maintenance_until: date | None = None
    note: str | None = None
