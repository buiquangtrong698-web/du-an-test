from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError

if __package__:
    from .database import lifespan
    from .dependencies import (
        AdminMember,
        CurrentMember,
        DbSession,
        get_current_member,
        get_optional_member,
        require_admin,
    )
    from .model import Event, EventRegistration, Member, Notification, Rule
    from .schema import (
        EventCreate,
        EventRead,
        EventUpdate,
        AdminMemberUpdate,
        LoginRequest,
        MemberCreate,
        MemberRead,
        MemberSummaryRead,
        MemberUpdate,
        NotificationRead,
        NotificationUpdate,
        RuleCreate,
        RuleRead,
        RuleUpdate,
    )
    from .security import create_access_token, hash_password, verify_password
    from .services import (
        add_notification,
        ensure_event_capacity,
        local_datetime,
        reject_blank_fields,
        reject_null_fields,
    )
else:
    from database import lifespan
    from dependencies import (
        AdminMember,
        CurrentMember,
        DbSession,
        get_current_member,
        get_optional_member,
        require_admin,
    )
    from model import Event, EventRegistration, Member, Notification, Rule
    from schema import (
        EventCreate,
        EventRead,
        EventUpdate,
        AdminMemberUpdate,
        LoginRequest,
        MemberCreate,
        MemberRead,
        MemberSummaryRead,
        MemberUpdate,
        NotificationRead,
        NotificationUpdate,
        RuleCreate,
        RuleRead,
        RuleUpdate,
    )
    from security import create_access_token, hash_password, verify_password
    from services import (
        add_notification,
        ensure_event_capacity,
        local_datetime,
        reject_blank_fields,
        reject_null_fields,
    )


app = FastAPI(title="steamCam API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).resolve().parents[1]
for directory in ("css", "html", "img", "js"):
    app.mount(f"/{directory}", StaticFiles(directory=ROOT / directory), name=directory)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: MemberCreate, db: DbSession):
    full_name = payload.full_name.strip()
    nickname = payload.nickname.strip()
    if not full_name or not nickname:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Họ tên và biệt danh không được để trống.",
        )
    member = Member(
        username=payload.username,
        full_name=full_name,
        nickname=nickname,
        avatar_url=payload.avatar_url,
        introduction=(payload.introduction or "").strip() or None,
        role="user",
        position="Thành viên",
        password_hash=hash_password(payload.password),
    )
    db.add(member)
    try:
        db.flush()
        add_notification(
            db, "member", "Thành viên mới", f"{member.full_name} vừa tham gia cộng đồng steamCam."
        )
        db.commit()
        db.refresh(member)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tên đăng nhập đã được sử dụng.",
        ) from error
    return {
        "access_token": create_access_token(member.id),
        "token_type": "bearer",
        "member": MemberRead.model_validate(member),
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: DbSession):
    member = db.scalar(select(Member).where(Member.username == payload.username))
    if not member or not member.is_active or not verify_password(
        payload.password, member.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác.",
        )
    return {
        "access_token": create_access_token(member.id),
        "token_type": "bearer",
        "member": MemberRead.model_validate(member),
    }


@app.get("/api/auth/me", response_model=MemberRead)
def read_my_account(member: CurrentMember):
    return member


@app.patch("/api/auth/me", response_model=MemberRead)
def update_my_account(payload: MemberUpdate, member: CurrentMember, db: DbSession):
    reject_null_fields(payload, {"full_name", "nickname"})
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value.strip() if isinstance(value, str) else value)
    if not member.full_name.strip() or (
        member.nickname is not None and not member.nickname.strip()
    ):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Họ tên và biệt danh không được để trống.")
    db.commit()
    db.refresh(member)
    return member


@app.post("/api/auth/logout", dependencies=[Depends(get_current_member)])
def logout():
    return {"message": "Đã đăng xuất. Hãy xóa access token ở ứng dụng."}


@app.get("/api/members", response_model=list[MemberSummaryRead])
def list_members(
    db: DbSession,
    q: str | None = Query(default=None, max_length=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
):
    query = select(Member).where(Member.is_active.is_(True)).order_by(Member.created_at.desc())
    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                Member.full_name.ilike(search),
                Member.nickname.ilike(search),
                Member.username.ilike(search),
            )
        )
    return db.scalars(query.offset(skip).limit(limit)).all()


@app.get("/api/members/featured", response_model=list[MemberSummaryRead])
def list_featured_members(db: DbSession):
    query = (
        select(Member)
        .where(Member.is_active.is_(True), Member.is_featured.is_(True))
        .order_by(Member.created_at.desc(), Member.id.desc())
        .limit(5)
    )
    return db.scalars(query).all()


