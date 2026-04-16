import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.document import MemberDocument
from app.models.member import Member
from app.models.user import User
from app.schemas.document import DocumentRead, DocumentType

router = APIRouter(prefix="/members/{member_id}/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads/documents")
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def _can_access(current_user: User, member_id: int) -> bool:
    """Admin puo' sempre. Il socio puo' accedere solo ai propri documenti."""
    if current_user.role == "admin":
        return True
    return current_user.member_id == member_id


@router.post("/", response_model=DocumentRead, status_code=201)
async def upload_document(
    member_id: int,
    file: UploadFile,
    doc_type: DocumentType = Form(...),
    expiry_date: str | None = Form(None),
    note: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_access(current_user, member_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Puoi caricare solo i tuoi documenti",
        )

    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Tipo file non ammesso. Ammessi: PDF, JPEG, PNG",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File troppo grande (max 10 MB)")

    # Create member-specific directory
    member_dir = UPLOAD_DIR / str(member_id)
    member_dir.mkdir(parents=True, exist_ok=True)

    # Save file with unique name
    ext = Path(file.filename).suffix if file.filename else ".pdf"
    filename = f"{doc_type.value}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = member_dir / filename
    filepath.write_bytes(content)

    # Parse expiry_date if provided
    parsed_expiry = None
    if expiry_date:
        from datetime import date as date_type

        try:
            parsed_expiry = date_type.fromisoformat(expiry_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Formato data scadenza non valido (usare YYYY-MM-DD)",
            )

    doc = MemberDocument(
        member_id=member_id,
        doc_type=doc_type.value,
        filename=filename,
        original_name=file.filename,
        expiry_date=parsed_expiry,
        note=note,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/", response_model=list[DocumentRead])
def list_documents(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_access(current_user, member_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato",
        )

    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")

    docs = (
        db.query(MemberDocument)
        .filter(MemberDocument.member_id == member_id)
        .order_by(MemberDocument.created_at.desc())
        .all()
    )
    return docs


@router.get("/{doc_id}/download")
def download_document(
    member_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _can_access(current_user, member_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato",
        )

    doc = db.get(MemberDocument, doc_id)
    if not doc or doc.member_id != member_id:
        raise HTTPException(status_code=404, detail="Documento non trovato")

    filepath = UPLOAD_DIR / str(member_id) / doc.filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File non trovato su disco")

    download_name = doc.original_name or doc.filename
    return FileResponse(
        path=str(filepath),
        filename=download_name,
        media_type="application/octet-stream",
    )


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    member_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    doc = db.get(MemberDocument, doc_id)
    if not doc or doc.member_id != member_id:
        raise HTTPException(status_code=404, detail="Documento non trovato")

    # Remove file from disk
    filepath = UPLOAD_DIR / str(member_id) / doc.filename
    if filepath.exists():
        filepath.unlink()

    db.delete(doc)
    db.commit()
