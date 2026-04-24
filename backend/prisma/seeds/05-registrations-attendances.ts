import { PrismaClient, Event, User } from '@prisma/client';
import { generateQRCode } from './utils';

export async function seedRegistrationsAndAttendances(
    prisma: PrismaClient,
    events: { completedEvent: Event; completedEvent2: Event; ongoingEvent: Event; upcomingEvent1: Event },
    users: { organizers: User[]; students: User[] }
) {
    console.log('📝 Seeding registrations and attendances...');

    const { completedEvent, completedEvent2, ongoingEvent, upcomingEvent1 } = events;
    const { organizers, students } = users;
    const registrations = [];

    // Completed Event 1 - All students registered
    for (let i = 0; i < students.length; i++) {
        const qr = await generateQRCode(students[i].id, completedEvent.id);
        const reg = await prisma.registration.create({
            data: {
                user_id: students[i].id,
                event_id: completedEvent.id,
                qr_code: qr,
                status: 'attended',
            },
        });
        registrations.push(reg);
    }

    // Completed Event 2 - 3 students registered
    for (let i = 0; i < 3; i++) {
        const qr = await generateQRCode(students[i].id, completedEvent2.id);
        const reg = await prisma.registration.create({
            data: {
                user_id: students[i].id,
                event_id: completedEvent2.id,
                qr_code: qr,
                status: 'attended',
            },
        });
        registrations.push(reg);
    }

    // Ongoing Event - 4 students registered
    for (let i = 0; i < 4; i++) {
        const qr = await generateQRCode(students[i].id, ongoingEvent.id);
        const reg = await prisma.registration.create({
            data: {
                user_id: students[i].id,
                event_id: ongoingEvent.id,
                qr_code: qr,
                status: 'registered',
            },
        });
        registrations.push(reg);
    }

    // Upcoming Event 1 - 2 students registered
    for (let i = 0; i < 2; i++) {
        const qr = await generateQRCode(students[i].id, upcomingEvent1.id);
        const reg = await prisma.registration.create({
            data: {
                user_id: students[i].id,
                event_id: upcomingEvent1.id,
                qr_code: qr,
                status: 'registered',
            },
        });
        registrations.push(reg);
    }

    console.log(`✅ Created ${registrations.length} registrations`);

    // Create Attendances for completed events
    const attendances = [];

    // Completed Event 1 - All 5 students attended
    for (let i = 0; i < 5; i++) {
        const attendance = await prisma.attendance.create({
            data: {
                registration_id: registrations[i].id,
                checked_by: organizers[0].id,
                checked_in_at: new Date(completedEvent.start_time.getTime() + 10 * 60000),
                status: 'checked_in',
            },
        });
        attendances.push(attendance);
    }

    // Completed Event 2 - Only 2 out of 3 attended
    for (let i = 5; i < 7; i++) {
        const attendance = await prisma.attendance.create({
            data: {
                registration_id: registrations[i].id,
                checked_by: organizers[1].id,
                checked_in_at: new Date(completedEvent2.start_time.getTime() + 5 * 60000),
                status: 'checked_in',
            },
        });
        attendances.push(attendance);
    }

    // Ongoing Event - 2 students already checked in
    for (let i = 8; i < 10; i++) {
        const attendance = await prisma.attendance.create({
            data: {
                registration_id: registrations[i].id,
                checked_by: organizers[0].id,
                checked_in_at: new Date(ongoingEvent.start_time.getTime() + 15 * 60000),
                status: 'checked_in',
            },
        });
        attendances.push(attendance);
    }

    console.log(`✅ Created ${attendances.length} attendances`);
    return { registrations, attendances };
}
