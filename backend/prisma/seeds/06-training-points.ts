import { PrismaClient, Event, User, Attendance } from '@prisma/client';
import { calculateSemester } from './utils';

export async function seedTrainingPoints(
    prisma: PrismaClient,
    events: { completedEvent: Event; completedEvent2: Event; ongoingEvent: Event },
    students: User[],
    attendances: Attendance[]
) {
    console.log('⭐ Seeding training points...');

    const { completedEvent, completedEvent2, ongoingEvent } = events;
    const trainingPoints = [];

    // Completed Event 1 - All 5 students got points
    for (let i = 0; i < 5; i++) {
        const tp = await prisma.trainingPoint.create({
            data: {
                user_id: students[i].id,
                event_id: completedEvent.id,
                points: completedEvent.training_points,
                semester: calculateSemester(completedEvent.start_time),
                earned_at: attendances[i].checked_in_at,
            },
        });
        trainingPoints.push(tp);
    }

    // Completed Event 2 - 2 students got points
    for (let i = 0; i < 2; i++) {
        const tp = await prisma.trainingPoint.create({
            data: {
                user_id: students[i].id,
                event_id: completedEvent2.id,
                points: completedEvent2.training_points,
                semester: calculateSemester(completedEvent2.start_time),
                earned_at: attendances[5 + i].checked_in_at,
            },
        });
        trainingPoints.push(tp);
    }

    // Ongoing Event - 2 students got points
    for (let i = 0; i < 2; i++) {
        const tp = await prisma.trainingPoint.create({
            data: {
                user_id: students[i].id,
                event_id: ongoingEvent.id,
                points: ongoingEvent.training_points,
                semester: calculateSemester(ongoingEvent.start_time),
                earned_at: attendances[7 + i].checked_in_at,
            },
        });
        trainingPoints.push(tp);
    }

    console.log(`✅ Created ${trainingPoints.length} training points`);
    return trainingPoints;
}
