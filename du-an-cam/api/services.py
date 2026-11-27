from datetime import datetime

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

if __package__:
    from .model import Event, Member, Notification
else:
    from model import Event, Member, Notification


def reject_null_fields(payload: BaseModel, fields: set[str]) -> None:
    invalid = fields.intersection(payload.model_fields_set)
    if any(getattr(payload, field) is None for field in invalid):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Các trường sau không được để trống: {', '.join(sorted(invalid))}.",
        )


def reject_blank_fields(values: dict[str, object]) -> None:
    if any(isinstance(value, str) and not value.strip() for value in values.values()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Các trường văn bản không được để trống.",
        )


def local_datetime(value: datetime) -> datetime:
    return value.astimezone().replace(tzinfo=None) if value.tzinfo else value


def ensure_event_capacity(event: Event, capacity: int) -> None:
    if capacity < event.attendee_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Số chỗ không thể thấp hơn số người đã đăng ký.",
        )


def add_notification(db: Session, notification_type: str, title: str, message: str) -> None:
    recipients = db.scalars(select(Member.id).where(Member.is_active.is_(True))).all()
    db.add_all(
        [
            Notification(
                recipient_id=recipient_id,
                notification_type=notification_type,
                title=title,
                message=message,
            )
            for recipient_id in recipients
        ]
    )
