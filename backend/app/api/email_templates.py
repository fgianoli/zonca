from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.email_template import EmailTemplate
from app.models.user import User
from app.schemas.email_template import (
    EmailTemplatePreview,
    EmailTemplateRead,
    EmailTemplateUpdate,
)
from app.services.email_template import render_template, seed_defaults

router = APIRouter(prefix="/email-templates", tags=["email-templates"])


@router.get("/", response_model=list[EmailTemplateRead])
def list_templates(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(EmailTemplate).order_by(EmailTemplate.key).all()


@router.get("/{key}", response_model=EmailTemplateRead)
def get_template(
    key: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    tmpl = db.query(EmailTemplate).filter(EmailTemplate.key == key).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return tmpl


@router.patch("/{key}", response_model=EmailTemplateRead)
def update_template(
    key: str,
    body: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    tmpl = db.query(EmailTemplate).filter(EmailTemplate.key == key).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template non trovato")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(tmpl, k, v)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.post("/seed")
def seed(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    inserted = seed_defaults(db)
    return {"inserted": inserted}


@router.post("/{key}/preview")
def preview(
    key: str,
    body: EmailTemplatePreview,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    subject, html = render_template(db, key, body.vars)
    if not subject and not html:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"subject": subject, "body_html": html}
