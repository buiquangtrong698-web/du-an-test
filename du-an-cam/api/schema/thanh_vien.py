from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MemberPosition = Literal["Thành viên", "Trưởng nhóm", "Phó nhóm"]


class MemberBase(BaseModel):
    username: str
    email: str | None = None
    full_name: str
    nickname: str | None = None
    avatar_url: str | None = None
    role: Literal["user", "admin"] = "user"
    position: MemberPosition = "Thành viên"
    is_featured: bool = False
    introduction: str | None = None


class MemberCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    nickname: str = Field(min_length=1, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=2_000_000)
    introduction: str | None = Field(default=None, max_length=5000)


class LoginRequest(BaseModel):
    username: str
    password: str


class MemberUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    nickname: str | None = Field(default=None, min_length=1, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=2_000_000)
    introduction: str | None = Field(default=None, max_length=5000)


class AdminMemberUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "admin"] | None = None
    position: MemberPosition | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class MemberRead(MemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MemberSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    nickname: str | None
    avatar_url: str | None
    role: str
    position: MemberPosition
    is_featured: bool
    introduction: str | None
