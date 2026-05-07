# SPEC: Organizer Role — Feature Gaps & Enhancements

> **Ngữ cảnh:** Hệ thống quản lý sự kiện trường đại học (Event Management System)
> **Role được phân tích:** Organizer (Ban tổ chức sự kiện)
> **Ngày:** 2026-05-07
> **Mức ưu tiên:** HIGH cho bug camera + các feature thiếu

---

## PHẦN 1: TỔNG QUAN — HIỆN TRẠNG & VẤN ĐỀ

### 1.1 Vấn đề được báo

| # | Mô tả | Mức ưu tiên |
|---|---|---|
| 1 | Lỗi "Trình duyệt không hỗ trợ quét camera..." — BarcodeDetector chỉ hoạt động trên Chrome/Edge. Firefox/Safari/iOS Safari hoàn toàn không dùng được camera scan. | **CRITICAL** |
| 2 | Organizer không thấy phần Team/Đội ngũ — Team page tồn tại (`/dashboard/organizer/events/[id]/team`) nhưng không nổi bật, không có navigation rõ ràng. | **HIGH** |

### 1.2 Khảo sát toàn diện — Các feature thiếu/bị lỗi khác

| # | Vấn đề | Mức ưu tiên | Loại |
|---|---|---|---|
| 3 | Không có fallback library cho QR scanning — khi `BarcodeDetector` không tồn tại, chỉ còn manual mode. Không dùng thư viện JS nào như `html5-qrcode`, `zxing-js`. | **CRITICAL** (đã merge vào #1) | Tech |
| 4 | Event ownership không được verify ở edit page — `events/[id]/edit/page.tsx` thiếu kiểm tra `user.id === event.organizer_id`, bất kỳ organizer nào cũng sửa được event của người khác. | **HIGH** | Security |
| 5 | Sidebar thiếu mục "Đội ngũ" (Team) — trong sidebar không có navigation trực tiếp đến team management, chỉ có link trong card/event detail. | **HIGH** | UX |
| 6 | Hoạt động gần đây (Recent Activity) trên organizer dashboard dùng mock data tĩnh, không có API thực. | **MEDIUM** | Data |
| 7 | Không có trang tạo/tải về QR code vé cho sinh viên — sinh viên không có cách lấy QR code vé để check-in. | **HIGH** | Feature |
| 8 | Không có trang xem lịch sử scan/check-in audit log — chỉ xem được trên trang check-in tạm thời. | **MEDIUM** | Feature |
| 9 | Lỗi dependency trong `startCamera` callback — `lastScan` trong dependency array khiến camera liên tục restart sau mỗi lần scan thành công. | **MEDIUM** | Bug |
| 10 | Không có phân biệt rõ helper vs main_organizer trong event detail — permissions chỉ check ở backend, FE không hiển thị khác biệt rõ ràng. | **LOW** | UX |
| 11 | CSV export check-in thiếu BOM trong `EventRegistrationsTab` (có trong checkin page). | **LOW** | Bug |

---

## PHẦN 2: SPEC — SỬA LỖI CAMERA SCANNING

### 2.1 Nguyên nhân gốc

`BarcodeDetector` API là native Web API — chỉ hỗ trợ:
- ✅ Chrome 83+, Edge 83+, Opera 69+, Samsung Internet 13+
- ❌ Firefox (tất cả phiên bản), Safari (macOS + iOS), WebKit browsers

Code hiện tại check `BarcodeDetector` và fail ngay, không có fallback.

### 2.2 Giải pháp

**Dùng thư viện `html5-qrcode`** — thư viện phổ biến nhất, hỗ trợ mọi trình duyệt qua WebRTC getUserMedia.

```
Chọn library: html5-qrcode (NPM: html5-qrcode)
Lý do:
- Không cần build native module
- API đơn giản, hỗ trợ cả camera lẫn file/image
- Tự handle permissions, device selection
- 15k+ stars trên GitHub, maintained
- Cho phép scan từ video stream hoặc static image
```

**Fallback chain:**
1. Ưu tiên 1: `html5-qrcode` camera (WebRTC)
2. Ưu tiên 2: `BarcodeDetector` (Chrome/Edge native — hiệu năng tốt hơn)
3. Fallback cuối: Manual QR text input

**UX Error messages cần phân biệt:**

| Trường hợp | Message |
|---|---|
| BarcodeDetector không có | "Trình duyệt của bạn không hỗ trợ quét camera. Đang dùng chế độ manual..." |
| getUserMedia permission denied | "Camera bị từ chối. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt." |
| getUserMedia insecure context (HTTP) | "Quét camera cần truy cập qua HTTPS. Vui lòng dùng chế độ Nhập mã." |
| Không có camera device | "Không tìm thấy camera. Vui lòng kiểm tra thiết bị hoặc dùng chế độ Nhập mã." |

### 2.3 File changes

| File | Thay đổi |
|---|---|
| `frontend/package.json` | Thêm `html5-qrcode` |
| `frontend/app/dashboard/checkin/page.tsx` | Refactor camera logic — dùng `Html5Qrcode` library, fix dependency bug, cải thiện error messages |
| `frontend/services/checkinService.ts` | Không thay đổi (interface giữ nguyên) |

### 2.4 Technical details

```typescript
// Pseudocode cho camera refactor
import { Html5Qrcode } from 'html5-qrcode';

// Khởi tạo scanner
const html5Qr = new Html5Qrcode("qr-reader");
await html5Qr.start(
  { facingMode: 'environment' },
  { fps: 10, qrbox: 250 },
  (decodedText) => { doCheckin(decodedText); },
  () => {} // ignore errors during scan
);

// Cleanup
await html5Qr.stop();
```

---

## PHẦN 3: SPEC — CẢI THIỆN NAVIGATION CHO TEAM MANAGEMENT

### 3.1 Nguyên nhân gốc

Sidebar hiện tại không có mục "Đội ngũ". Link đến team page chỉ xuất hiện:
1. Trong event card/list → icon Users → `/dashboard/organizer/events/${id}/team`
2. Trong event detail page → card "Quản lý đội ngũ" → link

Organizer mới không biết tính năng này tồn tại.

### 3.2 Giải pháp — 2 options

**Option A (Đơn giản nhất):** Thêm mục "Đội ngũ" vào sidebar với sub-navigation
```
📂 Quản lý
   ├─ Sự kiện của tôi
   ├─ Đội ngũ              ← THÊM
   ├─ Duyệt đăng ký
   └─ ...
```

**Option B (Tốt hơn):** Thêm mục "Đội ngũ" nhưng click sẽ show dropdown list các team events

**Recommendation: Option A** — đơn giản, hiệu quả, ít thay đổi nhất.

### 3.3 Ngoài ra cần cải thiện:

1. **Trên trang My Events** — khi hover vào row/card event, highlight icon "Users" rõ hơn, tooltip "Quản lý đội ngũ"
2. **Trên trang Organizer Dashboard** — thêm card/metric "Đội ngũ của tôi" hiển thị tổng số thành viên đang tham gia các sự kiện
3. **Breadcrumb** trên trang team — thêm đường dẫn rõ: "Dashboard > Sự kiện > [Tên sự kiện] > Đội ngũ"

### 3.4 File changes

| File | Thay đổi |
|---|---|
| `frontend/components/layout/DashboardLayout.tsx` | Thêm menu item "Đội ngũ" vào sidebar, hiển thị icon Users |
| `frontend/app/dashboard/organizer/team/page.tsx` | TẠO MỚI — trang overview tổng quan tất cả các team của organizer |
| `frontend/app/dashboard/organizer/events/page.tsx` | Thêm tooltip "Quản lý đội ngũ" vào icon Users |
| `frontend/app/dashboard/organizer/events/[id]/team/page.tsx` | Thêm breadcrumb navigation |

---

## PHẦN 4: SPEC — SỬA SECURITY (Event Ownership)

### 4.1 Nguyên nhân

`events/[id]/edit/page.tsx` không kiểm tra `user.id === event.organizer_id`. Bất kỳ authenticated user nào (organizer/admin) đều có thể edit bất kỳ event nào.

### 4.2 Giải pháp

Thêm permission check tương tự như event detail page:

```typescript
// Trong event edit page
const isOwner = user?.id === event?.organizer_id;
const isAdmin = user?.role === 'admin';
const canEdit = (isOwner || isAdmin) && event?.status !== 'pending' && event?.status !== 'cancelled';

useEffect(() => {
  if (!canEdit) {
    toast.error('Bạn không có quyền chỉnh sửa sự kiện này');
    router.push(`/dashboard/events/${eventId}`);
  }
}, [canEdit, eventId, router]);
```

### 4.3 File changes

| File | Thay đổi |
|---|---|
| `frontend/app/dashboard/events/[id]/edit/page.tsx` | Thêm ownership + status permission check |
| `frontend/app/dashboard/events/[id]/page.tsx` | Verify redirect path — `/dashboard/my-events` không tồn tại → đổi thành `/dashboard/organizer/events` |

---

## PHẦN 5: TRIỂN KHAI THEO THỨ TỰ

### Phase 1: Fix Camera (CRITICAL) — 1 ngày
1. Thêm `html5-qrcode` vào package.json
2. Refactor camera logic trong checkin page
3. Fix dependency bug trong `startCamera`
4. Cải thiện error messages phân biệt rõ từng trường hợp
5. Test trên Chrome, Firefox, Safari, Edge

### Phase 2: Team Navigation (HIGH) — 1 ngày
1. Thêm menu item "Đội ngũ" vào sidebar DashboardLayout
2. Thêm tooltip vào icon Users trong events list
3. Fix breadcrumb trên team page

### Phase 3: Security Fix (HIGH) — 0.5 ngày
1. Thêm ownership check vào edit page
2. Fix redirect path delete event

### Phase 4: Team Overview Page (MEDIUM) — 1 ngày
1. Tạo `/dashboard/organizer/team` overview page
2. Hiển thị tất cả team members của tất cả events
3. Thêm metric "Tổng số thành viên" vào organizer dashboard

### Phase 5: QR Ticket Generation (HIGH) — 1 ngày
1. Tạo trang `/dashboard/organizer/events/[id]/tickets`
2. Hiển thị danh sách vé đã đăng ký
3. Tính năng gửi QR code qua email cho sinh viên
4. Hoặc: Tạo API endpoint + trang để sinh viên tự tải QR

### Phase 6: Misc Fixes (LOW) — 0.5 ngày
1. Fix CSV BOM inconsistency
2. Add tab visibility check để pause camera khi tab backgrounded
3. Thêm `undoAttendance` time validation

---

## PHẦN 6: TÀI LIỆU THAM KHẢO

### Feature Flags (nếu cần toggle)

```typescript
// frontend/config/features.ts
export const FEATURES = {
  QR_HTML5_FALLBACK: process.env.NEXT_PUBLIC_FF_QR_FALLBACK === 'true',
  TEAM_OVERVIEW_PAGE: process.env.NEXT_PUBLIC_FF_TEAM_OVERVIEW === 'true',
  QR_TICKET_EMAIL: process.env.NEXT_PUBLIC_FF_QR_EMAIL === 'true',
};
```

### Packages cần thêm

| Package | Version | Mục đích |
|---|---|---|
| `html5-qrcode` | `^2.3.8` | Fallback QR scanning cho non-Chrome browsers |

---

## PHẦN 7: ĐÁNH GIÁ RỦI RO

| Rủi ro | Mức | Mitigation |
|---|---|---|
| Camera trên iOS Safari chặn getUserMedia bất kể HTTPS | HIGH | Yêu cầu user dùng Chrome/Edge trên iOS, hoặc fallback manual |
| html5-qrcode xung đột với existing camera logic | MEDIUM | Wrapper class riêng, isolate logic |
| Breaking change cho existing check-in flow | MEDIUM | A/B test: keep BarcodeDetector as primary, html5-qrcode as fallback |
| Backend không verify event ownership khi edit | HIGH | Đã confirm backend có check via auth middleware, nhưng nên verify lại |

---

## PHẦN 8: APPROVAL

Sau khi bạn review SPEC này, nếu OK tôi sẽ triển khai **Phase 1 + Phase 2 + Phase 3** (bug fixes + critical features) trước, các phase còn lại triển khai sau.

**Ước tính tổng thời gian: ~4 ngày** (có thể rút xuống 2-3 ngày nếu không làm QR Ticket Generation).

---

*Tài liệu này là SPEC.md cho giai đoạn cải thiện Organizer Role. Sau khi approve, sẽ tạo PLAN.md chi tiết cho từng phase.*
