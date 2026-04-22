"""Invoice (ricevuta) PDF generator using reportlab."""

from pathlib import Path

from app.models.invoice import Invoice


HEADER_ORG = "SCUOLA PADOVANA DI VOGA ALLA VENETA 'VITTORIO ZONCA' ASD"
HEADER_ADDR = "Golena Bastione Arena, Corso Garibaldi 41, 35131 Padova"
HEADER_CF = "C.F. 92221390286"
FOOTER = "Documento emesso da ASD ex art. 148 TUIR - esente da IVA"


def generate_invoice_pdf(invoice: Invoice, out_path: Path) -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    out_path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(out_path), pagesize=A4)
    w, h = A4

    # Header
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, h - 25 * mm, HEADER_ORG)
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, h - 31 * mm, HEADER_ADDR)
    c.drawString(20 * mm, h - 36 * mm, HEADER_CF)

    # Title
    c.setFont("Helvetica-Bold", 22)
    c.drawRightString(w - 20 * mm, h - 28 * mm, "RICEVUTA")
    c.setFont("Helvetica", 11)
    c.drawRightString(w - 20 * mm, h - 36 * mm, f"N. {invoice.number}")
    c.drawRightString(w - 20 * mm, h - 42 * mm, f"Data: {invoice.date.strftime('%d/%m/%Y')}")

    # Recipient box
    y = h - 60 * mm
    c.setStrokeColorRGB(0.2, 0.2, 0.2)
    c.rect(20 * mm, y - 30 * mm, w - 40 * mm, 30 * mm, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(22 * mm, y - 5 * mm, "Destinatario:")
    c.setFont("Helvetica", 11)
    c.drawString(22 * mm, y - 12 * mm, invoice.recipient_name or "")
    if invoice.recipient_fiscal_code:
        c.setFont("Helvetica", 9)
        c.drawString(22 * mm, y - 18 * mm, f"C.F./P.IVA: {invoice.recipient_fiscal_code}")
    if invoice.recipient_address:
        c.setFont("Helvetica", 9)
        c.drawString(22 * mm, y - 24 * mm, invoice.recipient_address[:90])

    # Description
    y2 = y - 45 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y2, "Descrizione:")
    c.setFont("Helvetica", 10)
    text = c.beginText(20 * mm, y2 - 6 * mm)
    for line in (invoice.description or "").split("\n"):
        text.textLine(line[:100])
    c.drawText(text)

    # Amount
    y3 = y2 - 35 * mm
    c.setFont("Helvetica-Bold", 18)
    c.drawString(20 * mm, y3, f"Importo: EUR {invoice.amount:.2f}")

    # Payment method
    if invoice.payment_method:
        c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y3 - 10 * mm, f"Modalita' di pagamento: {invoice.payment_method}")

    # Footer
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(w / 2, 20 * mm, FOOTER)

    c.showPage()
    c.save()
