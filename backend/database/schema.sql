-- ============================================
-- UNIVERSITY EVENT MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- ============================================

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('student', 'organizer', 'admin');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE registration_status AS ENUM ('registered', 'cancelled');
CREATE TYPE notification_type AS ENUM (
    'registration_confirm',
    'event_reminder',
    'event_update',
    'event_cancelled',
    'feedback_request',
    'training_points_awarded'
);

-- ============================================
-- TABLES
-- ============================================

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code for UI
    icon VARCHAR(50), -- Icon name for UI
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE, -- Nullable for non-students
    phone VARCHAR(20),
    avatar_url TEXT,
    role user_role NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_student_id CHECK (
        (role = 'student' AND student_id IS NOT NULL) OR 
        (role != 'student')
    )
);

-- Events Table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    current_registrations INTEGER NOT NULL DEFAULT 0 CHECK (current_registrations >= 0),
    training_points INTEGER NOT NULL DEFAULT 0 CHECK (training_points >= 0),
    status event_status NOT NULL DEFAULT 'upcoming',
    image_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    registration_deadline TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_event_time CHECK (end_time > start_time),
    CONSTRAINT check_registration_deadline CHECK (
        registration_deadline IS NULL OR 
        registration_deadline <= start_time
    ),
    CONSTRAINT check_capacity_registrations CHECK (current_registrations <= capacity)
);

-- Registrations Table
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status registration_status NOT NULL DEFAULT 'registered',
    qr_code VARCHAR(255) NOT NULL UNIQUE,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one registration per user per event
    CONSTRAINT unique_user_event UNIQUE (user_id, event_id)
);

-- Attendance Table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    check_in_method VARCHAR(50) DEFAULT 'qr_code', -- qr_code, manual
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Training Points Table
CREATE TABLE training_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    points INTEGER NOT NULL CHECK (points >= 0),
    semester VARCHAR(20) NOT NULL, -- Format: HK1_2024, HK2_2024
    academic_year VARCHAR(20) NOT NULL, -- Format: 2024-2025
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    awarded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one training point record per user per event
    CONSTRAINT unique_user_event_points UNIQUE (user_id, event_id)
);

-- Feedback Table
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    suggestions TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one feedback per user per event
    CONSTRAINT unique_user_event_feedback UNIQUE (user_id, event_id)
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email Verification Tokens Table
CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens Table
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table (for tracking important actions)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- login, logout, create_event, delete_event, etc.
    entity_type VARCHAR(50), -- user, event, registration, etc.
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Events indexes
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_department ON events(department_id);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_events_upcoming ON events(status, start_time) WHERE status = 'upcoming';

-- Composite index for event search
CREATE INDEX idx_events_search ON events(status, start_time DESC, category_id, department_id);

-- Registrations indexes
CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_qr_code ON registrations(qr_code);
CREATE INDEX idx_registrations_event_status ON registrations(event_id, status);

-- Attendance indexes
CREATE INDEX idx_attendance_registration ON attendance(registration_id);
CREATE INDEX idx_attendance_checked_by ON attendance(checked_by);
CREATE INDEX idx_attendance_checked_in_at ON attendance(checked_in_at);

-- Training Points indexes
CREATE INDEX idx_training_points_user ON training_points(user_id);
CREATE INDEX idx_training_points_event ON training_points(event_id);
CREATE INDEX idx_training_points_semester ON training_points(semester);
CREATE INDEX idx_training_points_academic_year ON training_points(academic_year);
CREATE INDEX idx_training_points_user_semester ON training_points(user_id, semester);

