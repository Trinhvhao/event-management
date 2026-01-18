export const ErrorMessages = {
  // Authentication
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  EMAIL_NOT_VERIFIED: 'Email not verified',

  // Authorization
  FORBIDDEN: 'You do not have permission to perform this action',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',

  // Validation
  VALIDATION_ERROR: 'Invalid input data',
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_DATE: 'Invalid date format',

  // Resources
  NOT_FOUND: 'Resource not found',
  EVENT_NOT_FOUND: 'Event not found',
  USER_NOT_FOUND: 'User not found',
  REGISTRATION_NOT_FOUND: 'Registration not found',

  // Business Logic
  EVENT_FULL: 'Event has reached maximum capacity',
  ALREADY_REGISTERED: 'You have already registered for this event',
  REGISTRATION_CLOSED: 'Registration is closed',
  CANNOT_CANCEL: 'Cannot cancel registration within 24 hours of event',
  CANNOT_DELETE_EVENT: 'Cannot delete event with existing registrations',
  ALREADY_CHECKED_IN: 'Already checked in',
  INVALID_QR_CODE: 'Invalid or expired QR code',
  OUTSIDE_TIME_WINDOW: 'Check-in is only allowed during event time',
  ALREADY_SUBMITTED_FEEDBACK: 'You have already submitted feedback for this event',

  // Server
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database error occurred',
  EMAIL_SEND_FAILED: 'Failed to send email',
};

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
