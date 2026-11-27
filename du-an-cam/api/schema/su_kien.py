from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1, max_length=50)
    starts_at: datetime
    ends_at: datetime | None = None
    location: str = Field(min_length=1, max_length=255)
    capacity: int = Field(ge=1, le=500)


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = Field(default=None, min_length=1, max_length=255)
    capacity: int | None = Field(default=None, ge=1, le=500)


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    attendee_count: int
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    is_registered: bool = False
