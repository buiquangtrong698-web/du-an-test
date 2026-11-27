import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from sqlalchemy import create_engine, event, inspect, text, update
from sqlalchemy.orm import Session, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{(Path(__file__).resolve().parent / 'steamcam.db').as_posix()}",
)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(connection, _):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def initialize_database() -> None:
    if __package__:
        from .model import Base, Member
        from .model.seed import seed_default_rules
    else:
        from model import Base, Member
        from model.seed import seed_default_rules

    Base.metadata.create_all(bind=engine)
    member_columns = {column["name"] for column in inspect(engine).get_columns("members")}
    if "is_featured" not in member_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE members ADD COLUMN is_featured "
                    "BOOLEAN NOT NULL DEFAULT false"
                )
            )
    if "position" not in member_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE members ADD COLUMN position "
                    "VARCHAR(30) NOT NULL DEFAULT 'Thành viên'"
                )
            )
    with SessionLocal() as db:
        db.execute(
            update(Member)
            .where(Member.role.notin_(("user", "admin")))
            .values(role="user")
        )
        seed_default_rules(db)
        db.commit()


@asynccontextmanager
async def lifespan(_: object) -> AsyncIterator[None]:
    initialize_database()
    yield


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
