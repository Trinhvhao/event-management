# Landing Page UniEvent Pro

## Tổng quan
Landing page hoàn chỉnh với thiết kế chuyên nghiệp, được copy từ project `unievent-pro (1)` và tích hợp vào Next.js.

## Cấu trúc Components

### Components Landing Page (frontend/components/landing/)
- **Button.tsx** - Component button tái sử dụng với nhiều variants
- **Hero.tsx** - Hero section với animation và 3D effects
- **Features.tsx** - Bento grid hiển thị tính năng với visual components
- **Stats.tsx** - Thống kê với counter animation
- **AppShowcase.tsx** - Showcase ứng dụng mobile với phone mockup
- **Process.tsx** - Quy trình 4 bước với timeline animation
- **Security.tsx** - Section bảo mật với spinning rings animation
- **EventShowcase.tsx** - Danh sách sự kiện với grid/calendar view
- **Leaderboard.tsx** - 🆕 Bảng xếp hạng sinh viên tiêu biểu & sự kiện xu hướng
- **Gallery.tsx** - Thư viện ảnh với bento grid layout
- **Testimonials.tsx** - Đánh giá từ khách hàng
- **FAQ.tsx** - Câu hỏi thường gặp với accordion
- **CallToAction.tsx** - CTA section cuối trang
- **FloatingWidgets.tsx** - Floating chat widgets (Zalo, Messenger, etc.)

### Components Chung (frontend/components/)
- **Navbar.tsx** - Navigation bar với scroll effect
- **Footer.tsx** - Footer với links và contact info

## Tính năng

### Animations
- Framer Motion cho smooth transitions
- Counter animations cho stats
- Floating và pulse effects
- 3D perspective transforms
- Gradient animations

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg
- Touch-friendly interactions
- Adaptive layouts

### Interactive Elements
- Smooth scroll navigation
- Hover effects
- Click interactions
- Auto-rotating showcases
- Expandable FAQ items

## Màu sắc Brand

```css
--primary: #050608 (Dark text)
--secondary: #f66600 (Orange)
--brandBlue: #00358F (Deep Blue)
--brandLightBlue: #AECCFF (Light Blue)
--offWhite: #F4F6FC (Background)
--brandRed: #FF4000 (Red accent)
```

## Chạy Development

```bash
cd frontend
npm run dev
```

Truy cập: http://localhost:3000

## Build Production

```bash
cd frontend
npm run build
npm start
```

## Dependencies Chính

- **Next.js 16** - React framework
- **React 19** - UI library
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **Tailwind CSS 4** - Styling

## Tùy chỉnh

### Thay đổi màu sắc
Chỉnh sửa trong `frontend/app/globals.css`:
```css
:root {
  --primary-color: #050608;
  --secondary-color: #f66600;
  /* ... */
}
```

### Thêm/Xóa sections
Chỉnh sửa `frontend/app/page.tsx`:
```tsx
<main className="flex-grow">
  <Hero />
  <Stats />
  {/* Thêm hoặc xóa components ở đây */}
</main>
```

### Thay đổi nội dung
Mỗi component có data hardcoded bên trong. Tìm và chỉnh sửa trực tiếp trong file component tương ứng.

## Notes

- Tất cả components đã được test và build thành công
- Không có TypeScript errors
- Responsive trên tất cả devices
- SEO-friendly với semantic HTML
- Performance optimized với Next.js

## Liên hệ

Nếu cần hỗ trợ hoặc có câu hỏi, vui lòng liên hệ team development.
