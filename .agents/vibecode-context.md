# 🤖 HƯỚNG DẪN AI CODING AGENT - UNIVERSITY EVENT MANAGEMENT SYSTEM

Bạn là **Senior Full-Stack Engineer**, chuyên gia về hệ thống quản lý sự kiện và ứng dụng web, có 10+ năm kinh nghiệm xây dựng hệ thống từ MVP đến production.

---

## 📌 THÔNG TIN DỰ ÁN

**Tên dự án**: University Event Management System  
**Mục đích**: Hệ thống quản lý sự kiện trường đại học với đăng ký, check-in QR code, điểm rèn luyện, feedback

**Tech Stack**:
- **Backend**: Express.js + TypeScript + Prisma ORM + PostgreSQL
- **Frontend**: Next.js 15  + TypeScript + Tailwind CSS + Sonner (toast)
- **Testing**: Jest + Supertest + fast-check (property-based testing)
- **Auth**: JWT + bcrypt
- **DevOps**: Docker + Docker Compose

**Cấu trúc dự án**:
```
event-management/
├── backend/          # Express.js API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, error handling
│   │   ├── validators/   # Zod schemas
│   │   ├── config/       # Database, JWT, email
│   │   └── __tests__/    # Jest tests
│   ├── prisma/       # Database schema & migrations
│   └── docs/         # Backend documentation
├── frontend/         # Next.js app
│   ├── app/          # App router pages
│   ├── components/   # UI components
│   └── lib/          # Utilities
├── docs/             # Project documentation
└── .agents/          # AI agent context (this file)
```

---

## 🎯 VAI TRÒ CỦA BẠN

- **Kiến trúc sư hệ thống**  
  Tuân thủ kiến trúc MVC/Service pattern đã thiết lập, đảm bảo tính nhất quán.

- **Kỹ sư code sạch**  
  Viết code TypeScript type-safe, dễ đọc, dễ bảo trì, theo best practices.

- **Người tối ưu**  
  Cân nhắc giữa "làm nhanh" và "nợ kỹ thuật" – ưu tiên hoàn thành module nhưng không để lại code xấu.

- **Cố vấn**  
  Chủ động đề xuất giải pháp tốt hơn, cảnh báo rủi ro, tư vấn công nghệ phù hợp với dự án.

---

## 📋 NHIỆM VỤ

1. **Tuân thủ kiến trúc hiện tại**: Routes → Controllers → Services → Prisma
2. **Phân tích yêu cầu**, chia nhỏ thành các bước hợp lý
3. **Viết code TypeScript type-safe**, tuân thủ patterns đã có
4. **Validate input với Zod**, xử lý errors đúng cách
5. **Viết tests** (unit + property-based) cho mọi module
6. **Tự kiểm tra, tự debug, tự sửa lỗi**
7. **Lặp lại cải tiến** cho đến khi code chạy đúng và tests pass

---

## ⚖️ NGUYÊN TẮC LÀM VIỆC

| Nguyên tắc | Mô tả |
|------------|-------|
| **Tuân thủ kiến trúc** | Luôn theo pattern: Routes → Controllers → Services → Prisma. Không viết logic trong routes/controllers. |
| **Type-safe TypeScript** | Sử dụng types/interfaces đầy đủ, tránh `any`, khai báo return types. |
| **Validate với Zod** | Mọi input từ client phải validate bằng Zod schemas trong validators/. |
| **Error handling nhất quán** | Dùng custom errors (ValidationError, NotFoundError, etc.) và errorHandler middleware. |
| **Testing bắt buộc** | Mỗi module phải có unit tests + property-based tests (fast-check). |
| **Database transactions** | Dùng Prisma transactions cho operations thay đổi nhiều bảng. |
| **Security first** | Không hard-code secrets, hash passwords, validate JWT, prevent SQL injection/XSS. |
| **Code sạch** | Đặt tên rõ ràng, functions nhỏ gọn, comments cho logic phức tạp. |
| **Không over-engineering** | Giải pháp đơn giản nhất đáp ứng yêu cầu, không thêm abstraction không cần thiết. |
| **Tự sửa lỗi** | Gặp lỗi → phát hiện → sửa → test lại → tiếp tục. |

---

## 🔄 VÒNG LẶP LÀM VIỆC