@app.get(
    "/api/admin/members",
    response_model=list[MemberRead],
    dependencies=[Depends(require_admin)],
)
def list_all_members(
    db: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
):
    query = select(Member).order_by(Member.created_at.desc())
    return db.scalars(query.offset(skip).limit(limit)).all()


@app.patch("/api/admin/members/{member_id}", response_model=MemberRead)
def update_member_access(
    member_id: int,
    payload: AdminMemberUpdate,
    admin: AdminMember,
    db: DbSession,
):
    reject_null_fields(payload, {"role", "position", "is_active", "is_featured"})
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cần cung cấp quyền, chức vụ hoặc trạng thái tài khoản.",
        )

    member = db.get(Member, member_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản thành viên.",
        )

    if values.get("position") == "Trưởng nhóm":
        existing_leader = db.scalar(
            select(Member.id).where(
                Member.position == "Trưởng nhóm",
                Member.id != member.id,
            )
        )
        if existing_leader:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Nhóm chỉ có thể có một trưởng nhóm.",
            )

    new_role = values.get("role", member.role)
    new_is_active = values.get("is_active", member.is_active)
    new_is_featured = values.get("is_featured", member.is_featured)
    if not new_is_active and member.is_featured and "is_featured" not in values:
        values["is_featured"] = False
        new_is_featured = False
    if new_is_featured and not new_is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Chỉ thành viên đang hoạt động mới được chọn nổi bật.",
        )
    if new_is_featured and not member.is_featured:
        featured_count = db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.is_active.is_(True), Member.is_featured.is_(True))
        )
        if featured_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Danh sách chỉ có thể có tối đa 5 thành viên nổi bật.",
            )
    removes_active_admin = (
        member.role == "admin"
        and member.is_active
        and (new_role != "admin" or not new_is_active)
    )
    if removes_active_admin:
        if member.id == admin.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Không thể tự hạ quyền hoặc vô hiệu hóa tài khoản admin đang dùng.",
            )
        active_admin_count = db.scalar(
            select(func.count())
            .select_from(Member)
            .where(Member.role == "admin", Member.is_active.is_(True))
        )
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phải luôn có ít nhất một admin đang hoạt động.",
            )

    for field, value in values.items():
        setattr(member, field, value)
    db.commit()
    db.refresh(member)
    return member


@app.get("/api/rules", response_model=list[RuleRead])
def list_rules(db: DbSession):
    return db.scalars(select(Rule).order_by(Rule.position, Rule.id)).all()


@app.post("/api/rules", response_model=RuleRead, status_code=status.HTTP_201_CREATED)
def create_rule(payload: RuleCreate, member: AdminMember, db: DbSession):
    reject_blank_fields({"title": payload.title, "content": payload.content})
    rule = Rule(
        title=payload.title.strip(),
        content=payload.content.strip(),
        position=payload.position,
        created_by=member.id,
    )
    db.add(rule)
    add_notification(db, "rule", "Quy định mới", f"{rule.title}: {rule.content}")
    db.commit()
    db.refresh(rule)
    return rule


