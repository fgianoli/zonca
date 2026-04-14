from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, status

from app.services.email import send_email

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


RECIPIENT = "scuolazonca@gmail.com"


@router.post("/", status_code=202)
async def send_contact(body: ContactForm):
    html = f"""
    <h2>Nuovo messaggio dal sito Remiera Zonca</h2>
    <p><strong>Da:</strong> {body.name} &lt;{body.email}&gt;</p>
    <p><strong>Oggetto:</strong> {body.subject}</p>
    <hr>
    <p>{body.message.replace(chr(10), '<br>')}</p>
    """

    ok = await send_email(
        to=RECIPIENT,
        subject=f"[Remiera Zonca] {body.subject}",
        body_html=html,
    )

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Impossibile inviare l'email. Riprova più tardi.",
        )

    return {"detail": "Messaggio inviato"}
