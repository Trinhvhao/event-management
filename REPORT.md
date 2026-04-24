# HỆ THỐNG QUẢN LÝ SỰ KIỆN - EVENT MANAGEMENT SYSTEM

## Báo Cáo Demo Cho Giảng Viên

---

## 1. TỔNG QUAN DỰ ÁN

**Tên dự án:** Event Management System

**Mục tiêu:** Xây dựng hệ thống quản lý sự kiện cho trường đại học, hỗ trợ toàn bộ quy trình từ tạo sự kiện → đăng ký → điểm danh → tích lũy điểm rèn luyện.

**Công nghệ sử dụng:**

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Next.js 16 (Turbopack), React, TypeScript, Tailwind CSS |
| Animation | Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh token) |
| API | RESTful |
| Deployment | Docker-ready |

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Sơ đồ luồng nghiệp vụ

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   STUDENT    │───→│   EVENTS    │───→│ REGISTRATION │
│  (Sinh viên) │    │  (Sự kiện)  │    │ (Đăng ký)   │
└──────────────┘    └──────┬───────┘    └──────┬───────┘
                          │                    │
                          │                    ▼
                          │            ┌──────────────┐
                          │            │  QR CODE     │
                          │            │  (Mã QR)     │
                          │            └──────┬───────┘
                          │                   │
                          ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  TRAINING    │←───│  CHECK-IN   │←───│ ORGANIZER    │
│  POINTS      │    │ (Điểm danh) │    │ (Ban tổ chức)│
│ (Điểm RL)   │    └──────┬───────┘    └──────────────┘
└──────────────┘           │
                           ▼
                   ┌──────────────┐
                   │ CHECK-OUT    │
                   │ (Kết thúc)  │
                   └──────────────┘
