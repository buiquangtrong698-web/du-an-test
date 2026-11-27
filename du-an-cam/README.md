<!-- 
- chức năng 1 : đăng nhâp và đăng ký
    gồm các phần sau :
    + phần đăng nhập
    + đăng ký : nhập tên đăng nhập và mật khẩu 
- chức năng 2 : trang chủ
    gồm các phần như sau :
    + giới thiệu nhóm
    + giới thiệu chức năng thành viên
    + giới thiệu chúcw năng quy định nhóm
    + kêu gọi tham gia nhóm mess và dicord
- chức năng 3 : quy định nhóm
    gồm các phần sau :
    + nội dung từng quy định 
    + thêm , sửa xóa quy định 
- chức năng 4 :thành viên
    gồm các phần :
    + thành viên tiêu biểu
    + danh sách thành viên 
- chức năng 5 : giao lưu
    gồm : lời kêu gọi vô nhóm giao lưu và link nhóm mess và discord
- chức năng 6 : tài khoản
    + thông tin tài khoản và phần đăng xuất tài khoản
- chức năng 7 : sự kiện
    + xem, tìm kiếm và lọc sự kiện
    + tạo sự kiện và đăng ký hoặc hủy tham gia
    + lưu danh sách và lượt đăng ký trong trình duyệt



 -->

## Chạy ứng dụng FastAPI

Ứng dụng cung cấp API cho đăng ký/đăng nhập, hồ sơ thành viên, danh sách/tìm kiếm thành viên,
CRUD quy định, tìm/lọc/tạo sự kiện, đăng ký/hủy tham gia và quản lý thông báo. Giao diện HTML
được phục vụ trực tiếp từ FastAPI và sử dụng chung dữ liệu SQLite.

Các endpoint nằm trong `api/main.py`, request/response Pydantic nằm trong `api/schema/`,
còn các bảng SQLAlchemy nằm trong `api/model/`. Cơ sở dữ liệu và dữ liệu quy định mặc định
được khởi tạo lúc ứng dụng khởi động.

Tài khoản đăng ký mới có quyền nội bộ `user` và chức vụ “Thành viên”. Chức vụ có thể
là “Thành viên”, “Trưởng nhóm” hoặc “Phó nhóm”; chỉ admin được thay đổi qua
`PATCH /api/admin/members/{member_id}` bằng trường `position`. Mỗi nhóm chỉ có
một trưởng nhóm; nếu trưởng nhóm được chọn là thành viên nổi bật, họ sẽ hiển thị
ở vị trí trung tâm.
Để tạo admin đầu tiên, chạy tại thư mục gốc dự án và thay `ten_dang_nhap` bằng tên tài khoản
đã đăng ký:

```powershell
python -c "import sqlite3; db=sqlite3.connect(r'api\steamcam.db'); cur=db.execute('UPDATE members SET role = ? WHERE username = ?', ('admin', 'ten_dang_nhap')); db.commit(); print('Tài khoản được cập nhật:', cur.rowcount); db.close()"
```

Sau đó đăng nhập lại và mở `/docs`: admin quản lý quy định, sự kiện và tài khoản qua
`GET /api/admin/members` và `PATCH /api/admin/members/{member_id}`. Tài khoản user chỉ
được xem nội dung, cập nhật hồ sơ và đăng ký/hủy tham gia sự kiện. Không thể hạ quyền
hoặc vô hiệu hóa admin cuối cùng. Admin có thể chọn tối đa 5 thành viên nổi bật ngay
trong trang Thành viên; danh sách này được dùng ở trang chủ và trang Thành viên.

```powershell
python -m pip install -r requirements.txt
$env:SECRET_KEY = "thay-bang-chuoi-bi-mat-ngau-nhien"
# Chạy tại thư mục gốc của dự án:
python -m uvicorn api.main:app --reload

# Hoặc chạy trong thư mục api:
Set-Location api
python -m uvicorn main:app --reload
```

Mở `http://127.0.0.1:8000/`. Tài liệu API tương tác nằm tại
`http://127.0.0.1:8000/docs`. Cơ sở dữ liệu mặc định được tạo ở `api/steamcam.db`;
có thể cấu hình `DATABASE_URL` để sử dụng một cơ sở dữ liệu khác. `SECRET_KEY` mặc
định chỉ phục vụ phát triển cục bộ, cần thay đổi trước khi triển khai.