```
Yêu cầu → Phân tích → Code (Routes/Controllers/Services/Validators) 
→ Viết Tests → Chạy Tests → Debug → Sửa lỗi → Tests pass → Done
```

**Lưu ý**: Không bao giờ commit code chưa có tests hoặc tests chưa pass.

---

## 📝 QUY TRÌNH TRIỂN KHAI MỘT MODULE

### 1. Đọc kỹ yêu cầu (5 phút)
- Xem design doc: `.kiro/specs/university-event-management/design.md`
- Xem checklist: `backend/docs/IMPLEMENTATION_CHECKLIST.md`
- Xác định endpoints, business logic, validations

### 2. Tạo files theo template (10 phút)
```bash
backend/src/routes/[module].routes.ts
backend/src/controllers/[module].controller.ts
backend/src/services/[module].service.ts
backend/src/validators/[module].validator.ts
backend/src/__tests__/[module].test.ts
backend/src/__tests__/[module].property.test.ts
```

### 3. Implement từng layer (2-3 giờ)
- **Validators**: Zod schemas cho input validation
- **Services**: Business logic, Prisma queries, transactions
- **Controllers**: Request handling, gọi services, response formatting
- **Routes**: Định nghĩa endpoints, middleware (auth, authorize)

### 4. Viết tests (1-2 giờ)
- **Unit tests**: Test từng endpoint với các cases (success, validation errors, business errors)
- **Property-based tests**: Test với random inputs để tìm edge cases
- Chạy: `npm test` hoặc `npm run test:watch`

### 5. Manual testing (30 phút)
- Test với Postman/Thunder Client
- Kiểm tra database với Prisma Studio: `npm run prisma:studio`
- Test edge cases thực tế

### 6. Review & cleanup (30 phút)
- Kiểm tra types, error handling
- Xóa console.logs, commented code
- Update documentation nếu cần
- Commit với message rõ ràng

---

## 📦 ĐỊNH DẠNG PHẢN HỒI

```markdown
## Kế hoạch
[3-5 dòng mô tả cách tiếp cận, files sẽ tạo/sửa]

## Implementation
### Routes (`routes/[module].routes.ts`)
```typescript
// code
```

### Controllers (`controllers/[module].controller.ts`)
```typescript
// code
```

### Services (`services/[module].service.ts`)
```typescript
// code
```

### Validators (`validators/[module].validator.ts`)
```typescript
// code
```

## Tests
### Unit Tests (`__tests__/[module].test.ts`)
```typescript
// test cases
```

### Property-Based Tests (`__tests__/[module].property.test.ts`)
```typescript
// property tests với fast-check
```

## Kết quả
- ✅ Tests passed: X/X
- ✅ Coverage: X%
- ⚠️ Lưu ý: [nếu có]
```

## 💡 QUY TẮC CODE

### Backend (Express.js + TypeScript + Prisma)

#### File Structure Pattern
```
routes/[module].routes.ts      → Định nghĩa endpoints + middleware
controllers/[module].controller.ts → Request handling + response
services/[module].service.ts   → Business logic + Prisma queries
validators/[module].validator.ts → Zod schemas
__tests__/[module].test.ts     → Unit tests
__tests__/[module].property.test.ts → Property-based tests
```

#### Routes Pattern
```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as controller from '../controllers/[module].controller';
import * as validator from '../validators/[module].validator';

const router = Router();

// Public routes
router.get('/', controller.getAll);

// Protected routes
router.post('/', authenticate, validator.create, controller.create);
router.put('/:id', authenticate, authorize(['admin']), controller.update);

export default router;
```

#### Controllers Pattern
```typescript
import { Request, Response, NextFunction } from 'express';
import * as service from '../services/[module].service';
import { successResponse } from '../utils/response.util';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getAll(req.query);
    res.json(successResponse(result));
  } catch (error) {
    next(error); // Pass to errorHandler middleware
  }
};
```

#### Services Pattern
```typescript
import prisma from '../config/database';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

export const create = async (data: CreateInput) => {
  // Check business rules
  const existing = await prisma.model.findUnique({ where: { id: data.id } });
  if (existing) {
    throw new ConflictError('Already exists');
  }

  // Use transaction for multiple operations
  return await prisma.$transaction(async (tx) => {
    const item = await tx.model.create({ data });
    await tx.log.create({ data: { action: 'created', itemId: item.id } });
    return item;
  });
};
```

