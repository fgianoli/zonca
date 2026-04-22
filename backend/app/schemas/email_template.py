from datetime import datetime

from pydantic import BaseModel


class EmailTemplateRead(BaseModel):
    id: int
    key: str
    name: str
    subject: str
    body_html: str
    available_vars: str | None
    is_system: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmailTemplateUpdate(BaseModel):
    subject: str | None = None
    body_html: str | None = None


class EmailTemplatePreview(BaseModel):
    vars: dict = {}
