import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: false });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
    // Lay event 85 lam lai voi payment moi
    const event = await prisma.event.findUnique({ where: { id: 85 } });
    if (!event) throw new Error('Event 85 not found');

    const student = await prisma.user.findFirst({ where: { role: 'student', id: 111 } });
    if (!student) throw new Error('Student not found');

    // Xoa payment cu cua registration 851
    await prisma.payment.deleteMany({ where: { registration_id: 851 } });

    // Tao payment moi
    const timestamp = Math.floor(Date.now() / 1000) % 100000;
    const paymentCode = `EVT85-851-${timestamp}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const payment = await prisma.payment.create({
        data: {
            registration_id: 851,
            user_id: student.id,
            event_id: 85,
            amount: 5000,
            currency: 'VND',
            status: 'pending',
            method: 'bank_transfer',
            payos_order_id: paymentCode,
            expires_at: expiresAt,
        },
    });

    console.log(`New payment ID: ${payment.id}`);
    console.log(`Code: ${paymentCode}`);
    console.log(`Expires: ${expiresAt}`);
    console.log(`\nAccount: ${process.env.SEPAY_ACCOUNT_NUMBER}`);
    console.log(`Bank: ${process.env.SEPAY_BANK_NAME}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); }).finally(() => { prisma.$disconnect(); pool.end(); });
