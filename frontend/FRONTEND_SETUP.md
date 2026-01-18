# ✅ Frontend Setup Complete! 🎉

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Notifications**: Sonner

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   └── useEvents.ts      # Events hooks
├── lib/
│   └── axios.ts          # Axios instance with interceptors
├── services/             # API services
│   ├── authService.ts   # Auth API calls
│   └── eventService.ts  # Events API calls
├── store/               # Zustand stores
│   └── authStore.ts    # Auth state management
├── types/              # TypeScript types
│   └── index.ts       # All type definitions
├── utils/             # Utility functions
│   ├── cn.ts         # Class name utility
│   └── formatDate.ts # Date formatting utilities
├── .env.local        # Environment variables
└── .env.example      # Environment variables template
```

## 🔧 Configuration

### Environment Variables

File `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Event Management System
```

### API Integration

- **Base URL**: `http://localhost:3001/api`
- **Authentication**: JWT Bearer token
- **Auto token refresh**: Implemented in axios interceptor
- **Error handling**: Centralized in axios interceptor

## 📦 Installed Packages

### Core
- `next@16.1.3` - React framework
- `react@19.0.0` - UI library
- `typescript@5.7.3` - Type safety

### Styling
- `tailwindcss@3.4.17` - Utility-first CSS
- `clsx` - Conditional classes
- `tailwind-merge` - Merge Tailwind classes

### State & Data
- `zustand@5.0.3` - State management
- `axios@1.7.9` - HTTP client
- `react-hook-form@7.54.2` - Form handling
- `zod@3.24.1` - Schema validation
- `@hookform/resolvers@3.9.1` - Form validation

### UI & UX
- `lucide-react@0.469.0` - Icons
- `sonner@1.7.3` - Toast notifications
- `date-fns@4.1.0` - Date utilities

## ✅ Features Implemented

### 1. Authentication System
- ✅ Login/Register/Logout
- ✅ JWT token management
- ✅ Auto token refresh
- ✅ Protected routes (ready)
- ✅ Auth state persistence

### 2. API Integration
- ✅ Axios instance with interceptors
- ✅ Request/Response interceptors
- ✅ Error handling
- ✅ Token injection
- ✅ Auto refresh on 401

### 3. Type Safety
- ✅ Complete TypeScript types
- ✅ User, Event, Registration types
- ✅ API response types
- ✅ Form validation schemas

### 4. Custom Hooks
- ✅ `useAuth` - Authentication
- ✅ `useEvents` - Fetch events list
- ✅ `useEvent` - Fetch single event
- ✅ `useCategories` - Fetch categories
- ✅ `useDepartments` - Fetch departments

### 5. Services
- ✅ Auth Service (login, register, logout, etc.)
- ✅ Event Service (CRUD operations)

### 6. Utilities
- ✅ Date formatting (Vietnamese locale)
- ✅ Class name utility (cn)
- ✅ Event status helpers

## 🚀 Getting Started

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local if needed
```

### 3. Start Development Server
```bash
npm run dev
```

Server will run at: `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm start
```

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## 🎯 Next Steps

### 1. Create Pages
- [ ] `/login` - Login page
- [ ] `/register` - Register page
- [ ] `/dashboard` - Dashboard (protected)
- [ ] `/events` - Events list
- [ ] `/events/[id]` - Event detail
- [ ] `/events/create` - Create event (organizer)
- [ ] `/my-events` - My registered events
- [ ] `/profile` - User profile

### 2. Create Components
- [ ] `Navbar` - Navigation bar
- [ ] `Footer` - Footer
- [ ] `EventCard` - Event card component
- [ ] `LoginForm` - Login form
- [ ] `RegisterForm` - Register form
- [ ] `EventForm` - Create/Edit event form
- [ ] `ProtectedRoute` - Route guard component

### 3. Implement Features
- [ ] Authentication flow
- [ ] Event listing with filters
- [ ] Event registration
- [ ] QR code display
- [ ] Check-in functionality
- [ ] Training points display
- [ ] Feedback system
- [ ] Notifications

## 🔐 Authentication Flow

### Login
```typescript
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();

await login({
  email: 'student@university.edu.vn',
  password: 'password123'
});
```

### Register
```typescript
const { register } = useAuth();

await register({
  email: 'new@university.edu.vn',
  password: 'password123',
  full_name: 'Nguyen Van A',
  student_id: 'SV001',
  role: 'student',
  department_id: 1
});
```

### Logout
```typescript
const { logout } = useAuth();

await logout();
```

### Check Auth Status
```typescript
const { user, isAuthenticated } = useAuth();

if (isAuthenticated) {
  console.log('User:', user);
}
```

## 📊 Using Events

### Fetch Events List
```typescript
import { useEvents } from '@/hooks/useEvents';

const { events, loading, pagination, refetch } = useEvents({
  page: 1,
  limit: 20,
  category: '1',
  status: 'upcoming',
  search: 'workshop'
});
```

### Fetch Single Event
```typescript
import { useEvent } from '@/hooks/useEvents';

const { event, loading, refetch } = useEvent(eventId);
```

### Create Event
```typescript
import { eventService } from '@/services/eventService';

const newEvent = await eventService.create({
  title: 'Workshop AI',
  description: 'Learn AI basics',
  start_time: '2024-12-20T08:00:00',
  end_time: '2024-12-20T12:00:00',
  location: 'Room 301',
  category_id: 1,
  department_id: 1,
  capacity: 100,
  training_points: 5
});
```

## 🎨 Styling with Tailwind

```tsx
import { cn } from '@/utils/cn';

<div className={cn(
  'bg-white rounded-lg shadow-md p-4',
  isActive && 'border-2 border-blue-500',
  isDisabled && 'opacity-50 cursor-not-allowed'
)}>
  Content
</div>
```

## 📅 Date Formatting

```typescript
import { formatDate, formatDateTime, formatRelativeTime } from '@/utils/formatDate';

formatDate(event.start_time);           // "20 tháng 12, 2024"
formatDateTime(event.start_time);       // "20 tháng 12, 2024 8:00 SA"
formatRelativeTime(event.start_time);   // "trong 2 ngày"
```

## 🔔 Notifications

```typescript
import { toast } from 'sonner';

toast.success('Đăng ký thành công!');
toast.error('Có lỗi xảy ra!');
toast.info('Thông tin quan trọng');
toast.warning('Cảnh báo!');
```

## 🛡️ Protected Routes (To Implement)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/events/create', '/profile']
};
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Axios](https://axios-http.com/)

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Cannot connect to API
- Check backend is running on `http://localhost:3001`
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Check CORS is enabled in backend

### TypeScript errors
```bash
npm run build
# Fix any type errors shown
```

---

**Frontend setup hoàn tất! Sẵn sàng phát triển UI! 🎨**
