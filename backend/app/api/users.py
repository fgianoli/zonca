"""Admin-only user management: list, create, update role, reset password, disable."""
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserRole, UserUpdate
from app.services.auth import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])


# ── Schemas locali ─────────────────────────────────────


class PasswordReset(BaseModel):
    """Set password (admin) — password facoltativa: se assente ne genero una casuale."""

    new_password: str | None = None


class PasswordResetResponse(BaseModel):
    new_password: str  # viene restituita in chiaro, SOLO una volta


class PasswordChangeSelf(BaseModel):
    """Cambio password personale - richiede la vecchia."""

    current_password: str
    new_password: str


def _generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ── Endpoints ──────────────────────────────────────────


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.email).all()


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return user


@router.post("/", response_model=UserRead, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email già registrata",
        )
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        member_id=body.member_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    # Non permettere di disattivarsi da soli o di cambiare il proprio ruolo da admin
    if user.id == current_admin.id:
        if body.is_active is False:
            raise HTTPException(
                status_code=400, detail="Non puoi disattivare te stesso"
            )
        if body.role is not None and body.role != "admin":
            raise HTTPException(
                status_code=400,
                detail="Non puoi declassare te stesso da admin",
            )

    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(user, key, val)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    db.delete(user)
    db.commit()


@router.post("/{user_id}/reset-password", response_model=PasswordResetResponse)
def reset_password(
    user_id: int,
    body: PasswordReset,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin imposta una nuova password. Se non fornita, ne genera una casuale."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    new_password = body.new_password or _generate_password()
    if len(new_password) < 6:
        raise HTTPException(
            status_code=400, detail="Password deve essere di almeno 6 caratteri"
        )

    user.password_hash = hash_password(new_password)
    db.commit()
    return PasswordResetResponse(new_password=new_password)


@router.post("/me/change-password", status_code=200)
def change_own_password(
    body: PasswordChangeSelf,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Utente cambia la propria password fornendo quella vecchia."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password attuale non corretta",
        )
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="La nuova password deve essere di almeno 6 caratteri",
        )
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password aggiornata"}
