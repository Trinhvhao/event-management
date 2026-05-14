import {
    Event,
    EventTeamActivity,
    EventTeamMember,
    EventTeamRole,
    PrismaClient,
    TeamActionType,
    User,
} from '@prisma/client';

interface ActivitySeedContext {
    anchorEvents: {
        completedEvent: Event;
        completedEvent2: Event;
        ongoingEvent: Event;
        upcomingEvent1: Event;
    };
    extraEvents: Event[];
    teamMembers: EventTeamMember[];
    allUsers: User[];
}

export async function seedEventTeamActivities(
    prisma: PrismaClient,
    context: ActivitySeedContext
) {
    console.log('📋 Seeding event team activities...');

    const { anchorEvents, extraEvents, allUsers } = context;
    const admin = allUsers.find((u) => u.role === 'admin') ?? allUsers[0];
    const organizers = allUsers.filter((u) => u.role === 'organizer');

    const allEvents = [
        anchorEvents.completedEvent,
        anchorEvents.completedEvent2,
        anchorEvents.ongoingEvent,
        anchorEvents.upcomingEvent1,
        ...extraEvents,
    ].filter((e) => e.deleted_at === null);

    const activityPayloads: Array<{
        event_id: number;
        actor_id: number;
        action_type: TeamActionType;
        target_user_id?: number | null;
        metadata: Record<string, unknown>;
        ip_address: string;
        created_at: Date;
    }> = [];

    for (const event of allEvents) {
        const actor = organizers.find((o) => o.id === event.organizer_id) ?? organizers[0];
        const dayOffset = Math.floor((Date.now() - event.start_time.getTime()) / (1000 * 60 * 60 * 24));

        // Activity: team member added
        activityPayloads.push({
            event_id: event.id,
            actor_id: actor.id,
            action_type: 'team_member_added',
            metadata: { role: 'helper', source: 'seed' },
            ip_address: '192.168.1.10',
            created_at: new Date(event.created_at.getTime() + 60000),
        });

        // Activity: event published
        if (event.status !== 'pending') {
            activityPayloads.push({
                event_id: event.id,
                actor_id: actor.id,
                action_type: 'event_published',
                metadata: { previousStatus: 'pending' },
                ip_address: '192.168.1.10',
                created_at: new Date(event.created_at.getTime() + 120000),
            });
        }

        // Activity: registration approved
        if (event.status !== 'pending') {
            activityPayloads.push({
                event_id: event.id,
                actor_id: actor.id,
                action_type: 'registration_approved',
                metadata: { count: Math.floor(event.capacity * 0.6) },
                ip_address: '192.168.1.11',
                created_at: new Date(event.start_time.getTime() - 7 * 24 * 60 * 60 * 1000),
            });
        }

        // Activity: attendee checked in (for completed/ongoing)
        if (event.status === 'completed' || event.status === 'ongoing') {
            activityPayloads.push({
                event_id: event.id,
                actor_id: actor.id,
                action_type: 'attendee_checked_in',
                metadata: { count: Math.floor(event.capacity * 0.7) },
                ip_address: '192.168.1.12',
                created_at: event.start_time,
            });

            // Activity: points awarded
            activityPayloads.push({
                event_id: event.id,
                actor_id: actor.id,
                action_type: 'points_awarded',
                metadata: { points: event.training_points, recipients: Math.floor(event.capacity * 0.7) },
                ip_address: '192.168.1.13',
                created_at: new Date(event.end_time.getTime() + 30 * 60 * 1000),
            });
        }

        // Activity: event updated (for events with future dates)
        if (dayOffset < 0) {
            activityPayloads.push({
                event_id: event.id,
                actor_id: actor.id,
                action_type: 'event_updated',
                metadata: { field: 'description', source: 'seed' },
                ip_address: '192.168.1.14',
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            });
        }

        // Activity: event cancelled (for cancelled events)
        if (event.status === 'cancelled') {
            activityPayloads.push({
                event_id: event.id,
                actor_id: actor.id,
                action_type: 'event_cancelled',
                metadata: { reason: 'seed-data', source: 'seed' },
                ip_address: '192.168.1.15',
                created_at: new Date(event.start_time.getTime() - 2 * 24 * 60 * 60 * 1000),
            });
        }
    }

    if (activityPayloads.length > 0) {
        await prisma.eventTeamActivity.createMany({
            data: activityPayloads,
            skipDuplicates: true,
        });
    }

    console.log(`  ✓ Seeded ${activityPayloads.length} event team activities`);
    return { count: activityPayloads.length };
}
