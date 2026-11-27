from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RuleBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1)
    position: int = 0


class RuleCreate(RuleBase):
    pass


class RuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    content: str | None = Field(default=None, min_length=1)
    position: int | None = None


class RuleRead(RuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: int | None
    created_at: datetime
    updated_at: datetime
