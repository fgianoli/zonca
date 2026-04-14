from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.member import Member
from app.models.user import User
from app.schemas.member import MemberCreate, MemberRead, MemberUpdate

router = APIRouter(prefix="/members", tags=["members"])


@router.get("/", response_model=list[MemberRead])
def list_members(
    ruolo: str | None = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Member)
    if active_only:
        q = q.filter(Member.is_active == True)
    if ruolo:
        q = q.filter(Member.ruolo == ruolo)
    return q.order_by(Member.name).all()


@router.get("/{member_id}", response_model=MemberRead)
def get_member(
    member_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    return member


@router.post("/", response_model=MemberRead, status_code=201)
def create_member(
    body: MemberCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    member = Member(**body.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.patch("/{member_id}", response_model=MemberRead)
def update_member(
    member_id: int,
    body: MemberUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(member, key, val)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=204)
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    member.is_active = False  # soft delete
    db.commit()
