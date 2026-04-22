from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.crew import Crew, CrewMember
from app.models.member import Member
from app.models.user import User
from app.schemas.crew import CrewCreate, CrewRead, CrewUpdate

router = APIRouter(prefix="/crews", tags=["crews"])


@router.get("/", response_model=list[CrewRead])
def list_crews(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return (
        db.query(Crew)
        .filter(Crew.is_active == True)
        .order_by(Crew.name)
        .all()
    )


@router.get("/{crew_id}", response_model=CrewRead)
def get_crew(
    crew_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    crew = db.get(Crew, crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="Equipaggio non trovato")
    return crew


@router.post("/", response_model=CrewRead, status_code=201)
def create_crew(
    body: CrewCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    crew = Crew(
        name=body.name,
        description=body.description,
        default_slot=body.default_slot,
        pope_id=body.pope_id,
    )
    db.add(crew)
    db.flush()

    for mid in body.member_ids:
        if not db.get(Member, mid):
            raise HTTPException(status_code=404, detail=f"Socio {mid} non trovato")
        db.add(CrewMember(crew_id=crew.id, member_id=mid))

    db.commit()
    db.refresh(crew)
    return crew


@router.patch("/{crew_id}", response_model=CrewRead)
def update_crew(
    crew_id: int,
    body: CrewUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    crew = db.get(Crew, crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="Equipaggio non trovato")

    data = body.model_dump(exclude_unset=True)
    member_ids = data.pop("member_ids", None)
    for k, v in data.items():
        setattr(crew, k, v)

    if member_ids is not None:
        db.query(CrewMember).filter(CrewMember.crew_id == crew_id).delete()
        for mid in member_ids:
            if not db.get(Member, mid):
                raise HTTPException(status_code=404, detail=f"Socio {mid} non trovato")
            db.add(CrewMember(crew_id=crew_id, member_id=mid))

    db.commit()
    db.refresh(crew)
    return crew


@router.delete("/{crew_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crew(
    crew_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    crew = db.get(Crew, crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="Equipaggio non trovato")
    crew.is_active = False
    db.commit()
