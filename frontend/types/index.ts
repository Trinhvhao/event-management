// User types
export type UserRole = 'participant' | 'organizer' | 'admin';
export type ParticipantType = 'student' | 'teacher' | 'external';

// Event Team Role types
export type EventTeamRole = 'main_organizer' | 'helper';

export interface TeamMember {
  id: number;
  event_id: number;
  user_id: number;
  role: EventTeamRole;
  added_by: number;
  created_at: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    student_id: string | null;
    role: string;
    department: {
      id: number;
      name: string;
      code: string;
    } | null;
  };
  added_by_user: {
    id: number;
    full_name: string;
    email: string;
  };
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  student_id?: string;
  role: UserRole;
  participant_type?: ParticipantType;
  department_id?: number;
  department?: Department;
  is_active: boolean;
  email_verified: boolean;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  registration_count?: number;
  total_events_attended?: number;
  total_points?: number;
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
  participant_type?: ParticipantType;
  department_id?: number;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

// Event types
export type EventStatus = 'pending' | 'approved' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export type ApprovalType = 'auto_approve' | 'require_approval' | 'no_registration';

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
  event_cost: number;
  status: EventStatus;
  image_url?: string;
  is_featured: boolean;
  registration_deadline?: string;
  approval_type: ApprovalType;
  require_reason: boolean;
  require_agreement: boolean;
  agreement_text?: string;
  waitlist_enabled: boolean;
  waitlist_capacity: number;
  auto_promote_waitlist: boolean;
  checkin_opens_minutes: number;
  checkin_closes_minutes: number;
  require_checkout: boolean;
  _count?: { registrations: number };
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
  event_cost?: number;
  image_url?: string;
  registration_deadline?: string;
  approval_type?: ApprovalType;
  require_reason?: boolean;
  require_agreement?: boolean;
  agreement_text?: string;
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
export type RegistrationStatus = 'registered' | 'cancelled' | 'attended';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  registered_at: string;
  status: RegistrationStatus;
  qr_code: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  // Payment status (from joined payment)
  payment_status?: 'pending' | 'paid' | 'cancelled' | 'expired';
  // Approval fields
  approval_status: ApprovalStatus;
  approval_note?: string;
  approved_by?: number;
  approved_at?: string;
  reason?: string;
  agreed_at?: string;
  // Relations
  user?: {
    id: number;
    full_name: string;
    email: string;
    student_id?: string;
    department?: {
      id: number;
      name: string;
    };
  };
  event?: Event;
  approver?: {
    id: number;
    full_name: string;
  };
}

// Payment types
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface Payment {
  id: number;
  registration_id: number;
  event_id: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  payos_order_id?: string;
  transaction_id?: string;
  paid_at?: string;
  expires_at?: string;
  created_at: string;
  event?: {
    id: number;
    title: string;
    start_time: string;
    location: string;
  };
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
  | 'checkin_success'
  | 'points_awarded'
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
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

// Ticket types
export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'expired';

export interface Ticket {
  id: number;
  ticket_code: string;
  registration_id: number;
  qr_data: string;
  qr_image: string | null;
  pdf_url: string | null;
  status: TicketStatus;
  sent_at: string | null;
  created_at: string;
  is_past?: boolean;
  is_upcoming?: boolean;
  registration: {
    id: number;
    user_id: number;
    event_id: number;
    registered_at: string;
    status: string;
    user: {
      id: number;
      email: string;
      full_name: string;
      student_id: string | null;
      department: { id: number; name: string } | null;
    };
    event: {
      id: number;
      title: string;
      description: string | null;
      start_time: string;
      end_time: string;
      location: string | null;
    };
  };
}
