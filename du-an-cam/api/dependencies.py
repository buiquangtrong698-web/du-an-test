from typing import Annotated, TypeAlias

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

if __package__:
    from .database import get_db
    from .model import Member
    from .security import read_access_token
else:
    from database import get_db
    from model import Member
    from security import read_access_token


DbSession: TypeAlias = Annotated[Session, Depends(get_db)]


def get_optional_member(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> Member | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    member_id = read_access_token(token) if scheme.lower() == "bearer" else None
    member = db.get(Member, member_id) if member_id else None
    return member if member and member.is_active else None


def get_current_member(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> Member:
    member = get_optional_member(authorization, db)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vui lòng đăng nhập.",
        )
    return member


CurrentMember: TypeAlias = Annotated[Member, Depends(get_current_member)]
OptionalMember: TypeAlias = Annotated[Member | None, Depends(get_optional_member)]


def require_admin(member: CurrentMember) -> Member:
    if member.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ quản trị viên mới được thực hiện thao tác này.",
        )
    return member


AdminMember: TypeAlias = Annotated[Member, Depends(require_admin)]