-- Feedback indexes
CREATE INDEX idx_feedback_event ON feedback(event_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_event ON notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- Token indexes
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update event current_registrations count
CREATE OR REPLACE FUNCTION update_event_registrations_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'registered' THEN
        UPDATE events 
        SET current_registrations = current_registrations + 1 
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'registered' AND NEW.status = 'cancelled' THEN
            UPDATE events 
            SET current_registrations = current_registrations - 1 
            WHERE id = NEW.event_id;
        ELSIF OLD.status = 'cancelled' AND NEW.status = 'registered' THEN
            UPDATE events 
            SET current_registrations = current_registrations + 1 
            WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'registered' THEN
        UPDATE events 
        SET current_registrations = current_registrations - 1 
        WHERE id = OLD.event_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply registration count trigger
CREATE TRIGGER update_event_registrations_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON registrations
    FOR EACH ROW EXECUTE FUNCTION update_event_registrations_count();

-- Function to set cancelled_at timestamp
CREATE OR REPLACE FUNCTION set_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply cancelled_at trigger
CREATE TRIGGER set_registration_cancelled_at BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION set_cancelled_at();

-- Function to set read_at timestamp
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND (OLD.is_read = FALSE OR OLD.is_read IS NULL) THEN
        NEW.read_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply read_at trigger
CREATE TRIGGER set_notification_read_at_trigger BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_notification_read_at();

-- ============================================
-- VIEWS
-- ============================================

-- View for event statistics
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    e.status,
    e.capacity,
    e.current_registrations,
    ROUND((e.current_registrations::NUMERIC / e.capacity) * 100, 2) as registration_percentage,
    COUNT(DISTINCT a.id) as attendance_count,
    ROUND((COUNT(DISTINCT a.id)::NUMERIC / NULLIF(e.current_registrations, 0)) * 100, 2) as attendance_rate,
    AVG(f.rating) as average_rating,
    COUNT(DISTINCT f.id) as feedback_count
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
LEFT JOIN attendance a ON r.id = a.registration_id
LEFT JOIN feedback f ON e.id = f.event_id
GROUP BY e.id;

-- View for user training points summary
CREATE OR REPLACE VIEW user_training_points_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.student_id,
    tp.semester,
    tp.academic_year,
    SUM(tp.points) as total_points,
    COUNT(DISTINCT tp.event_id) as events_attended
FROM users u
LEFT JOIN training_points tp ON u.id = tp.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.full_name, u.student_id, tp.semester, tp.academic_year;

-- View for upcoming events with registration info
CREATE OR REPLACE VIEW upcoming_events_with_info AS
SELECT 
    e.*,
    c.name as category_name,
    d.name as department_name,
    u.full_name as organizer_name,
    u.email as organizer_email,
    (e.capacity - e.current_registrations) as available_slots,
    CASE 
        WHEN e.current_registrations >= e.capacity THEN TRUE 
        ELSE FALSE 
    END as is_full
FROM events e
JOIN categories c ON e.category_id = c.id
JOIN departments d ON e.department_id = d.id
JOIN users u ON e.organizer_id = u.id
WHERE e.status = 'upcoming'
ORDER BY e.start_time ASC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get user's registered events
CREATE OR REPLACE FUNCTION get_user_registered_events(p_user_id INTEGER)
RETURNS TABLE (
    event_id INTEGER,
    event_title VARCHAR,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    location VARCHAR,
    status event_status,
    registration_status registration_status,
    qr_code VARCHAR,
    has_attended BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        e.location,
        e.status,
        r.status,
        r.qr_code,
        CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    LEFT JOIN attendance a ON r.id = a.registration_id
    WHERE r.user_id = p_user_id
    ORDER BY e.start_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can register for event
CREATE OR REPLACE FUNCTION can_user_register_for_event(
    p_user_id INTEGER,
    p_event_id INTEGER
)
RETURNS TABLE (
    can_register BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_event RECORD;
    v_existing_registration RECORD;
BEGIN
    -- Get event details
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Event not found';
        RETURN;
    END IF;
    
    -- Check if event is upcoming
    IF v_event.status != 'upcoming' THEN
        RETURN QUERY SELECT FALSE, 'Event is not open for registration';
        RETURN;
    END IF;
    
    -- Check registration deadline
    IF v_event.registration_deadline IS NOT NULL AND 
       v_event.registration_deadline < CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT FALSE, 'Registration deadline has passed';
        RETURN;
    END IF;
    
    -- Check capacity
    IF v_event.current_registrations >= v_event.capacity THEN
        RETURN QUERY SELECT FALSE, 'Event is full';
        RETURN;
    END IF;
    
    -- Check existing registration
    SELECT * INTO v_existing_registration 
    FROM registrations 
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    IF FOUND THEN
        IF v_existing_registration.status = 'registered' THEN
            RETURN QUERY SELECT FALSE, 'Already registered for this event';
            RETURN;
        ELSIF v_existing_registration.status = 'cancelled' THEN
            RETURN QUERY SELECT TRUE, 'Can re-register (previously cancelled)';
            RETURN;
        END IF;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Can register';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Stores user accounts (students, organizers, admins)';
COMMENT ON TABLE events IS 'Stores event information';
COMMENT ON TABLE registrations IS 'Stores event registrations';
COMMENT ON TABLE attendance IS 'Stores attendance records (check-in)';
COMMENT ON TABLE training_points IS 'Stores training points awarded to students';
COMMENT ON TABLE feedback IS 'Stores event feedback from participants';
COMMENT ON TABLE notifications IS 'Stores user notifications';
COMMENT ON TABLE audit_logs IS 'Stores audit trail for important actions';

COMMENT ON COLUMN events.current_registrations IS 'Denormalized count for performance, updated by trigger';
COMMENT ON COLUMN registrations.qr_code IS 'Unique QR code for check-in';
COMMENT ON COLUMN training_points.semester IS 'Format: HK1_2024, HK2_2024';
COMMENT ON COLUMN training_points.academic_year IS 'Format: 2024-2025';
