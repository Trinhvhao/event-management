# Migration Guide - Admin Control Tower Phase 1

## Bước 1: Khởi động Database

Nếu database chưa chạy, khởi động bằng Docker:

```bash
cd backend
docker-compose up -d
```

## Bước 2: Chạy Migration

Tạo và áp dụng migration cho audit_logs table và last_login column:

```bash
cd backend
npx prisma migrate dev --name add_audit_logs_and_last_login
```

Migration này sẽ:
- Tạo bảng `audit_logs` với các columns:
  - id, action_type, admin_id, user_id, entity_type, entity_id
  - old_value (JSONB), new_value (JSONB), metadata (JSONB)
  - ip_address, user_agent, created_at
- Thêm column `last_login` vào bảng `users`
- Tạo các indexes cho performance:
  - idx_audit_admin, idx_audit_user, idx_audit_action, idx_audit_created
  - idx_audit_entity (entity_type, entity_id)
  - idx_users_last_login
  - idx_users_role_active (role, is_active)
  - idx_users_department_role (department_id, role)
  - idx_users_created_at
  - idx_events_organizer_status (organizer_id, status)
  - idx_registrations_event_status (event_id, status)
  - idx_feedback_event

## Bước 3: Generate Prisma Client

```bash
npx prisma generate
```

## Bước 4: Verify Migration

Kiểm tra migration đã áp dụng thành công:

```bash
npx prisma studio
```

Hoặc kết nối trực tiếp vào database:

```bash
docker exec -it event-management-db psql -U postgres -d event_management
```

Sau đó chạy:

```sql
-- Kiểm tra audit_logs table
\d audit_logs

-- Kiểm tra last_login column
\d users

-- Kiểm tra indexes
\di
```

## Rollback (Nếu Cần)

Nếu cần rollback migration:

```bash
npx prisma migrate resolve --rolled-back add_audit_logs_and_last_login
```

## Lưu Ý

- Migration này an toàn và không ảnh hưởng đến dữ liệu hiện có
- `last_login` column là nullable nên không cần giá trị mặc định
- Audit logs sẽ bắt đầu ghi từ sau khi migration hoàn tất