```

### 2.2. Vai trò người dùng

| Vai trò | Mô tả | Quyền hạn |
|---------|--------|-----------|
| **Admin** | Quản trị viên | Toàn quyền hệ thống |
| **Organizer** | Ban tổ chức | Tạo sự kiện, điểm danh, xem thống kê |
| **Student** | Sinh viên | Đăng ký, nhận QR, xem điểm rèn luyện |

---

## 3. CHỨC NĂNG CHI TIẾT

### 3.1. Quản lý Sự kiện (Events)

- **Tạo sự kiện** — Organizer tạo với đầy đủ thông tin (tên, mô tả, thời gian, địa điểm, sức chứa, điểm rèn luyện, **phí tham gia**, **hạn đăng ký**)
- **Duyệt sự kiện** — Admin xem danh sách chờ duyệt, phê duyệt hoặc từ chối
- **Phê duyệt tự động** — Có thể cấu hình duyệt tự động theo danh mục
- **Chỉnh sửa** — Organizer chỉnh sửa sự kiện đã tạo
- **Hủy sự kiện** — Gửi thông báo tự động đến tất cả sinh viên đã đăng ký
- **Xem danh sách** — Lọc theo trạng thái, danh mục, khoa
- **Lịch sự kiện** — Xem theo dạng lịch tháng/tuần

### 3.2. Đăng ký Sự kiện (Registration)

- **Đăng ký** — Sinh viên đăng ký tham gia sự kiện
- **Mã QR tự động** — Mỗi đăng ký được cấp một mã QR duy nhất (base64 PNG)
- **Hủy đăng ký** — Sinh viên có thể hủy trước deadline
- **Quản lý đăng ký** — Organizer xem danh sách, xuất CSV
- **Giới hạn sức chứa** — Tự động từ chối khi đầy

### 3.3. Điểm danh (Check-in / Check-out)

Đây là chức năng cốt lõi, được triển khai đầy đủ:

**Luồng điểm danh:**

1. Sinh viên đăng ký → nhận mã QR (base64 PNG)
2. Sự kiện bắt đầu
3. Ban tổ chức chọn sự kiện trên màn hình Check-in
4. Quét mã QR bằng camera hoặc dán nội dung QR
5. Check-in thành công:
   - Tạo bản ghi Attendance
   - Cập nhật Registration → attended
   - Cộng điểm rèn luyện cho sinh viên
   - Gửi thông báo cho sinh viên
6. Check-in thất bại (các trường hợp):

   | Trường hợp | Thông báo |
   |-----------|-----------|
   | QR đã dùng | "Đã check-in rồi" |
   | Quét ngoài giờ | "Đã hết giờ check-in. Sự kiện đã kết thúc." |
   | Quét sớm | "Chưa đến giờ check-in. Còn X phút nữa mới được check-in." |
   | Sự kiện chưa bắt đầu | "Sự kiện chưa bắt đầu hoặc đã kết thúc" |
   | Đăng ký bị hủy | "Sinh viên đã hủy đăng ký. Không thể check-in." |
   | Chưa đăng ký | "Sinh viên chưa đăng ký sự kiện này." |

7. **Check-out** — Kết thúc sự kiện, ghi nhận giờ ra
8. **Undo** — Hủy bản ghi nếu điểm sai (tự động thu hồi điểm RL)

**Tính năng màn hình Check-in:**

- Chọn sự kiện cần điểm danh
- KPI strip: Tổng đăng ký / Đã check-in / Đang check-in / Đã check-out
- Quét camera (BarcodeDetector API) hoặc dán mã QR
- Danh sách điểm danh live với tìm kiếm
- Nút Check-out và Undo cho từng sinh viên
- Xuất CSV danh sách điểm danh (có cột check-out)
- Âm thanh phản hồi (beep thành công/thất bại)
- Check-in thủ công bằng MSSV hoặc Registration ID

### 3.4. Điểm Rèn luyện (Training Points)

- **Tự động tích lũy** — Check-in thành công → cộng điểm tự động
- **Theo học kỳ** — Tự động phân loại HK1/HK2/Summer
- **Lịch sử điểm** — Sinh viên xem chi tiết từng sự kiện đã tham gia
- **Lọc theo học kỳ** — Xem điểm theo từng học kỳ
- **Mục tiêu** — Thanh progress với thành tựu (sao)
- **Award thủ công** — Admin tặng điểm thủ công cho sinh viên
- **Bảng xếp hạng** — Top sinh viên tích lũy điểm cao nhất
- **Tra cứu theo User ID** — Admin tra cứu nhanh

### 3.5. Phản hồi (Feedback)

- Sinh viên gửi đánh giá sau sự kiện (rating + bình luận)
- Organizer xem tổng hợp phản hồi
- Hỗ trợ đánh giá ẩn danh
- Top sự kiện được đánh giá cao

### 3.6. Thông báo (Notifications)

- Thông báo đăng ký thành công
- Nhắc nhở sự kiện sắp tới
- Thông báo check-in thành công
- Thông báo nhận điểm rèn luyện
- Thông báo sự kiện bị hủy / cập nhật
- Bell icon + badge số thông báo chưa đọc

### 3.7. Quản trị (Admin)

- **Quản lý người dùng** — Khóa/mở khóa, đổi vai trò, xem chi tiết
- **Quản lý Organizer** — Cấp/thu hồi quyền organizer, xem KPI
- **Quản lý danh mục** — CRUD categories và departments
- **Thống kê hệ thống** — Charts, metrics toàn hệ thống
- **Audit Log** — Nhật ký hành động admin

---

## 4. CƠ SỞ DỮ LIỆU

### 4.1. Các bảng dữ liệu

| Bảng | Mô tả | Quan hệ |
|------|-------|---------|
| `users` | Người dùng (Admin/Organizer/Student) | 1-N registrations, 1-N attendance, 1-N training_points |
| `departments` | Khoa / Viện | 1-N users, 1-N events |
| `categories` | Danh mục sự kiện | 1-N events |
| `events` | Sự kiện (có event_cost, registration_deadline) | 1-N registrations, 1-N feedback, 1-N training_points |
| `registrations` | Đăng ký (có mã QR) | 1-1 attendance, N-1 users, N-1 events |
| `attendance` | Điểm danh (check-in/check-out) | N-1 registrations, N-1 users (checker) |
| `training_points` | Điểm rèn luyện | N-1 users, N-1 events |
| `feedback` | Phản hồi | N-1 events, N-1 users |
| `notifications` | Thông báo | N-1 users, N-1 events |
| `audit_logs` | Nhật ký hành động | N-1 admins, N-1 users |

### 4.2. Các trạng thái (Enums)

```
UserRole:              student | organizer | admin
EventStatus:           pending | approved | upcoming | ongoing | completed | cancelled
RegistrationStatus:    registered | cancelled | attended
AttendanceStatus:      checked_in | checked_out
NotificationType:      registration_confirm | event_reminder | event_update |
                       event_cancelled | feedback_request | checkin_success | points_awarded
