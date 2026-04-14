from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BookingParticipant(Base):
    __tablename__ = "booking_participants"

    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), primary_key=True
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), primary_key=True
    )


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint("date", "slot", "boat_id", name="uq_booking_slot"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    slot: Mapped[str] = mapped_column(
        String(5), nullable=False
    )  # 06:00, 07:30, ...
    boat_id: Mapped[int] = mapped_column(
        ForeignKey("boats.id", ondelete="CASCADE"), nullable=False
    )
    pope_id: Mapped[int] = mapped_column(
        ForeignKey("members.id"), nullable=False
    )
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    boat = relationship("Boat", back_populates="bookings")
    pope = relationship("Member", back_populates="bookings_as_pope")
    participants = relationship(
        "Member", secondary="booking_participants", lazy="selectin"
    )
