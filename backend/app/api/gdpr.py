import io
import json
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.attendance import Attendance
from app.models.booking import Booking, BookingParticipant
from app.models.document import MemberDocument
from app.models.fee import Fee
from app.models.gallery import Photo
from app.models.gdpr import GdprRequest
from app.models.invoice import Invoice
from app.models.member import Member
from app.models.user import User

router = APIRouter(prefix="/gdpr", tags=["gdpr"])


class DeleteRequestBody(BaseModel):
    reason: str | None = None
    confirm: bool = False


def _json_default(o):
    if isinstance(o, (datetime,)):
        return o.isoformat()
    if isinstance(o, Decimal):
        return str(o)
    try:
        return str(o)
    except Exception:
        return None


@router.get("/my-data")
def my_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bundle: dict = {
        "user": {
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
        },
        "member": None,
        "fees": [],
        "bookings_as_pope": [],
        "bookings_as_participant": [],
        "attendances": [],
        "documents": [],
        "photos_uploaded": [],
        "invoices": [],
    }

    member = None
    if user.member_id:
        member = db.get(Member, user.member_id)
    if member:
        bundle["member"] = {
            "id": member.id,
            "name": member.name,
            "ruolo": member.ruolo,
            "tessera": member.tessera,
            "email": member.email,
            "phone": member.phone,
            "note": member.note,
            "medical_cert_expiry": member.medical_cert_expiry,
            "fee_paid": member.fee_paid,
            "fee_year": member.fee_year,
            "is_active": member.is_active,
            "created_at": member.created_at,
        }
        # Fees
        fees = db.query(Fee).filter(Fee.member_id == member.id).all()
        bundle["fees"] = [
            {
                "id": f.id,
                "year": f.year,
                "amount": f.amount,
                "paid": f.paid,
                "paid_date": f.paid_date,
                "payment_method": f.payment_method,
                "receipt_number": f.receipt_number,
            }
            for f in fees
        ]
        # Bookings
        bk_pope = db.query(Booking).filter(Booking.pope_id == member.id).all()
        bundle["bookings_as_pope"] = [
            {"id": b.id, "date": b.date, "slot": b.slot, "boat_id": b.boat_id}
            for b in bk_pope
        ]
        bk_part = (
            db.query(Booking)
            .join(BookingParticipant, BookingParticipant.booking_id == Booking.id)
            .filter(BookingParticipant.member_id == member.id)
            .all()
        )
        bundle["bookings_as_participant"] = [
            {"id": b.id, "date": b.date, "slot": b.slot, "boat_id": b.boat_id}
            for b in bk_part
        ]
        # Attendances
        atts = db.query(Attendance).filter(Attendance.member_id == member.id).all()
        bundle["attendances"] = [
            {"id": a.id, "date": getattr(a, "date", None)} for a in atts
        ]
        # Documents
        docs = db.query(MemberDocument).filter(MemberDocument.member_id == member.id).all()
        bundle["documents"] = [
            {"id": d.id, "doc_type": d.doc_type, "filename": d.filename}
            for d in docs
        ]
        # Invoices
        invs = db.query(Invoice).filter(Invoice.member_id == member.id).all()
        bundle["invoices"] = [
            {"id": i.id, "number": i.number, "date": i.date, "amount": i.amount}
            for i in invs
        ]

    # Photos uploaded (by user)
    photos = db.query(Photo).filter(Photo.uploaded_by == user.id).all()
    bundle["photos_uploaded"] = [
        {"id": p.id, "album_id": p.album_id, "filename": p.filename}
        for p in photos
    ]

    content = json.dumps(bundle, default=_json_default, indent=2, ensure_ascii=False)
    buf = io.BytesIO(content.encode("utf-8"))
    headers = {
        "Content-Disposition": f'attachment; filename="my_data_{user.id}.json"'
    }
    return StreamingResponse(buf, media_type="application/json", headers=headers)


@router.post("/delete-request")
async def delete_request(
    body: DeleteRequestBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.confirm:
        raise HTTPException(
            status_code=400,
            detail="Conferma richiesta: imposta confirm=true",
        )
    req = GdprRequest(
        user_id=user.id,
        email_snapshot=user.email,
        reason=body.reason,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify admins (best-effort)
    try:
        from app.api.settings import get_smtp_settings
        from app.services.email import send_email
        from app.services.email_template import render_template

        admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()
        smtp = get_smtp_settings(db)
        vars = {
            "subject": "Richiesta cancellazione dati",
            "body": (
                f"L'utente {user.email} ha richiesto la cancellazione dei propri dati."
                f"<br>Motivo: {body.reason or '-'}"
            ),
        }
        subj, html = render_template(db, "circular", vars)
        if not subj:
            subj = "Richiesta cancellazione dati GDPR"
            html = vars["body"]
        for a in admins:
            if a.email:
                await send_email(
                    to=a.email,
                    subject=subj,
                    body_html=html,
                    smtp_host=smtp.smtp_host,
                    smtp_port=smtp.smtp_port,
                    smtp_user=smtp.smtp_user,
                    smtp_password=smtp.smtp_password,
                    smtp_from=smtp.smtp_from,
                )
    except Exception:
        pass

    return {"id": req.id, "status": req.status}


class GdprRequestRead(BaseModel):
    id: int
    user_id: int | None
    email_snapshot: str
    reason: str | None
    status: str
    processed_by: int | None
    processed_at: datetime | None
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/requests", response_model=list[GdprRequestRead])
def list_requests(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return (
        db.query(GdprRequest)
        .order_by(GdprRequest.created_at.desc())
        .all()
    )


@router.post("/requests/{req_id}/process", response_model=GdprRequestRead)
def process_request(
    req_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    req = db.get(GdprRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Richiesta non trovata")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Richiesta gia' processata")

    target_user = db.get(User, req.user_id) if req.user_id else None
    if target_user:
        member = db.get(Member, target_user.member_id) if target_user.member_id else None
        if member:
            member.name = f"Socio eliminato {member.id}"
            member.email = None
            member.phone = None
            member.tessera = None
            member.note = None
        db.delete(target_user)

    req.status = "processed"
    req.processed_by = admin.id
    req.processed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return req
