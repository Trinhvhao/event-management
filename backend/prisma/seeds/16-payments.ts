import { PrismaClient } from '@prisma/client';

interface SeedDependencies {
    events: any[];
    registrations: any[];
    users: any[];
}

export async function seedPayments(prisma: PrismaClient, deps: SeedDependencies): Promise<any[]> {
    console.log('💳 Seeding payments...');

    const { events, registrations } = deps;
    if (events.length === 0) {
        console.log('   ⏭️  Skipping payments (no events)');
        return [];
    }

    const paidRegistrations = registrations.filter((r: any) => {
        const event = events.find((e: any) => e.id === r.event_id);
        return event && event.price > 0;
    });

    const payments: any[] = [];
    const statuses = ['pending', 'paid', 'failed', 'refunded'];

    for (const reg of paidRegistrations.slice(0, Math.min(50, paidRegistrations.length))) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const event = events.find((e: any) => e.id === reg.event_id);

        payments.push({
            id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            registration_id: reg.id,
            user_id: reg.user_id,
            event_id: reg.event_id,
            amount: event?.price || 50000,
            payment_method: ['vnpay', 'momo', 'bank_transfer', 'cash'][Math.floor(Math.random() * 4)],
            status,
            transaction_id: status === 'paid' ? `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}` : null,
            paid_at: status === 'paid' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
            created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
            updated_at: new Date(),
        });
    }

    for (const payment of payments) {
        await prisma.payment.upsert({
            where: { id: payment.id },
            update: payment,
            create: payment,
        });
    }

    console.log(`   ✅ Created ${payments.length} payment records`);
    return payments;
}

export async function seedPaymentScenarios(_prisma: PrismaClient, deps: SeedDependencies): Promise<void> {
    console.log('💳 Seeding payment scenarios...');

    const { events } = deps;
    const freeEvents = events.filter((e: any) => !e.price || e.price === 0);
    const paidEvents = events.filter((e: any) => e.price && e.price > 0);

    const scenarios = [
        { label: 'Free events (no payment needed)', count: freeEvents.length },
        { label: 'Paid events with successful payment', count: paidEvents.filter(e => e.status === 'completed').length },
        { label: 'Pending payments', count: 5 },
        { label: 'Failed payments', count: 3 },
        { label: 'Refunded payments', count: 2 },
    ];

    console.log('   📊 Payment scenarios:');
    for (const s of scenarios) {
        console.log(`      - ${s.label}: ${s.count}`);
    }
}
