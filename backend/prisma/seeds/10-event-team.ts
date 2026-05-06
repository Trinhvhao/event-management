import { PrismaClient, EventTeamRole } from '@prisma/client';

interface SeedContext {
    departments: import('@prisma/client').Department[];
    organizers: import('@prisma/client').User[];
    extraOrganizers?: import('@prisma/client').User[];
    anchorEvents: {
        completedEvent: import('@prisma/client').Event;
        completedEvent2: import('@prisma/client').Event;
        ongoingEvent: import('@prisma/client').Event;
        upcomingEvent1: import('@prisma/client').Event;
    };
    extraEvents?: import('@prisma/client').Event[];
}

export async function seedEventTeamMembers(
    prisma: PrismaClient,
    context: SeedContext
) {
    console.log('👥 Seeding event team members...');

    const { organizers, extraOrganizers = [], anchorEvents, extraEvents = [] } = context;

    // All organizers available for team assignment
    const allOrganizers = [...organizers, ...extraOrganizers];

    const teamMembers: Array<{
        eventId: number;
        userId: number;
        role: EventTeamRole;
        addedBy: number;
    }> = [];

    // Helper to add team member (avoids duplicates)
    const addTeamMember = (
        eventId: number,
        userId: number,
        role: EventTeamRole,
        addedBy: number
    ) => {
        // Don't add if user is the event organizer (they already have implicit access)
        const event =
            anchorEvents.completedEvent.id === eventId
                ? anchorEvents.completedEvent
                : anchorEvents.completedEvent2.id === eventId
                    ? anchorEvents.completedEvent2
                    : anchorEvents.ongoingEvent.id === eventId
                        ? anchorEvents.ongoingEvent
                        : anchorEvents.upcomingEvent1.id === eventId
                            ? anchorEvents.upcomingEvent1
                            : extraEvents.find((e) => e.id === eventId);

        if (event && event.organizer_id === userId) return;

        teamMembers.push({ eventId, userId, role, addedBy });
    };

    const adminId = allOrganizers.find((u) => u.role === 'admin')?.id ?? organizers[0].id;

    // ── Anchor events (completedEvent) ──
    // Main organizer already has implicit access; add helpers
    addTeamMember(anchorEvents.completedEvent.id, organizers[1]?.id ?? allOrganizers[1].id, 'helper', adminId);
    if (allOrganizers.length > 2) {
        addTeamMember(anchorEvents.completedEvent.id, allOrganizers[2].id, 'helper', adminId);
    }

    // ── Anchor events (completedEvent2) ──
    addTeamMember(anchorEvents.completedEvent2.id, organizers[2]?.id ?? allOrganizers[2 % allOrganizers.length].id, 'helper', adminId);

    // ── Anchor events (ongoingEvent) ──
    const ongoingHelper = organizers[1] ?? allOrganizers[1 % allOrganizers.length];
    if (ongoingHelper) {
        addTeamMember(anchorEvents.ongoingEvent.id, ongoingHelper.id, 'main_organizer', adminId);
        const extraHelper = allOrganizers[3 % allOrganizers.length];
        if (extraHelper) addTeamMember(anchorEvents.ongoingEvent.id, extraHelper.id, 'helper', adminId);
    }

    // ── Anchor events (upcomingEvent1) ──
    addTeamMember(anchorEvents.upcomingEvent1.id, allOrganizers[1 % allOrganizers.length].id, 'main_organizer', adminId);
    addTeamMember(anchorEvents.upcomingEvent1.id, allOrganizers[2 % allOrganizers.length].id, 'helper', adminId);
    if (allOrganizers.length > 3) {
        addTeamMember(anchorEvents.upcomingEvent1.id, allOrganizers[3 % allOrganizers.length].id, 'helper', adminId);
    }

    // ── Extra events ──
    for (const event of extraEvents) {
        // Skip if no organizers available
        if (allOrganizers.length < 2) continue;

        // Add 1-2 helpers depending on event status
        const helperCount = event.status === 'upcoming' || event.status === 'approved' ? 2 : 1;

        for (let i = 0; i < Math.min(helperCount, allOrganizers.length - 1); i++) {
            const organizerIndex = (i + 1 + allOrganizers.length) % allOrganizers.length;
            const organizer = allOrganizers[organizerIndex];
            if (!organizer) continue;

            // Randomly assign some as main_organizer, some as helper
            const role: EventTeamRole = i === 0 && Math.random() > 0.5 ? 'main_organizer' : 'helper';
            addTeamMember(event.id, organizer.id, role, adminId);
        }
    }

    // Remove duplicates
    const uniqueTeamMembers = teamMembers.filter(
        (member, index, self) =>
            index ===
            self.findIndex(
                (m) => m.eventId === member.eventId && m.userId === member.userId
            )
    );

    // Create records
    const created: number[] = [];
    for (const member of uniqueTeamMembers) {
        // Check for existing
        const existing = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: {
                    event_id: member.eventId,
                    user_id: member.userId,
                },
            },
        });

        if (existing) continue;

        await prisma.eventTeamMember.create({
            data: {
                event_id: member.eventId,
                user_id: member.userId,
                role: member.role,
                added_by: member.addedBy,
            },
        });
        created.push(member.eventId);
    }

    console.log(`✅ Created ${created.length} event team member records`);

    return { count: created.length };
}
