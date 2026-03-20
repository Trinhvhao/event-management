import crypto from 'crypto';

// Helper function to generate QR code
export function generateQRCode(userId: number, eventId: number): string {
    const data = `${userId}-${eventId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Helper function to calculate semester
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
