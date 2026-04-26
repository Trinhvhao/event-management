/**
 * Transform event data from Prisma to API response format
 * Maps _count.registrations to current_registrations
 */
export const transformEvent = (event: any) => {
    if (!event) return event;

    const { _count, ...rest } = event;

    return {
        ...rest,
        event_cost: Number(rest.event_cost ?? 0),
        current_registrations: _count?.registrations ?? 0,
    };
};

/**
 * Transform array of events
 */
export const transformEvents = (events: any[]) => {
    return events.map(transformEvent);
};
