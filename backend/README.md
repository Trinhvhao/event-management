# Event Management System - Backend API

Backend API cho Hệ thống Quản lý Sự kiện Trường Đại học, được xây dựng với Express.js, TypeScript, và Prisma ORM.

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Email**: Nodemailer
- **QR Code**: qrcode library

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── controllers/       # Route controllers
│   ├── services/          # Business logic
│   ├── validators/        # Input validation
│   ├── utils/             # Utility functions
│   ├── jobs/              # Scheduled jobs
│   ├── types/             # TypeScript types
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── .env.example           # Environment variables template
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database với Docker (Khuyến nghị)

**⚠️ Không cần cài PostgreSQL! Chỉ cần Docker!**

**Option 1: Automated Setup (Khuyến nghị)**
```bash
chmod +x docker-setup.sh
./docker-setup.sh
# Chọn option 1 và y để có pgAdmin GUI
```

**Option 2: Docker Compose**
```bash
docker-compose up -d
# Hoặc với pgAdmin:
docker-compose --profile tools up -d
```

**Option 3: Docker Run**
```bash
docker run --name postgres-event-mgmt \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=event_management \
  -p 5432:5432 \
  -v postgres-event-data:/var/lib/postgresql/data \
  -d postgres:15-alpine
```

**Option 4: PostgreSQL đã cài sẵn**
```bash
sudo service postgresql start  # Linux
brew services start postgresql # macOS
```

**📚 Chi tiết**: Xem `DOCKER_GUIDE.md` để biết thêm về Docker setup

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/event_management"
JWT_SECRET="your-super-secret-jwt-key"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## 🐳 Docker Commands

```bash
# Start
docker-compose start

# Stop
docker-compose stop

# Logs
docker-compose logs -f postgres

# Connect to database
docker exec -it postgres-event-mgmt psql -U postgres -d event_management

# pgAdmin (nếu đã enable)
# http://localhost:5050
# Email: admin@university.edu.vn / Password: admin123

# Backup
docker exec postgres-event-mgmt pg_dump -U postgres event_management > backup.sql

# Remove everything
docker-compose down -v
```

## 📝 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with initial data

## 🔐 Default Accounts

After seeding, you can use these accounts:

- **Admin**: `admin@university.edu.vn` / `admin123`
- **Organizer**: `organizer@university.edu.vn` / `organizer123`
- **Student**: `student@university.edu.vn` / `student123`

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Events
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (Organizer)
- `PUT /api/events/:id` - Update event (Organizer)
- `DELETE /api/events/:id` - Delete event (Organizer)

### Registrations
- `POST /api/registrations` - Register for event
- `DELETE /api/registrations/:id` - Cancel registration
- `GET /api/registrations/my-events` - Get my registrations
- `GET /api/registrations/:id/qrcode` - Get QR code

### Check-in
- `POST /api/checkin/scan` - Scan QR code (Organizer)
- `GET /api/checkin/event/:eventId` - Get attendance list

### Training Points
- `GET /api/training-points/my-points` - Get my points
- `GET /api/training-points/history` - Get points history

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/event/:eventId` - Get event feedback

### Statistics
- `GET /api/statistics/overview` - Get overview statistics
- `GET /api/statistics/events` - Get event statistics
- `POST /api/statistics/export` - Export reports

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/status` - Activate/deactivate user (Admin)

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with Zod
- SQL injection prevention (Prisma)
- XSS protection

## 📊 Database Schema

See `prisma/schema.prisma` for complete database schema.

Main tables:
- `users` - User accounts
- `events` - Events
- `registrations` - Event registrations
- `attendance` - Check-in records
- `training_points` - Training points
- `feedback` - Event feedback
- `notifications` - User notifications
- `departments` - Departments
- `categories` - Event categories

## 🐛 Troubleshooting

### Database connection error
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env file
- Verify database exists

### Prisma errors
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma Client
npm run prisma:generate
```

### Port already in use
Change PORT in .env file or kill the process using port 3001

## 📚 Documentation

Xem thư mục **[docs/](./docs/)** để có tài liệu chi tiết:

- **[docs/SETUP_COMPLETE.md](./docs/SETUP_COMPLETE.md)** - ✅ Hướng dẫn sau khi setup
- **[docs/DOCKER_GUIDE.md](./docs/DOCKER_GUIDE.md)** - 🐳 Docker guide đầy đủ
- **[docs/database/](./docs/database/)** - 🗄️ Database documentation
- **[docs/AUTH_MODULE_STATUS.md](./docs/AUTH_MODULE_STATUS.md)** - 🔐 Auth module status

## 👨‍💻 Development

This project follows these design patterns:
- **MVC Pattern**: Separation of routes, controllers, and services
- **Repository Pattern**: Database access through Prisma
- **Dependency Injection**: Services injected into controllers
- **Error Handling**: Centralized error handling middleware

## 📄 License

ISC
