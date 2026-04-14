from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, SmallInteger, String, Text
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
    available: Mapped[bool] = mapped_column(Boolean, default=True)
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
