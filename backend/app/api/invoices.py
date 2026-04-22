from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.fee import Fee
from app.models.invoice import Invoice
from app.models.member import Member
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceNumberInfo, InvoiceRead
from app.services.invoice_pdf import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["invoices"])

PDF_DIR = Path("uploads/invoices")


def _next_number_for_year(db: Session, year: int) -> str:
    prefix = f"{year}/"
    existing = (
        db.query(Invoice)
        .filter(Invoice.number.like(f"{prefix}%"))
        .all()
    )
    max_n = 0
    for inv in existing:
        try:
            n = int(inv.number.split("/", 1)[1])
            max_n = max(max_n, n)
        except (ValueError, IndexError):
            continue
    return f"{year}/{max_n + 1:03d}"


def _to_read(inv: Invoice) -> InvoiceRead:
    data = {
        "id": inv.id,
        "number": inv.number,
        "date": inv.date,
        "recipient_name": inv.recipient_name,
        "recipient_fiscal_code": inv.recipient_fiscal_code,
        "recipient_address": inv.recipient_address,
        "amount": inv.amount,
        "description": inv.description,
        "payment_method": inv.payment_method,
        "fee_id": inv.fee_id,
        "finance_record_id": inv.finance_record_id,
        "member_id": inv.member_id,
        "pdf_path": inv.pdf_path,
        "created_by": inv.created_by,
        "created_at": inv.created_at,
        "member_name": inv.member.name if inv.member else None,
    }
    return InvoiceRead(**data)


@router.get("/", response_model=list[InvoiceRead])
def list_invoices(
    year: int | None = Query(None),
    member_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Invoice)
    if year is not None:
        q = q.filter(Invoice.number.like(f"{year}/%"))
    if member_id is not None:
        q = q.filter(Invoice.member_id == member_id)
    return [_to_read(i) for i in q.order_by(Invoice.date.desc(), Invoice.id.desc()).all()]


@router.get("/next-number", response_model=InvoiceNumberInfo)
def next_number(
    year: int = Query(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return InvoiceNumberInfo(year=year, next_number=_next_number_for_year(db, year))


@router.post("/", response_model=InvoiceRead, status_code=201)
def create_invoice(
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
):
    year = body.date.year
    number = _next_number_for_year(db, year)

    inv = Invoice(
        number=number,
        date=body.date,
        recipient_name=body.recipient_name,
        recipient_fiscal_code=body.recipient_fiscal_code,
        recipient_address=body.recipient_address,
        amount=body.amount,
        description=body.description,
        payment_method=body.payment_method,
        fee_id=body.fee_id,
        finance_record_id=body.finance_record_id,
        member_id=body.member_id,
        created_by=current.id,
    )
    db.add(inv)
    db.flush()

    # Generate PDF
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    safe_num = number.replace("/", "_")
    pdf_path = PDF_DIR / f"ricevuta_{safe_num}.pdf"
    try:
        generate_invoice_pdf(inv, pdf_path)
        inv.pdf_path = str(pdf_path).replace("\\", "/")
    except ImportError:
        raise HTTPException(status_code=500, detail="Libreria reportlab non installata")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {e}")

    db.commit()
    db.refresh(inv)
    return _to_read(inv)


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Ricevuta non trovata")
    return _to_read(inv)


@router.get("/{invoice_id}/pdf")
def download_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Ricevuta non trovata")
    if not inv.pdf_path or not Path(inv.pdf_path).exists():
        raise HTTPException(status_code=404, detail="PDF non disponibile")
    safe_num = inv.number.replace("/", "_")
    return FileResponse(
        path=inv.pdf_path,
        filename=f"ricevuta_{safe_num}.pdf",
        media_type="application/pdf",
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Ricevuta non trovata")
    if inv.pdf_path:
        fp = Path(inv.pdf_path)
        if fp.exists():
            try:
                fp.unlink()
            except OSError:
                pass
    db.delete(inv)
    db.commit()


@router.post("/from-fee/{fee_id}", response_model=InvoiceRead, status_code=201)
def create_from_fee(
    fee_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
):
    from datetime import date as _today

    fee = db.get(Fee, fee_id)
    if not fee:
        raise HTTPException(status_code=404, detail="Quota non trovata")
    member = db.get(Member, fee.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Socio non trovato")

    inv_date = fee.paid_date or _today.today()
    year = inv_date.year
    number = _next_number_for_year(db, year)

    inv = Invoice(
        number=number,
        date=inv_date,
        recipient_name=member.name,
        recipient_fiscal_code=None,
        recipient_address=None,
        amount=fee.amount,
        description=f"Quota associativa anno {fee.year}",
        payment_method=fee.payment_method,
        fee_id=fee.id,
        member_id=member.id,
        created_by=current.id,
    )
    db.add(inv)
    db.flush()

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    safe_num = number.replace("/", "_")
    pdf_path = PDF_DIR / f"ricevuta_{safe_num}.pdf"
    try:
        generate_invoice_pdf(inv, pdf_path)
        inv.pdf_path = str(pdf_path).replace("\\", "/")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {e}")

    db.commit()
    db.refresh(inv)
    return _to_read(inv)
