import { ApiResponse } from '../types';

/**
 * Create success response
 */
export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  
  // Add message to data if provided and data is an object
  if (message && data && typeof data === 'object' && !Array.isArray(data)) {
    (response.data as any).message = message;
  }
  
  return response;
};

/**
 * Create error response
 */
export const errorResponse = (
  code: string,
  message: string,
  details?: any
): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create paginated response
 */
export const paginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
) => {
  return successResponse({
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  });
};