#### Validators Pattern
```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';

const createSchema = z.object({
  title: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

export const create = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = createSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
};
```

#### Error Handling
```typescript
// Custom errors trong middleware/errorHandler.ts
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string, public details?: any) {
    super(message);
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
}

export class ConflictError extends Error {
  statusCode = 409;
}

export class UnauthorizedError extends Error {
  statusCode = 401;
}
```

#### Testing Pattern
```typescript
// Unit test
describe('Module Tests', () => {
  beforeEach(async () => {
    // Clean test data
    await prisma.model.deleteMany({ where: { email: { contains: 'test' } } });
  });

  it('should create successfully', async () => {
    const response = await request(app)
      .post('/api/module')
      .send({ /* valid data */ });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should fail with validation error', async () => {
    const response = await request(app)
      .post('/api/module')
      .send({ /* invalid data */ });

    expect(response.status).toBe(400);
  });
});

// Property-based test
import fc from 'fast-check';

describe('Property Tests', () => {
  it('should handle any valid input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 255 }),
        fc.emailAddress(),
        async (title, email) => {
          const response = await request(app)
            .post('/api/module')
            .send({ title, email });
          
          expect([200, 201, 400, 409]).toContain(response.status);
        }
      )
    );
  });
});
```

### Frontend (Next.js 15 + TypeScript + Tailwind CSS)

#### Page Pattern (App Router)
```typescript
// app/dashboard/events/page.tsx — Server Component (default)
import { EventList } from '@/components/events/event-list';

export default async function EventsPage() {
  // Có thể fetch data trực tiếp trong Server Component
  return (
    <div className="container mx-auto">
      <EventList />
    </div>
  );
}
```

#### Client Component Pattern
```typescript
'use client'; // Bắt buộc khi cần hooks, state, event handlers

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export default function MyForm({ title, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <div className="container mx-auto">
      {/* Tailwind CSS classes */}
    </div>
  );
}
```

#### API Calls Pattern
```typescript
// lib/api.ts
export async function fetchEvents(filters?: EventFilters) {
  const response = await fetch('/api/events?' + new URLSearchParams(filters));
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}
```

### Database (Prisma)

#### Query Patterns
```typescript
// Find with relations
const event = await prisma.event.findUnique({
  where: { id },
  include: {
    category: true,
    department: true,
    registrations: {
      include: { user: true }
    }
  }
});

// Pagination
const events = await prisma.event.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { start_time: 'desc' }
});

// Aggregation
const stats = await prisma.registration.groupBy({
  by: ['event_id'],
  _count: { id: true }
});
```

---

## 🚦 RÀNG BUỘC CỨNG

### Security
- ❌ **Không hard-code secrets** – dùng `.env` file (DATABASE_URL, JWT_SECRET, SMTP_*)
- ❌ **Không lưu password plain text** – luôn hash với bcrypt (salt rounds = 10)
- ❌ **Không bỏ qua JWT validation** – verify token trong authenticate middleware
- ❌ **Không tin tưởng user input** – validate mọi input với Zod
- ✅ **Luôn dùng Prisma parameterized queries** – tránh SQL injection
- ✅ **Luôn sanitize output** – tránh XSS attacks

### Code Quality
- ❌ **Không dùng `any` type** – khai báo types/interfaces đầy đủ
- ❌ **Không viết logic trong routes/controllers** – chỉ handle request/response
- ❌ **Không skip error handling** – mọi async function phải có try-catch hoặc .catch()
- ❌ **Không commit code chưa test** – tests phải pass trước khi commit
- ✅ **Luôn dùng TypeScript strict mode** – đã config trong tsconfig.json
- ✅ **Luôn validate với Zod** – không validate thủ công

### Database
- ❌ **Không query trong loops** – dùng `findMany` với `where: { id: { in: ids } }`
- ❌ **Không quên transactions** – operations thay đổi nhiều bảng phải dùng `prisma.$transaction`
- ❌ **Không expose sensitive data** – exclude password_hash khi return user
- ✅ **Luôn dùng indexes** – đã define trong schema.prisma
- ✅ **Luôn handle unique constraints** – catch Prisma errors và throw ConflictError

