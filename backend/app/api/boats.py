from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.boat import Boat
from app.models.user import User
from app.schemas.boat import BoatCreate, BoatRead, BoatStatus, BoatUpdate

router = APIRouter(prefix="/boats", tags=["boats"])


@router.get("/", response_model=list[BoatRead])
def list_boats(
    available_only: bool = Query(False),
    status_filter: BoatStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Boat)
    if status_filter:
        q = q.filter(Boat.status == status_filter.value)
    elif available_only:
        q = q.filter(Boat.status == "attiva")
    return q.order_by(Boat.tipo, Boat.name).all()


@router.get("/{boat_id}", response_model=BoatRead)
def get_boat(
    boat_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    boat = db.get(Boat, boat_id)
    if not boat:
        raise HTTPException(status_code=404, detail="Barca non trovata")
    return boat


@router.post("/", response_model=BoatRead, status_code=201)
def create_boat(
    body: BoatCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    data = body.model_dump()
    # If status is attiva, clear maintenance fields
    if data.get("status") == "attiva":
        data["maintenance_reason"] = None
        data["maintenance_until"] = None
    boat = Boat(**data)
    db.add(boat)
    db.commit()
    db.refresh(boat)
    return boat


@router.patch("/{boat_id}", response_model=BoatRead)
def update_boat(
    boat_id: int,
    body: BoatUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    boat = db.get(Boat, boat_id)
    if not boat:
        raise HTTPException(status_code=404, detail="Barca non trovata")
    data = body.model_dump(exclude_unset=True)
    # When status changes to 'attiva', clear maintenance fields
    if data.get("status") == "attiva":
        data["maintenance_reason"] = None
        data["maintenance_until"] = None
    for key, val in data.items():
        setattr(boat, key, val)
    db.commit()
    db.refresh(boat)
    return boat


@router.delete("/{boat_id}", status_code=204)
def delete_boat(
    boat_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    boat = db.get(Boat, boat_id)
    if not boat:
        raise HTTPException(status_code=404, detail="Barca non trovata")
    db.delete(boat)
    db.commit()
