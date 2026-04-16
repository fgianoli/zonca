from datetime import datetime

from pydantic import BaseModel


class AppSettingRead(BaseModel):
    key: str
    value: str
    description: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AppSettingWrite(BaseModel):
    value: str


class SmtpSettings(BaseModel):
    """Grouped view of all SMTP settings for the frontend."""

    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    reminder_days_before: int = 30


class SmtpSettingsUpdate(BaseModel):
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    reminder_days_before: int | None = None
