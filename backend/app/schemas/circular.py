from datetime import datetime

from pydantic import BaseModel


class CircularCreate(BaseModel):
    subject: str
    body_html: str
    target_ruolo: str | None = None  # null = all, or 'pope', 'paron', 'provin'


class CircularRead(BaseModel):
    id: int
    subject: str
    body_html: str
    target_ruolo: str | None
    sent_by: int | None
    sent_count: int
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
