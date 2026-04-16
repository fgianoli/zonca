from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, SmallInteger, String, Text
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Boat(Base):
    __tablename__ = "boats"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # mascareta, sandolo-w, sandolo-4, gondolino-4, caorlina-6, altro
    seats: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=2)
    color: Mapped[str] = mapped_column(String(7), default="#2d7d9a")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="attiva"
    )  # attiva, manutenzione, fuori_servizio
    maintenance_reason: Mapped[str | None] = mapped_column(Text)
    maintenance_until: Mapped[date | None] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    bookings = relationship("Booking", back_populates="boat")
    attendances = relationship("Attendance", back_populates="boat")

    @hybrid_property
    def available(self) -> bool:
        return self.status == "attiva"
