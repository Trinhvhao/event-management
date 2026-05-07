import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: false });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true, email: true, full_name: true }
    });
    console.log('Students:', JSON.stringify(users, null, 2));
}
main().finally(() => { prisma.$disconnect(); pool.end(); });
