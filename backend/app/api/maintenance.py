from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.boat import Boat
from app.models.finance import FinanceRecord
from app.models.maintenance import Maintenance
from app.models.user import User
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceRead,
    MaintenanceUpdate,
)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _to_read(m: Maintenance) -> dict:
    return {
        "id": m.id,
        "boat_id": m.boat_id,
        "date": m.date,
        "description": m.description,
        "cost": m.cost,
        "performed_by": m.performed_by,
        "next_check_date": m.next_check_date,
        "finance_record_id": m.finance_record_id,
        "created_by": m.created_by,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
        "boat_name": m.boat.name if m.boat else None,
        "boat_tipo": m.boat.tipo if m.boat else None,
    }


@router.get("/", response_model=list[MaintenanceRead])
def list_maintenance(
    boat_id: int | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Maintenance).options(joinedload(Maintenance.boat))
    if boat_id:
        q = q.filter(Maintenance.boat_id == boat_id)
    if date_from:
        q = q.filter(Maintenance.date >= date_from)
    if date_to:
        q = q.filter(Maintenance.date <= date_to)
    items = q.order_by(Maintenance.date.desc()).all()
    return [_to_read(m) for m in items]


@router.get("/boat/{boat_id}", response_model=list[MaintenanceRead])
def list_by_boat(
    boat_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    items = (
        db.query(Maintenance)
        .options(joinedload(Maintenance.boat))
        .filter(Maintenance.boat_id == boat_id)
        .order_by(Maintenance.date.desc())
        .all()
    )
    return [_to_read(m) for m in items]


@router.post("/", response_model=MaintenanceRead, status_code=status.HTTP_201_CREATED)
def create_maintenance(
    body: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    boat = db.get(Boat, body.boat_id)
    if not boat:
        raise HTTPException(status_code=404, detail="Barca non trovata")

    data = body.model_dump()
    create_fr = data.pop("create_finance_record", False)

    m = Maintenance(**data, created_by=current_user.id)
    db.add(m)
    db.flush()

    if create_fr and m.cost and m.cost > 0:
        fr = FinanceRecord(
            date=m.date,
            type="uscita",
            amount=m.cost,
            category="manutenzione",
            description=f"Manutenzione {boat.name}: {m.description[:80]}",
            created_by=current_user.id,
        )
        db.add(fr)
        db.flush()
        m.finance_record_id = fr.id

    db.commit()
    db.refresh(m)
    return _to_read(m)


@router.patch("/{maintenance_id}", response_model=MaintenanceRead)
def update_maintenance(
    maintenance_id: int,
    body: MaintenanceUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    m = db.get(Maintenance, maintenance_id)
    if not m:
        raise HTTPException(status_code=404, detail="Manutenzione non trovata")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return _to_read(m)


@router.delete("/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    m = db.get(Maintenance, maintenance_id)
    if not m:
        raise HTTPException(status_code=404, detail="Manutenzione non trovata")
    db.delete(m)
    db.commit()
