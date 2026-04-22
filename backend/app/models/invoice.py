from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    recipient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    recipient_fiscal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recipient_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fee_id: Mapped[int | None] = mapped_column(
        ForeignKey("fees.id", ondelete="SET NULL"), nullable=True
    )
    finance_record_id: Mapped[int | None] = mapped_column(
        ForeignKey("finance_records.id", ondelete="SET NULL"), nullable=True
    )
    member_id: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    member = relationship("Member", foreign_keys=[member_id])
