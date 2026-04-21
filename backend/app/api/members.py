import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.member import Member
from app.models.user import User
from app.schemas.member import MemberCreate, MemberRead, MemberUpdate

router = APIRouter(prefix="/members", tags=["members"])

UPLOAD_DIR = Path("uploads/medical_certs")
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/", response_model=list[MemberRead])
def list_members(
    ruolo: str | None = Query(None),
    active_only: bool = Query(True),
    expired_cert: bool | None = Query(None, description="Filtra per certificato scaduto"),
    fee_unpaid: bool | None = Query(None, description="Filtra per quota non pagata"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Member).options(selectinload(Member.fees))
    if active_only:
        q = q.filter(Member.is_active == True)
    if ruolo:
        q = q.filter(Member.ruolo == ruolo)
    if expired_cert is True:
        from datetime import date

        q = q.filter(
            (Member.medical_cert_expiry < date.today())
            | (Member.medical_cert_expiry == None)
        )
    if fee_unpaid is True:
        q = q.filter(Member.fee_paid == False)
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

    data = body.model_dump(exclude_unset=True)

    # Se viene aggiornata la scadenza certificato, resetta il flag reminded
    if "medical_cert_expiry" in data:
        data["medical_cert_reminded"] = False

    for key, val in data.items():
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


# ── Upload certificato medico ────────────────────────────────────────


def _can_upload_for_member(current_user: User, member_id: int) -> bool:
    """Admin può sempre. Il socio può uploadare solo il proprio."""
    if current_user.role == "admin":
        return True
    return current_user.member_id == member_id


@router.post("/{member_id}/medical-cert", response_model=MemberRead)
async def upload_medical_cert(
    member_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_upload_for_member(current_user, member_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Puoi caricare solo il tuo certificato medico",
        )

    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo file non ammesso. Ammessi: PDF, JPEG, PNG",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File troppo grande (max 10 MB)")

    # Crea directory se non esiste
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Cancella file precedente se esiste
    if member.medical_cert_file:
        old_path = UPLOAD_DIR / member.medical_cert_file
        if old_path.exists():
            old_path.unlink()

    # Salva il nuovo file
    ext = Path(file.filename).suffix if file.filename else ".pdf"
    filename = f"{member_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)

    member.medical_cert_file = filename
    member.medical_cert_reminded = False
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}/medical-cert")
def download_medical_cert(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi.responses import FileResponse

    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")
    if not member.medical_cert_file:
        raise HTTPException(status_code=404, detail="Nessun certificato caricato")

    # Socio può scaricare solo il proprio
    if current_user.role != "admin" and current_user.member_id != member_id:
        raise HTTPException(status_code=403, detail="Accesso negato")

    filepath = UPLOAD_DIR / member.medical_cert_file
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File non trovato")

    return FileResponse(
        path=str(filepath),
        filename=f"certificato_medico_{member.name.replace(' ', '_')}{filepath.suffix}",
        media_type="application/octet-stream",
    )
