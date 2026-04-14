from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    admin = "admin"
    pope = "pope"
    socio = "socio"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.socio
    member_id: int | None = None


class UserRead(BaseModel):
    id: int
    email: str
    role: UserRole
    member_id: int | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: UserRole | None = None
    member_id: int | None = None
    is_active: bool | None = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
