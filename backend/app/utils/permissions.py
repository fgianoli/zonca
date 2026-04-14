from functools import wraps

from fastapi import HTTPException, status

from app.models.user import User


def require_roles(*roles: str):
    """Dependency-compatible role checker for FastAPI."""

    def checker(current_user: User) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Richiesto ruolo: {', '.join(roles)}",
            )
        return current_user

    return checker