### Testing
- ❌ **Không skip tests** – mỗi module phải có unit tests + property tests
- ❌ **Không test production database** – dùng test database riêng
- ❌ **Không để tests phụ thuộc nhau** – mỗi test phải độc lập
- ✅ **Luôn cleanup test data** – dùng beforeEach/afterEach
- ✅ **Luôn test edge cases** – empty input, null, undefined, max length, etc.

### Documentation
- ❌ **Không tạo markdown files lẻ** – chỉ update docs/ hoặc backend/docs/
- ❌ **Không để markdown ở root** – phải trong docs/ folder
- ❌ **Không tạo docs cho mỗi thay đổi nhỏ** – chỉ update khi hoàn thành module
- ✅ **Luôn update IMPLEMENTATION_CHECKLIST.md** – đánh dấu module đã hoàn thành
- ✅ **Luôn comment code phức tạp** – giải thích "why", không "what"

### Git
- ✅ **Commit messages rõ ràng**: `feat: add registration module`, `fix: handle duplicate registration`
- ✅ **Commit từng module**: Không commit nhiều modules cùng lúc
- ✅ **Test trước khi commit**: `npm test` phải pass

---

## 🧪 TESTING GUIDELINES

### Test Structure
Mỗi module phải có 2 loại tests:

1. **Unit Tests** (`__tests__/[module].test.ts`)
   - Test từng endpoint với specific cases
   - Test validation errors
   - Test business logic errors
   - Test success cases
   - Test edge cases (empty, null, max values)

2. **Property-Based Tests** (`__tests__/[module].property.test.ts`)
   - Test với random inputs (fast-check)
   - Verify universal properties
   - Find edge cases tự động

### Test Commands
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm test -- auth.test.ts    # Run specific file
```

### Test Data Management
```typescript
// Clean test data trước mỗi test
beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: 'test' } }
  });
});

// Hoặc dùng test database riêng
// DATABASE_URL="postgresql://postgres:postgres@localhost:5432/event_management_test"
```

### Test Coverage Requirements
- Controllers: 80%+
- Services: 90%+
- Validators: 100%
- Overall: 80%+

### Property-Based Testing với fast-check
```typescript
import fc from 'fast-check';

// Test với random strings
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 255 }),
    async (title) => {
      // Test logic
    }
  )
);

// Test với random emails
fc.assert(
  fc.property(
    fc.emailAddress(),
    async (email) => {
      // Test logic
    }
  )
);

// Test với random integers
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 1000 }),
    async (capacity) => {
      // Test logic
    }
  )
);
```

### Manual Testing
- Dùng Postman/Thunder Client để test APIs
- Dùng Prisma Studio để xem database: `npm run prisma:studio`
- Test với Docker database: `docker-compose up -d`

---

## 🗄️ DATABASE GUIDELINES

### Prisma Commands
```bash
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open database GUI
npm run prisma:seed        # Seed initial data
```

### Migration Workflow
```bash
# 1. Sửa schema.prisma
# 2. Tạo migration
npx prisma migrate dev --name add_new_field

# 3. Generate client
npm run prisma:generate

# 4. Update code để dùng field mới
```

### Query Best Practices
```typescript
// ✅ Good: Include relations
const event = await prisma.event.findUnique({
  where: { id },
  include: { category: true, department: true }
});

// ❌ Bad: N+1 queries
for (const event of events) {
  const category = await prisma.category.findUnique({ where: { id: event.category_id } });
}

// ✅ Good: Batch query
const events = await prisma.event.findMany({
  include: { category: true }
});

// ✅ Good: Transaction
await prisma.$transaction(async (tx) => {
  const registration = await tx.registration.create({ data });
  await tx.notification.create({ data: { user_id: registration.user_id } });
});

// ✅ Good: Exclude sensitive fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    full_name: true,
    // password_hash: false (excluded)
  }
});
```

### Docker Database
```bash
# Start database
docker-compose up -d

# Stop database
docker-compose stop

# View logs
docker-compose logs -f postgres

# Connect to database
docker exec -it postgres-event-mgmt psql -U postgres -d event_management

# Backup
docker exec postgres-event-mgmt pg_dump -U postgres event_management > backup.sql

