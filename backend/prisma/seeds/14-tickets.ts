import { Event, PrismaClient, Registration, TicketStatus, User } from '@prisma/client';
import QRCode from 'qrcode';

function generateTicketCode(): string {
    const prefix = 'VE';
    const eventId = 'EVT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${eventId}-${timestamp.slice(-4)}${random}`;
}

interface TicketSeedContext {
    events: Event[];
    registrations: Registration[];
    users: User[];
}

async function generateQRImage(registration: Registration, ticketCode: string): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const qrPayload = {
        ticket_code: ticketCode,
        registration_id: registration.id,
        event_id: registration.event_id,
        user_id: registration.user_id,
        issued_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
    };

    return QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
    });
}

export async function seedTickets(
    prisma: PrismaClient,
    context: TicketSeedContext
) {
    console.log('🎫 Seeding tickets...');

    const { registrations } = context;

    // Only create tickets for active (registered) registrations
    const eligibleRegistrations = registrations.filter((r) => r.status === 'registered');

    let created = 0;
    let skipped = 0;

    for (const registration of eligibleRegistrations) {
        // Check if ticket already exists
        const existingTicket = await prisma.ticket.findUnique({
            where: { registration_id: registration.id },
        });

        if (existingTicket) {
            skipped += 1;
            continue;
        }

        const ticketCode = generateTicketCode();
        const qrData = JSON.stringify({
            registrationId: registration.id,
            eventId: registration.event_id,
            userId: registration.user_id,
            timestamp: Date.now(),
        });

        // Determine ticket status based on event status
        // For completed/cancelled events: ticket is expired
        const event = context.events.find((e) => e.id === registration.event_id);
        let ticketStatus: TicketStatus = 'valid';
        let sentAt: Date | null = new Date(registration.registered_at.getTime() + 60000);

        if (event) {
            if (event.status === 'completed') {
                ticketStatus = 'used';
            } else if (event.status === 'cancelled') {
                ticketStatus = 'cancelled';
            } else if (event.end_time < new Date()) {
                ticketStatus = 'expired';
            }
        }

        // Generate QR image
        const qrImage = await generateQRImage(registration, ticketCode);

        await prisma.ticket.create({
            data: {
                ticket_code: ticketCode,
                registration_id: registration.id,
                qr_data: qrData,
                qr_image: qrImage,
                pdf_url: null,
                status: ticketStatus,
                sent_at: ticketStatus === 'valid' ? sentAt : null,
            },
        });

        created += 1;
    }

    console.log(`  ✓ Seeded ${created} tickets (${skipped} skipped - already existed)`);
    return { created, skipped };
}
