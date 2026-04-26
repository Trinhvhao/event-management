/**
 * Get current semester based on date
 * Semester 1: September - January
 * Semester 2: February - June
 * Summer: July - August
 */
export const getCurrentSemester = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month >= 9 || month <= 1) {
    // Semester 1: September - January
    const academicYear = month >= 9 ? year : year - 1;
    return `${academicYear}-${academicYear + 1}-1`;
  } else if (month >= 2 && month <= 6) {
    // Semester 2: February - June
    return `${year - 1}-${year}-2`;
  } else {
    // Summer: July - August
    return `${year - 1}-${year}-summer`;
  }
};

/**
 * Check if date is in the past
 */
export const isPast = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Check if date is in the future
 */
export const isFuture = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Get hours until date
 */
export const hoursUntil = (date: Date): number => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
};

/**
 * Check if current time is within time window
 */
export const isWithinTimeWindow = (startTime: Date, endTime: Date): boolean => {
  const now = new Date();
  return now >= startTime && now <= endTime;
};

/**
 * Format date to ISO string
 */
export const toISOString = (date: Date): string => {
  return date.toISOString();
};

const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getVietnamDateParts = (date: Date) => {
  const vnDate = new Date(date.getTime() + VN_UTC_OFFSET_MS);

  return {
    year: vnDate.getUTCFullYear(),
    month: vnDate.getUTCMonth(),
    day: vnDate.getUTCDate(),
    dayOfWeek: vnDate.getUTCDay(),
  };
};

const createVietnamBoundary = (year: number, month: number, day: number): Date => {
  return new Date(Date.UTC(year, month, day) - VN_UTC_OFFSET_MS);
};

export const getVietnamDateRange = (
  range: 'today' | 'this_week' | 'this_month',
  now: Date = new Date()
): { start: Date; end: Date } => {
  const { year, month, day, dayOfWeek } = getVietnamDateParts(now);
  const startOfToday = createVietnamBoundary(year, month, day);

  if (range === 'today') {
    return {
      start: startOfToday,
      end: new Date(startOfToday.getTime() + DAY_MS - 1),
    };
  }

  if (range === 'this_week') {
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(startOfToday.getTime() + mondayOffset * DAY_MS);

    return {
      start: startOfWeek,
      end: new Date(startOfWeek.getTime() + 7 * DAY_MS - 1),
    };
  }

  const startOfMonth = createVietnamBoundary(year, month, 1);
  const startOfNextMonth = createVietnamBoundary(year, month + 1, 1);

  return {
    start: startOfMonth,
    end: new Date(startOfNextMonth.getTime() - 1),
  };
};