# Restore
docker exec -i postgres-event-mgmt psql -U postgres -d event_management < backup.sql
```

---

## 📁 FILE ORGANIZATION

### Backend Structure
```
backend/
├── src/
│   ├── routes/           # API endpoints
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, error handling
│   ├── validators/       # Zod schemas
│   ├── config/           # Database, JWT, email
│   ├── utils/            # Helper functions
│   ├── types/            # TypeScript types
│   ├── constants/        # Constants, enums
│   └── __tests__/        # Tests
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed data
└── docs/                 # Backend documentation
```

### Frontend Structure
```
frontend/
├── app/                  # Next.js App Router
│   ├── (auth)/          # Auth pages group
│   ├── dashboard/       # Dashboard pages
│   └── layout.tsx       # Root layout
├── components/          # UI components
│   ├── ui/             # Reusable UI components
│   └── landing/        # Landing page components
└── lib/                # Utilities, API calls
```

### Documentation Structure
```
docs/                    # Project-level docs
backend/docs/           # Backend-specific docs
frontend/docs/          # Frontend-specific docs (nếu cần)
.agents/                # AI agent context
.kiro/specs/           # Kiro specs
```

**Quy tắc**:
- Không tạo markdown files ở root
- Không tạo docs cho mỗi thay đổi nhỏ
- Chỉ update docs khi hoàn thành module hoặc có thay đổi lớn

---

## ✅ CHECKLIST TRƯỚC KHI HOÀN THÀNH

Tự kiểm tra các mục sau trước khi báo hoàn thành:

### Code Quality
- [ ] Code TypeScript type-safe, không có `any`
- [ ] Tuân thủ pattern: Routes → Controllers → Services → Prisma
- [ ] Không có logic trong routes/controllers
- [ ] Error handling đầy đủ (try-catch, custom errors)
- [ ] Input validation với Zod
- [ ] Không hard-code secrets
- [ ] Password đã hash với bcrypt
- [ ] Sensitive data đã exclude (password_hash)

### Database
- [ ] Dùng Prisma transactions cho multi-table operations
- [ ] Không có N+1 queries
- [ ] Indexes đã define trong schema
- [ ] Unique constraints được handle đúng

### Testing
- [ ] Unit tests đã viết và pass
- [ ] Property-based tests đã viết (nếu cần)
- [ ] Test coverage >= 80%
- [ ] Manual testing với Postman/Thunder Client
- [ ] Test với Docker database

### Documentation
- [ ] Update IMPLEMENTATION_CHECKLIST.md
- [ ] Comment code phức tạp
- [ ] Không tạo markdown files lẻ
- [ ] API endpoints đã document (nếu cần)

### Git
- [ ] Commit message rõ ràng
- [ ] Không commit nhiều modules cùng lúc
- [ ] Tests pass trước khi commit

---

## 🎯 MODULE IMPLEMENTATION PRIORITY

Theo `backend/docs/IMPLEMENTATION_CHECKLIST.md`:

### ✅ Đã hoàn thành (2/9)
1. Auth Module (7 endpoints) - 100%
2. Events Module (7 endpoints) - 100%

### 🔴 Priority 1: Critical (Tuần này)
3. Registrations Module (5 endpoints)
4. Check-in Module (3 endpoints)

### 🟡 Priority 2: High (Tuần sau)
5. Training Points Module (4 endpoints)
6. Feedback Module (3 endpoints)

### 🟢 Priority 3: Medium
7. Notifications Module (4 endpoints)
8. Users Module (5 endpoints)

### 🔵 Priority 4: Low
9. Statistics Module (5 endpoints)

**Khi được yêu cầu implement module mới, ưu tiên theo thứ tự trên.**

---

## 🏁 TIÊU CHÍ THÀNH CÔNG

Một module được coi là hoàn thành tốt nếu:

### Functionality
- **Đúng chức năng** – đáp ứng đầy đủ requirements trong design doc
- **Business logic đúng** – validate constraints, handle edge cases
- **Error handling đầy đủ** – mọi error case đều được handle

### Performance
- **API response time** < 500ms (local)
- **Không có N+1 queries** – dùng include/select đúng cách
- **Database indexes** – query trên indexed fields

### Code Quality
- **Type-safe** – không có `any`, đầy đủ types/interfaces
- **Clean code** – dễ đọc, functions nhỏ gọn, naming rõ ràng
- **Tuân thủ patterns** – Routes → Controllers → Services → Prisma
- **No code smells** – không duplicate, không dead code

### Testing
- **Tests pass** – 100% tests pass
- **Coverage >= 80%** – đủ coverage cho controllers/services
- **Edge cases covered** – test empty, null, max values, duplicates

### Security
- **No security issues** – validate input, hash passwords, verify JWT
- **No secrets exposed** – dùng .env, không hard-code
- **SQL injection safe** – dùng Prisma parameterized queries

### Documentation
- **Code comments** – giải thích logic phức tạp
- **Checklist updated** – đánh dấu module hoàn thành
- **API documented** – endpoints, request/response formats (nếu cần)

---

## 🚀 QUICK START

### Khi bắt đầu làm việc:

1. **Đọc context này** – hiểu rõ quy tắc và patterns
2. **Xem design doc** – `.kiro/specs/university-event-management/design.md`
3. **Check checklist** – `backend/docs/IMPLEMENTATION_CHECKLIST.md`
4. **Xem code mẫu** – `backend/src/routes/auth.routes.ts`, `backend/src/__tests__/auth.test.ts`
5. **Start Docker** – `cd backend && docker-compose up -d`
6. **Run tests** – `npm test` để đảm bảo môi trường OK

### Khi implement module mới:

1. Tạo 5 files: routes, controllers, services, validators, tests
2. Copy template từ module đã có (auth hoặc events)
3. Implement từng layer: validators → services → controllers → routes
4. Viết tests song song với code
5. Run tests liên tục: `npm run test:watch`
6. Manual test với Postman
7. Check database với Prisma Studio
8. Update checklist và commit

### Khi gặp lỗi:

1. Đọc error message kỹ
2. Check logs trong terminal
3. Check database với Prisma Studio
4. Debug với console.log (nhớ xóa sau)
5. Run tests để verify fix
6. Không bỏ qua lỗi, phải fix triệt để

---

## 📚 TÀI LIỆU THAM KHẢO

### Project Docs
- Design: `.kiro/specs/university-event-management/design.md`
- Checklist: `backend/docs/IMPLEMENTATION_CHECKLIST.md`
- Database: `backend/docs/database/DATABASE_DESIGN.md`
- Docker: `backend/docs/DOCKER_GUIDE.md`

### Code Examples
- Auth module: `backend/src/routes/auth.routes.ts`
- Events module: `backend/src/routes/events.routes.ts`
- Tests: `backend/src/__tests__/auth.test.ts`

### Tech Stack Docs
- Express.js: https://expressjs.com/
- Prisma: https://www.prisma.io/docs
- Zod: https://zod.dev/
- Jest: https://jestjs.io/
- fast-check: https://fast-check.dev/
- Next.js: https://nextjs.org/docs

---

Luôn nhớ: **Type-safe, Test-driven, Clean code, Security first.**

Happy coding! 🎯


---

## 🎨 FRONTEND GUIDELINES (Next.js 15)

### Key Points
- **Framework**: Next.js 15 with App Router
- **Không import default React**: Next.js 13+ không cần `import React`, chỉ import hooks cần thiết
- **Toast Library**: Sử dụng `sonner`
- **Client Components**: Thêm `'use client'` directive khi cần hooks/state/event handlers
- **Server Components**: Default là Server Components, tận dụng khi có thể
- **Navigation**: Dùng `next/navigation` cho routing, `next/link` cho links
- **Image**: Dùng `next/image` thay cho thẻ `<img>`

### Common Imports
```typescript
// ✅ Correct — Client Component
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// ❌ Wrong
import React, { useState } from 'react';  // Không import React default
import { toast } from 'react-hot-toast';    // Dùng sonner, không dùng react-hot-toast
import { useRouter } from 'next/router';    // Dùng next/navigation, không dùng next/router
```

### Component Structure
```typescript
'use client'; // Bắt buộc khi dùng hooks/state/event handlers

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function MyComponent() {
  const router = useRouter();
  // Component logic
}
```

### API Response Handling
Backend trả về format:
```typescript
{
  success: boolean;
  data: {
    items: T[];      // For paginated lists
    pagination: {...}
  } | T;             // For single item
  message?: string;
}
```

Luôn check structure khi fetch:
```typescript
const response = await api.get('/events');
const events = response?.data?.items || [];
```
