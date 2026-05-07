# Changelog

All notable changes to the Event Management project.

## [Unreleased]

### Added
- **`normalized_code` field** in `Payment` model — stores payment code without dashes for O(1) webhook lookup
- **Approval status tracking** — registrations now track `approval_status` (`pending` / `approved`) separately from `status`
- **Frontend approval status display** — event detail page shows "Đang chờ duyệt" (amber) vs "Đã đăng ký" (green)

### Fixed
- **Webhook overflow error** — greedy regex `(\d+)` consumed all digits, causing INT4 overflow when parsing payment codes. Fixed by adding `normalized_code` unique field
- **Fallback webhook matching** — old payments without `normalized_code` now matched correctly by stripping dashes from `payos_order_id`
- **Registration status false positive** — `getMyRegistrations()` now returns pending registrations, correctly filtered on frontend with `approvalStatus` state
- **Nút Hủy cho pending registrations** — cancel button hidden when `approvalStatus === 'pending'`

### Changed
- **`paymentCode` in API response** — now returns `normalized_code` (no dashes) for easier webhook matching
- **Webhook lookup** — primary: `findUnique({ normalized_code })`, fallback: `findMany` + client-side `endsWith` on stripped `payos_order_id`

---

## Database Migration (2026-05-07)

```bash
cd backend
npx prisma db push --accept-data-loss
npx prisma generate
```

New column added to `payments` table:

| Column | Type | Nullable | Unique | Description |
|--------|------|----------|--------|-------------|
| `normalized_code` | `String` | Yes | Yes | `payos_order_id` stripped of dashes — for webhook matching |

### Payment Status Flow

```
pending → paid        (webhook confirmed)
pending → cancelled   (user cancelled)
pending → expired    (cron job, 24h expiry)
paid → refunded       (organizer/admin action)
```

### Registration Status Flow (require_approval events)

```
pending_approval
    ↓ (organizer approves)
registered
    ↓ (checkin)
attended
    ↓ (event ends)
completed (via cron)
```

### Registration Status Flow (no approval / free events)

```
registered (instant)
    ↓ (checkin)
attended
    ↓ (event ends)
completed (via cron)
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry |
| `PORT` | No | `7776` | Server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin |
| `SMTP_HOST` | No | — | SMTP server |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `SMTP_FROM` | No | — | From email address |
| `SEPAY_ACCOUNT_NUMBER` | Yes* | — | SePay bank account |
| `SEPAY_BANK_NAME` | Yes* | — | Bank name (e.g. "TPBank") |
| `PAYMENT_CODE_EXPIRY_HOURS` | No | `24` | Payment code expiry |

*Required only for bank transfer payment method.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (e.g. `https://api.hayyie.click/api`) |
