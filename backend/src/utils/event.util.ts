/**
 * Transform event data from Prisma to API response format
 * Maps registrations array (filtered) to current_registrations
 * Converts relative image URLs to absolute URLs for frontend display
 */
export const transformEvent = (event: any) => {
    if (!event) return event;

    const { _count, registrations, ...rest } = event;

    // Convert relative image URLs to absolute URLs
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:7776';
    let imageUrl = rest.image_url;
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseUrl}${imageUrl}`;
    }

    // Use registrations array length if available (filtered query),
    // otherwise fall back to _count.registrations (legacy query)
    const currentRegistrations = Array.isArray(registrations)
        ? registrations.length
        : (_count?.registrations ?? 0);

    return {
        ...rest,
        image_url: imageUrl,
        event_cost: Number(rest.event_cost ?? 0),
        current_registrations: currentRegistrations,
    };
};

/**
 * Transform array of events
 */
export const transformEvents = (events: any[]) => {
    return events.map(transformEvent);
};
