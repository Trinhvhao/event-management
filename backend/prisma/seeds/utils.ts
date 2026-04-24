// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode');

export async function generateQRCode(userId: number, eventId: number): Promise<string> {
    const qrData = {
        registration_id: 0,
        event_id: eventId,
        user_id: userId,
        issued_at: new Date().toISOString(),
    };
    return await QRCode.toDataURL(JSON.stringify(qrData));
}

export function calculateSemester(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (month >= 9 && month <= 12) {
        return `HK1-${year}-${year + 1}`;
    } else if (month >= 1 && month <= 5) {
        return `HK2-${year - 1}-${year}`;
    } else {
        return `HK3-${year - 1}-${year}`;
    }
}
