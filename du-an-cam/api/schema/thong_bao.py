from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    recipient_id: int | None = None
    notification_type: str
    title: str
    message: str


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    is_read: bool


class NotificationRead(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_read: bool
    created_at: datetime
