import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ 
  connectionString,
  ssl: false
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Departments
  console.log('Creating departments...');
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CNTT' },
      update: {},
      create: {
        name: 'Khoa Công Nghệ Thông Tin',
        code: 'CNTT',
        description: 'Khoa Công Nghệ Thông Tin',
      },
    }),
    prisma.department.upsert({
      where: { code: 'KTDN' },
      update: {},
      create: {
        name: 'Khoa Kinh Tế Doanh Nghiệp',
        code: 'KTDN',
        description: 'Khoa Kinh Tế Doanh Nghiệp',
      },
    }),
    prisma.department.upsert({
      where: { code: 'NN' },
      update: {},
      create: {
        name: 'Khoa Ngoại Ngữ',
        code: 'NN',
        description: 'Khoa Ngoại Ngữ',
      },
    }),
  ]);
  console.log(`✅ Created ${departments.length} departments`);

  // Create Categories
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Học thuật' },
      update: {},
      create: {
        name: 'Học thuật',
        description: 'Hội thảo, seminar học thuật',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Ngoại khóa' },
      update: {},
      create: {
        name: 'Ngoại khóa',
        description: 'Hoạt động ngoại khóa, câu lạc bộ',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Tuyển dụng' },
      update: {},
      create: {
        name: 'Tuyển dụng',
        description: 'Ngày hội việc làm, tuyển dụng doanh nghiệp',
      },
    }),
    prisma.category.upsert({
      where: { name: 'Văn hóa' },
      update: {},
      create: {
        name: 'Văn hóa',
        description: 'Sự kiện văn hóa, nghệ thuật',
      },
    }),
  ]);
  console.log(`✅ Created ${categories.length} categories`);

  // Create Admin User
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@university.edu.vn' },
    update: {},
    create: {
      email: 'admin@university.edu.vn',
      password_hash: hashedPassword,
      full_name: 'Administrator',
      role: 'admin',
      is_active: true,
      email_verified: true,
    },
  });
  console.log('✅ Created admin user');

  // Create Organizer User
  console.log('Creating organizer user...');
  const organizerPassword = await bcrypt.hash('organizer123', 10);
  await prisma.user.upsert({
    where: { email: 'organizer@university.edu.vn' },
    update: {},
    create: {
      email: 'organizer@university.edu.vn',
      password_hash: organizerPassword,
      full_name: 'Event Organizer',
      role: 'organizer',
      department_id: departments[0].id,
      is_active: true,
      email_verified: true,
    },
  });
  console.log('✅ Created organizer user');

  // Create Student User
  console.log('Creating student user...');
  const studentPassword = await bcrypt.hash('student123', 10);
  await prisma.user.upsert({
    where: { email: 'student@university.edu.vn' },
    update: {},
    create: {
      email: 'student@university.edu.vn',
      password_hash: studentPassword,
      full_name: 'Nguyễn Văn A',
      student_id: '1671020001',
      role: 'student',
      department_id: departments[0].id,
      is_active: true,
      email_verified: true,
    },
  });
  console.log('✅ Created student user');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Default accounts:');
  console.log('Admin: admin@university.edu.vn / admin123');
  console.log('Organizer: organizer@university.edu.vn / organizer123');
  console.log('Student: student@university.edu.vn / student123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
