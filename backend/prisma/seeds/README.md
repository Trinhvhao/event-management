# Database Seed Files

Cấu trúc seed modular cho database, chia nhỏ theo từng nhóm bảng để dễ quản lý và bảo trì.

## 📁 Cấu trúc

```
seeds/
├── utils.ts                          # Helper functions (QR code, semester calculation)
├── 01-departments.ts                 # Seed departments (5 khoa)
├── 02-categories.ts                  # Seed categories (6 loại sự kiện)
├── 03-users.ts                       # Seed users (1 admin, 3 organizers, 5 students)
├── 04-events.ts                      # Seed events (7 sự kiện)
├── 05-registrations-attendances.ts   # Seed registrations & attendances
├── 06-training-points.ts             # Seed training points
├── 07-feedback.ts                    # Seed feedback
└── 08-notifications.ts               # Seed notifications
```

## 🚀 Cách sử dụng

### Chạy tất cả seeds
```bash
npm run prisma:seed
```

### Chạy seed riêng lẻ (nếu cần)
Bạn có thể import và chạy từng module seed riêng:

```typescript
import { seedDepartments } from './seeds/01-departments';
import { seedCategories } from './seeds/02-categories';

// Chỉ seed departments và categories
await seedDepartments(prisma);
await seedCategories(prisma);
```

## 📊 Dữ liệu được tạo

### Departments (5)
- Khoa Công Nghệ Thông Tin (CNTT)
- Khoa Kinh Tế Doanh Nghiệp (KTDN)
- Khoa Ngoại Ngữ (NN)
- Khoa Khoa Học Tự Nhiên (KHTN)
- Khoa Khoa Học Xã Hội (XH)

### Categories (6)
- Học thuật
- Ngoại khóa
- Tuyển dụng
- Văn hóa
- Thể thao
- Kỹ năng mềm

### Users (9)
- 1 Admin: `admin@dnu.edu.vn`
- 3 Organizers: `organizer.cntt@dnu.edu.vn`, `organizer.ktdn@dnu.edu.vn`, `organizer.nn@dnu.edu.vn`
- 5 Students: `student1@dnu.edu.vn` đến `student5@dnu.edu.vn`

Tất cả password mặc định: `admin123`, `organizer123`, `student123`

### Events (7)
- 2 Completed events (đã hoàn thành)
- 1 Ongoing event (đang diễn ra)
- 4 Upcoming events (sắp diễn ra)

### Registrations (14)
- Completed Event 1: 5 registrations
- Completed Event 2: 3 registrations
- Ongoing Event: 4 registrations
- Upcoming Event 1: 2 registrations

### Attendances (9)
- Completed Event 1: 5 attendances (100%)
- Completed Event 2: 2 attendances (67%)
- Ongoing Event: 2 attendances (50%)

### Training Points (9)
Tự động tạo cho tất cả students đã check-in

### Feedback (6)
- Completed Event 1: 4 feedback (80%)
- Completed Event 2: 2 feedback (100%)

### Notifications (35)
- Registration confirmations
- Check-in success
- Points awarded
- Event reminders
- Feedback requests

## 🔧 Thêm seed mới

Để thêm seed cho bảng mới:

1. Tạo file mới: `09-ten-bang.ts`
2. Export function seed:
```typescript
import { PrismaClient } from '@prisma/client';

export async function seedTenBang(prisma: PrismaClient, dependencies?) {
  console.log('🔧 Seeding ten bang...');
  
  // Seed logic here
  
  console.log(`✅ Created X records`);
  return data;
}
```

3. Import và gọi trong `seed.ts`:
```typescript
import { seedTenBang } from './seeds/09-ten-bang';

// Trong main()
await seedTenBang(prisma, dependencies);
```

## 📝 Lưu ý

- Tất cả email sử dụng domain `@dnu.edu.vn` (Đại học Đại Nam)
- MSSV sinh viên bắt đầu từ `2071020001`
- Seed sử dụng `upsert` để tránh duplicate khi chạy lại
- Dependencies được truyền qua parameters để đảm bảo thứ tự seed đúng
- Helper functions trong `utils.ts` để tái sử dụng logic chung

## 🧪 Testing

Sau khi seed, kiểm tra dữ liệu:

```bash
# Mở Prisma Studio
npm run prisma:studio

# Hoặc chạy tests
npm test
```
