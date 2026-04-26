/**
 * Calendar utilities for generating calendar links and ICS files
 */

export interface CalendarEventData {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
}

/**
 * Format date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Format date to Google Calendar format (YYYYMMDDTHHMMSSZ)
 */
function formatGoogleDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEventData): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`,
        details: event.description || '',
        location: event.location || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Web URL
 */
export function generateOutlookUrl(event: CalendarEventData): string {
    const params = new URLSearchParams({
        subject: event.title,
        startdt: event.start.toISOString(),
        enddt: event.end.toISOString(),
        body: event.description || '',
        location: event.location || '',
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function generateYahooCalendarUrl(event: CalendarEventData): string {
    const params = new URLSearchParams({
        title: event.title,
        st: formatGoogleDate(event.start),
        et: formatGoogleDate(event.end),
        desc: event.description || '',
        loc: event.location || '',
    });
    return `https://calendar.yahoo.com/?v=60&view=d&type=20&${params.toString()}`;
}

/**
 * Generate ICS file content
 */
export function generateICSContent(event: CalendarEventData): string {
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//DaiNam Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(event.start)}`,
        `DTEND:${formatICSDate(event.end)}`,
        `SUMMARY:${escapeICSText(event.title)}`,
        event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
        event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(line => line !== '');

    return icsContent.join('\r\n');
}

/**
 * Escape special characters for ICS format
 */
function escapeICSText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEventData): void {
    const icsContent = generateICSContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '').trim().replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
