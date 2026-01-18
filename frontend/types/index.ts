// User types
export type UserRole = 'student' | 'organizer' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  student_id?: string;
  role: UserRole;
  department_id?: number;
  department?: Department;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  student_id?: string;
  role: UserRole;
  department_id?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Event types
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location: string;
  category_id: number;
  category?: Category;
  department_id: number;
  department?: Department;
  organizer_id: number;
  organizer?: User;
  capacity: number;
  current_registrations: number;
  training_points: number;
  status: EventStatus;
  image_url?: string;
  is_featured: boolean;
  registration_deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location: string;
  category_id: number;
  department_id: number;
  capacity: number;
  training_points: number;
  image_url?: string;
  registration_deadline?: string;
}

// Department & Category types
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
}

// Registration types
export type RegistrationStatus = 'registered' | 'cancelled';

export interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  event?: Event;
  registered_at: string;
  status: RegistrationStatus;
  qr_code: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

// Feedback types
export interface Feedback {
  id: number;
  event_id: number;
  event?: Event;
  user_id: number;
  rating: number;
  comment?: string;
  suggestions?: string;
  is_anonymous: boolean;
  created_at: string;
}

// Training Points types
export interface TrainingPoint {
  id: number;
  user_id: number;
  event_id: number;
  event?: Event;
  points: number;
  semester: string;
  academic_year: string;
  earned_at: string;
}

// Notification types
export type NotificationType =
  | 'registration_confirm'
  | 'event_reminder'
  | 'event_update'
  | 'event_cancelled'
  | 'feedback_request'
  | 'training_points_awarded';

export interface Notification {
  id: number;
  user_id: number;
  event_id?: number;
  event?: Event;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  sent_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}
