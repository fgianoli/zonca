from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class DocumentType(str, Enum):
    privacy = "privacy"
    assicurazione = "assicurazione"
    tessera_uisp = "tessera_uisp"
    tessera_fic = "tessera_fic"
    altro = "altro"


class DocumentRead(BaseModel):
    id: int
    member_id: int
    doc_type: DocumentType
    filename: str
    original_name: str | None
    expiry_date: date | None
    note: str | None
    uploaded_by: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
