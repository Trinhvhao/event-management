import { Event, EventTeamRole, PrismaClient } from '@prisma/client';

interface PermissionSeedContext {
    anchorEvents: {
        completedEvent: Event;
        completedEvent2: Event;
        ongoingEvent: Event;
        upcomingEvent1: Event;
    };
    extraEvents: Event[];
}

type PermissionDef = {
    permission: string;
    role: EventTeamRole;
    allowed: boolean;
};

export async function seedEventTeamPermissions(
    prisma: PrismaClient,
    context: PermissionSeedContext
) {
    console.log('🔐 Seeding event team permissions...');

    const { anchorEvents, extraEvents } = context;

    const allEvents = [
        anchorEvents.completedEvent,
        anchorEvents.completedEvent2,
        anchorEvents.ongoingEvent,
        anchorEvents.upcomingEvent1,
        ...extraEvents,
    ].filter((e) => e.deleted_at === null);

    // Sample permission overrides to create interesting demo data:
    // Some events have custom permission settings
    const customOverrides: Array<{
        eventId: number;
        role: EventTeamRole;
        permission: string;
        allowed: boolean;
        updatedBy: number;
    }> = [];

    for (const event of allEvents) {
        if (event.organizer_id === null) continue;

        // For completed events: helpers can also award points (override)
        if (event.status === 'completed') {
            customOverrides.push({
                eventId: event.id,
                role: 'helper',
                permission: 'award_points',
                allowed: true,
                updatedBy: event.organizer_id,
            });
        }

        // For large capacity events: main_organizer also has checkin
        if (event.capacity >= 200) {
            customOverrides.push({
                eventId: event.id,
                role: 'main_organizer',
                permission: 'checkin',
                allowed: true,
                updatedBy: event.organizer_id,
            });
        }

        // For upcoming events: deny helpers view_feedback (override)
        if (event.status === 'upcoming') {
            customOverrides.push({
                eventId: event.id,
                role: 'helper',
                permission: 'view_feedback',
                allowed: false,
                updatedBy: event.organizer_id,
            });
        }

        // For approved events with registration: helpers can manage registrations
        if (event.status === 'approved') {
            customOverrides.push({
                eventId: event.id,
                role: 'helper',
                permission: 'manage_registrations',
                allowed: true,
                updatedBy: event.organizer_id,
            });
        }
    }

    let created = 0;
    for (const override of customOverrides) {
        await prisma.eventTeamPermission.upsert({
            where: {
                event_id_role_permission: {
                    event_id: override.eventId,
                    role: override.role,
                    permission: override.permission,
                },
            },
            update: {
                allowed: override.allowed,
                updated_by: override.updatedBy,
            },
            create: {
                event_id: override.eventId,
                role: override.role,
                permission: override.permission,
                allowed: override.allowed,
                updated_by: override.updatedBy,
            },
        });
        created += 1;
    }

    console.log(`  ✓ Seeded ${created} event team permission overrides`);
    return { count: created };
}
