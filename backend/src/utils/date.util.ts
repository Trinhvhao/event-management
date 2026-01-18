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