```

---

## 5. API ENDPOINTS

| Nhóm | Endpoint prefix | Mô tả |
|-------|----------------|--------|
| Auth | `/api/auth` | Đăng nhập, đăng ký, đổi mật khẩu |
| Events | `/api/events` | CRUD sự kiện, duyệt, hủy |
| Registrations | `/api/registrations` | Đăng ký, hủy, lấy QR |
| **Check-in** | `/api/checkin` | **Quét QR, check-out, undo, thống kê** |
| Training Points | `/api/training-points` | Điểm RL, lịch sử, award thủ công |
| Feedback | `/api/feedback` | Gửi & xem phản hồi |
| Notifications | `/api/notifications` | Thông báo, đánh dấu đã đọc |
| Statistics | `/api/statistics` | Dashboard stats, charts |
| Analytics | `/api/analytics` | Time series, department distribution |
| Admin | `/api/admin` | User mgmt, categories, departments, roles |
| Search | `/api/search` | Tìm kiếm toàn cục |

---

## 6. TRANG GIAO DIỆN (Tổng cộng 33 trang)

### Trang công khai

| Trang | Đường dẫn |
|-------|-----------|
| Trang chủ (Landing page) | `/` |
| Đăng nhập | `/login` |
| Đăng ký tài khoản | `/register` |
| Quên mật khẩu | `/forgot-password` |
| Đặt lại mật khẩu | `/reset-password` |
| Xác thực email | `/verify-email` |

### Trang Dashboard (dành cho tất cả người dùng)

| Trang | Đường dẫn |
|-------|-----------|
| Dashboard chính | `/dashboard` |
| Danh sách sự kiện | `/dashboard/events` |
| Chi tiết sự kiện | `/dashboard/events/[id]` |
| Chỉnh sửa sự kiện | `/dashboard/events/[id]/edit` |
| Lịch sự kiện | `/dashboard/events/calendar` |
| Sự kiện đã đăng ký | `/dashboard/my-registrations` |
| Sự kiện của tôi | `/dashboard/my-events` |
| **Điểm danh (Check-in)** | `/dashboard/checkin` |
| Điểm rèn luyện | `/dashboard/training-points` |
| Hồ sơ cá nhân | `/dashboard/profile` |
| Thông báo | `/dashboard/notifications` |
| Thống kê | `/dashboard/statistics` |

### Trang Dashboard (Admin)

| Trang | Đường dẫn |
|-------|-----------|
| Quản lý người dùng | `/dashboard/admin/users` |
| Quản lý Organizer | `/dashboard/admin/organizers` |
| Thống kê Admin | `/dashboard/admin/statistics` |
| Điểm RL (Admin) | `/dashboard/admin/training-points` |
| Sự kiện chờ duyệt | `/dashboard/events/pending` |
| Cài đặt - Danh mục | `/dashboard/settings/categories` |
| Cài đặt - Vai trò | `/dashboard/settings/roles` |

---

## 7. TRẠNG THÁI HOÀN THÀNH

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| Auth & Users | ✅ Hoàn thành | Login, register, JWT, password reset |
| Events CRUD | ✅ Hoàn thành | Create, edit, delete, approve/reject |
| Event Listing | ✅ Hoàn thành | Search, filter, calendar view |
| Registration | ✅ Hoàn thành | Register, cancel, QR generation |
| **Check-in / Check-out** | ✅ Hoàn thành | Camera scan, manual, checkout, undo |
| Training Points | ✅ Hoàn thành | Auto-award, history, leaderboard |
| Feedback | ✅ Hoàn thành | Rate & comment |
| Notifications | ✅ Hoàn thành | Real-time bell, auto-create |
| Admin Dashboard | ✅ Hoàn thành | Stats, charts, user management |
| Statistics & Analytics | ✅ Hoàn thành | Time series, department charts |
| Settings | ✅ Hoàn thành | Categories, departments, roles |
| **Event Cost** | ✅ Hoàn thành | Phí tham gia (miễn phí / có phí), hạn đăng ký |
| **Hạn đăng ký** | ✅ Hoàn thành | registration_deadline trong event create/edit |
| **Pending reject modal** | ✅ Hoàn thành | Modal xác nhận thay vì window.prompt |
| **Category delete confirm** | ✅ Hoàn thành | Dialog xác nhận trước khi xóa |

---

## 8. HƯỚNG PHÁT TRIỂN TƯƠNG LAI

### Ngắn hạn (1-2 tuần)

1. **QR có thời hạn** — ✅ Đã làm: expires_at trong QR data payload
2. **Xác thực QR offline** — Quét không cần internet (cache event data)
3. **Webhook / SMS** — Gửi SMS khi check-in thành công
4. **Payment flow** — Tích hợp thanh toán cho sự kiện có phí (VNPay, MoMo)

### Trung hạn (1-2 tháng)

5. **Multi-device scan** — Nhiều thiết bị quét cùng lúc cho sự kiện lớn
6. **Gamification** — Huy hiệu, achievement khi đạt milestone điểm RL
7. **Báo cáo PDF** — Tự động generate báo cáo điểm danh PDF
8. **Email confirmation** — Email xác nhận đăng ký, nhắc lịch

### Dài hạn (3-6 tháng)

9. **Mobile app** — React Native cho sinh viên & ban tổ chức
10. **QR offline verification** — Không cần server khi check-in
11. **AI recommendation** — Gợi ý sự kiện phù hợp với sinh viên
12. **Payment integration** — Sự kiện có phí đăng ký (VNPay, MoMo)
13. **Event recurring** — Sự kiện lặp lại theo lịch trình
14. **Multi-language** — Hỗ trợ tiếng Anh / tiếng Việt

---

## 9. HƯỚNG DẪN CÀI ĐẶT

### Yêu cầu

- Node.js 18+
- PostgreSQL 14+
- npm hoặc yarn

### Chạy backend

```bash
cd backend
cp .env.example .env
# Cấu hình DATABASE_URL trong .env (PostgreSQL)
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Chạy frontend

```bash
cd frontend
npm install
npm run dev
# Mở http://localhost:3000
```

### Tài khoản demo (sau khi seed)

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@dnu.edu.vn | admin123 |
| Organizer | organizer.cntt@dnu.edu.vn | organizer123 |
| Student | student1@dnu.edu.vn | student123 |

---

## 10. CẤU TRÚC THƯ MỤC

```
event-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seeds/                # Seed data
│   └── src/
│       ├── config/               # DB config
│       ├── controllers/          # Request handlers
│       ├── middleware/            # Auth, error handling
│       ├── routes/              # API routes (11 files)
│       ├── services/             # Business logic
│       ├── validators/           # Zod schemas
│       └── utils/               # Helpers
├── frontend/
│   ├── app/
│   │   ├── dashboard/            # 15+ dashboard pages
│   │   ├── (auth)/              # Login, register, forgot
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── admin/               # Admin-specific components
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── events/              # Event components
│   │   └── ui/                  # Reusable UI components
│   ├── services/                # 16 API service files
│   ├── store/                   # Zustand state
│   └── types/                   # TypeScript types
└── README.md
```

---

*Document generated: 2026-04-20*