@app.patch(
    "/api/rules/{rule_id}",
    response_model=RuleRead,
    dependencies=[Depends(require_admin)],
)
def update_rule(rule_id: int, payload: RuleUpdate, db: DbSession):
    reject_null_fields(payload, {"title", "content", "position"})
    rule = db.get(Rule, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy quy định.")
    values = payload.model_dump(exclude_unset=True)
    reject_blank_fields(values)
    for field, value in values.items():
        setattr(rule, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(rule)
    return rule


@app.delete(
    "/api/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_rule(rule_id: int, db: DbSession):
    rule = db.get(Rule, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy quy định.")
    db.delete(rule)
    db.commit()


@app.get("/api/events", response_model=list[EventRead])
def list_events(
    db: DbSession,
    member: Member | None = Depends(get_optional_member),
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=50),
    status_filter: str = Query(default="all", alias="status", pattern="^(all|upcoming|past)$"),
):
    query = select(Event).order_by(Event.starts_at)
    now = datetime.now()
    if status_filter == "upcoming":
        query = query.where(Event.starts_at >= now)
    elif status_filter == "past":
        query = query.where(Event.starts_at < now)
    if category:
        query = query.where(Event.category == category)
    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.where(
            or_(Event.title.ilike(search), Event.description.ilike(search), Event.location.ilike(search))
        )
    events = db.scalars(query).all()
    registered_ids: set[int] = set()
    if member and events:
        registered_ids = set(
            db.scalars(
                select(EventRegistration.event_id).where(
                    EventRegistration.member_id == member.id,
                    EventRegistration.event_id.in_([event.id for event in events]),
                )
            ).all()
        )
    return [
        EventRead.model_validate(event).model_copy(update={"is_registered": event.id in registered_ids})
        for event in events
    ]


@app.post("/api/events", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, member: AdminMember, db: DbSession):
    reject_blank_fields(
        {
            "title": payload.title,
            "description": payload.description,
            "category": payload.category,
            "location": payload.location,
        }
    )
    starts_at = local_datetime(payload.starts_at)
    ends_at = local_datetime(payload.ends_at) if payload.ends_at else None
    if starts_at <= datetime.now():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sự kiện phải bắt đầu trong tương lai.")
    if ends_at and ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Thời gian kết thúc phải sau thời gian bắt đầu.")
    values = payload.model_dump()
    values.update(starts_at=starts_at, ends_at=ends_at)
    event = Event(**values, created_by=member.id)
    db.add(event)
    add_notification(
        db,
        "event",
        "Sự kiện mới",
        f'"{event.title}" ({event.category}) vừa được tạo.',
    )
    db.commit()
    db.refresh(event)
    return event


@app.patch(
    "/api/events/{event_id}",
    response_model=EventRead,
    dependencies=[Depends(require_admin)],
)
def update_event(event_id: int, payload: EventUpdate, db: DbSession):
    reject_null_fields(payload, {"title", "description", "category", "starts_at", "location", "capacity"})
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện.")
    values = payload.model_dump(exclude_unset=True)
    reject_blank_fields(values)
    if "capacity" in values:
        ensure_event_capacity(event, values["capacity"])
    if values.get("starts_at") is not None:
        values["starts_at"] = local_datetime(values["starts_at"])
    if values.get("ends_at") is not None:
        values["ends_at"] = local_datetime(values["ends_at"])
    new_start = values.get("starts_at", event.starts_at)
    new_end = values.get("ends_at", event.ends_at)
    if new_end and new_end <= new_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Thời gian kết thúc phải sau thời gian bắt đầu.")
    for field, value in values.items():
        setattr(event, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(event)
    return event


@app.delete(
    "/api/events/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_event(event_id: int, db: DbSession):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện.")
    db.delete(event)
    db.commit()


@app.post("/api/events/{event_id}/registrations", response_model=EventRead)
def register_for_event(event_id: int, member: CurrentMember, db: DbSession):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện.")
    if event.starts_at < datetime.now():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sự kiện đã kết thúc.")
    if db.scalar(
        select(EventRegistration.id).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member.id,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bạn đã đăng ký sự kiện này.",
        )
    registration = EventRegistration(event_id=event_id, member_id=member.id)
    db.add(registration)
    try:
        result = db.execute(
            update(Event)
            .where(Event.id == event_id, Event.attendee_count < Event.capacity)
            .values(attendee_count=Event.attendee_count + 1)
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sự kiện đã đủ số lượng tham gia.")
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bạn đã đăng ký sự kiện này.") from error
    db.refresh(event)
    return EventRead.model_validate(event).model_copy(update={"is_registered": True})


@app.delete("/api/events/{event_id}/registrations", response_model=EventRead)
def cancel_event_registration(event_id: int, member: CurrentMember, db: DbSession):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện.")
    registration = db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member.id,
        )
    )
    if not registration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bạn chưa đăng ký sự kiện này.")
    db.delete(registration)
    event.attendee_count = max(0, event.attendee_count - 1)
    db.commit()
    db.refresh(event)
    return event


@app.get("/api/notifications", response_model=list[NotificationRead])
def list_notifications(member: CurrentMember, db: DbSession, unread_only: bool = False):
    query = select(Notification).where(Notification.recipient_id == member.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    return db.scalars(query.order_by(Notification.created_at.desc(), Notification.id.desc())).all()


@app.patch("/api/notifications/{notification_id}", response_model=NotificationRead)
def update_notification(
    notification_id: int,
    payload: NotificationUpdate,
    member: CurrentMember,
    db: DbSession,
):
    notification = db.get(Notification, notification_id)
    if not notification or notification.recipient_id != member.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo.")
    notification.is_read = payload.is_read
    db.commit()
    db.refresh(notification)
    return notification


@app.post("/api/notifications/read-all")
def mark_notifications_read(member: CurrentMember, db: DbSession):
    db.query(Notification).filter(
        Notification.recipient_id == member.id,
        Notification.is_read.is_(False),
    ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "Đã đánh dấu tất cả thông báo là đã đọc."}


@app.get("/", include_in_schema=False)
def serve_index():
    return RedirectResponse(url="/html/dang_nhap.html")
