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
└── 09-demo-expansion.ts              # Mo rong du lieu demo cho tat ca module
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

### Events (base + expansion)
- Du cac status: pending, approved, upcoming, ongoing, completed, cancelled
- Co su kien featured va su kien soft-delete de test bo loc

### Registrations
- Dang ky tren nhieu su kien va nhieu khoa
- Co du lieu `registered` va `cancelled`

### Attendances
- Tao check-in cho event completed/ongoing
- Co du lieu du de demo check-in rates

### Training Points
- Tu dong tao theo attendance
- Co phan bo theo semester de demo thong ke

### Feedback
- Danh gia event completed voi comment + suggestions + anonymous

### Notifications
- Day du cac loai thong bao trong enum NotificationType
- Co read/unread de demo Notification Bell

### Audit Logs
- Tao log cho luong admin: role change, lock user, event approval, category/department updates

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
