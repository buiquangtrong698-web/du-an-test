from sqlalchemy import select
from sqlalchemy.orm import Session

from .quy_dinh import Rule


def seed_default_rules(db: Session) -> None:
    if db.scalar(select(Rule.id).limit(1)) is not None:
        return

    db.add_all(
        [
            Rule(
                title="Tôn trọng mọi thành viên",
                content="Giao tiếp lịch sự, không công kích cá nhân, phân biệt vùng miền, giới tính hoặc tôn giáo.",
                position=0,
            ),
            Rule(
                title="Không spam hoặc quảng cáo",
                content="Không gửi tin nhắn trùng lặp, chèn link quảng cáo hoặc tự quảng bá khi chưa được phép.",
                position=1,
            ),
            Rule(
                title="Chia sẻ nội dung phù hợp",
                content="Đăng bài đúng chủ đề, ghi rõ nguồn khi trích dẫn và không chia sẻ thông tin vi phạm bản quyền.",
                position=2,
            ),
            Rule(
                title="Bảo vệ thông tin cá nhân",
                content="Không công khai số điện thoại, địa chỉ, tài khoản ngân hàng hoặc thông tin nhạy cảm của người khác.",
                position=3,
            ),
        ]
    )
