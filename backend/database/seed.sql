-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================

-- Insert Departments
INSERT INTO departments (name, code, description) VALUES
('Công nghệ Thông tin', 'CNTT', 'Khoa Công nghệ Thông tin'),
('Kinh tế', 'KT', 'Khoa Kinh tế'),
('Ngoại ngữ', 'NN', 'Khoa Ngoại ngữ'),
('Kỹ thuật', 'KTKT', 'Khoa Kỹ thuật'),
('Khoa học Tự nhiên', 'KHTN', 'Khoa Khoa học Tự nhiên'),
('Luật', 'L', 'Khoa Luật'),
('Y Dược', 'YD', 'Khoa Y Dược'),
('Đoàn Trường', 'DT', 'Đoàn Thanh niên Trường');

-- Insert Categories
INSERT INTO categories (name, description, color, icon) VALUES
('Học thuật', 'Các sự kiện học thuật, hội thảo, seminar', '#3B82F6', 'academic-cap'),
('Văn hóa - Nghệ thuật', 'Các hoạt động văn hóa, nghệ thuật, biểu diễn', '#EC4899', 'music'),
('Thể thao', 'Các hoạt động thể thao, giải đấu', '#10B981', 'trophy'),
('Tình nguyện', 'Các hoạt động tình nguyện, từ thiện', '#F59E0B', 'heart'),
('Kỹ năng mềm', 'Các khóa đào tạo kỹ năng mềm', '#8B5CF6', 'light-bulb'),
('Định hướng nghề nghiệp', 'Các sự kiện về nghề nghiệp, việc làm', '#EF4444', 'briefcase'),
('Giao lưu', 'Các hoạt động giao lưu, kết nối', '#06B6D4', 'users'),
('Khác', 'Các sự kiện khác', '#6B7280', 'dots-horizontal');

-- Insert Admin User (password: admin123)
INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified) VALUES
('admin@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Quản trị viên', 'admin', TRUE, TRUE);

-- Insert Organizers (password: organizer123)
INSERT INTO users (email, password_hash, full_name, role, department_id, is_active, email_verified) VALUES
('organizer.cntt@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Ban Tổ chức CNTT', 'organizer', 1, TRUE, TRUE),
('organizer.kt@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Ban Tổ chức Kinh tế', 'organizer', 2, TRUE, TRUE),
('organizer.doan@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Ban Tổ chức Đoàn', 'organizer', 8, TRUE, TRUE);

-- Insert Sample Students (password: student123)
INSERT INTO users (email, password_hash, full_name, student_id, role, department_id, phone, is_active, email_verified) VALUES
('student1@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Nguyễn Văn A', 'SV001', 'student', 1, '0901234567', TRUE, TRUE),
('student2@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Trần Thị B', 'SV002', 'student', 1, '0901234568', TRUE, TRUE),
('student3@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Lê Văn C', 'SV003', 'student', 2, '0901234569', TRUE, TRUE),
('student4@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Phạm Thị D', 'SV004', 'student', 2, '0901234570', TRUE, TRUE),
('student5@university.edu.vn', '$2b$10$YourHashedPasswordHere', 'Hoàng Văn E', 'SV005', 'student', 3, '0901234571', TRUE, TRUE);

-- Insert Sample Events
INSERT INTO events (
    title, description, start_time, end_time, location, 
    category_id, department_id, organizer_id, capacity, 
    training_points, status, registration_deadline
) VALUES
(
    'Hội thảo Trí tuệ Nhân tạo 2024',
    'Hội thảo về các xu hướng mới nhất trong lĩnh vực AI và Machine Learning',
    '2024-12-15 08:00:00',
    '2024-12-15 12:00:00',
    'Hội trường A - Tòa nhà CNTT',
    1, 1, 2, 200, 5, 'upcoming',
    '2024-12-14 23:59:59'
),
(
    'Ngày hội Văn hóa Sinh viên',
    'Ngày hội văn hóa với nhiều hoạt động văn nghệ, ẩm thực đặc sắc',
    '2024-12-20 14:00:00',
    '2024-12-20 18:00:00',
    'Sân vận động Trường',
    2, 8, 4, 500, 3, 'upcoming',
    '2024-12-19 23:59:59'
),
(
    'Giải bóng đá Sinh viên 2024',
    'Giải bóng đá giao hữu giữa các khoa',
    '2024-12-25 07:00:00',
    '2024-12-25 17:00:00',
    'Sân bóng Trường',
    3, 8, 4, 300, 4, 'upcoming',
    '2024-12-23 23:59:59'
),
(
    'Chương trình Tình nguyện Mùa đông',
    'Hoạt động tình nguyện hỗ trợ học sinh vùng cao',
    '2024-12-28 06:00:00',
    '2024-12-30 18:00:00',
    'Tỉnh Lào Cai',
    4, 8, 4, 50, 10, 'upcoming',
    '2024-12-26 23:59:59'
),
(
    'Workshop: Kỹ năng Thuyết trình',
    'Khóa đào tạo kỹ năng thuyết trình hiệu quả',
    '2025-01-05 13:00:00',
    '2025-01-05 17:00:00',
    'Phòng 301 - Tòa A',
    5, 2, 3, 80, 3, 'upcoming',
    '2025-01-04 23:59:59'
),
(
    'Ngày hội Việc làm 2025',
    'Sự kiện kết nối sinh viên với doanh nghiệp',
    '2025-01-10 08:00:00',
    '2025-01-10 17:00:00',
    'Hội trường Lớn',
    6, 8, 4, 1000, 5, 'upcoming',
    '2025-01-08 23:59:59'
);

-- Insert Sample Registrations
INSERT INTO registrations (user_id, event_id, status, qr_code) VALUES
(5, 1, 'registered', 'QR_5_1_' || gen_random_uuid()),
(6, 1, 'registered', 'QR_6_1_' || gen_random_uuid()),
(7, 1, 'registered', 'QR_7_1_' || gen_random_uuid()),
(5, 2, 'registered', 'QR_5_2_' || gen_random_uuid()),
(6, 2, 'registered', 'QR_6_2_' || gen_random_uuid()),
(7, 3, 'registered', 'QR_7_3_' || gen_random_uuid()),
(8, 3, 'registered', 'QR_8_3_' || gen_random_uuid());

-- Insert Sample Attendance (some students checked in)
INSERT INTO attendance (registration_id, checked_by, check_in_method) VALUES
(1, 2, 'qr_code'),
(2, 2, 'qr_code'),
(4, 4, 'qr_code');

-- Insert Sample Feedback
INSERT INTO feedback (event_id, user_id, rating, comment, suggestions) VALUES
(1, 5, 5, 'Sự kiện rất bổ ích, nội dung chất lượng', 'Nên tổ chức thêm nhiều workshop thực hành'),
(1, 6, 4, 'Tốt, nhưng thời gian hơi ngắn', 'Kéo dài thời gian sự kiện');

-- Insert Sample Notifications
INSERT INTO notifications (user_id, event_id, type, title, message) VALUES
(5, 1, 'registration_confirm', 'Đăng ký thành công', 'Bạn đã đăng ký thành công sự kiện "Hội thảo Trí tuệ Nhân tạo 2024"'),
(6, 1, 'registration_confirm', 'Đăng ký thành công', 'Bạn đã đăng ký thành công sự kiện "Hội thảo Trí tuệ Nhân tạo 2024"'),
(5, 1, 'event_reminder', 'Nhắc nhở sự kiện', 'Sự kiện "Hội thảo Trí tuệ Nhân tạo 2024" sẽ diễn ra vào ngày mai'),
(5, NULL, 'training_points_awarded', 'Cộng điểm rèn luyện', 'Bạn đã được cộng 5 điểm rèn luyện từ sự kiện "Hội thảo Trí tuệ Nhân tạo 2024"');

-- Insert Sample Training Points
INSERT INTO training_points (user_id, event_id, points, semester, academic_year, awarded_by) VALUES
(5, 1, 5, 'HK1_2024', '2024-2025', 2),
(6, 1, 5, 'HK1_2024', '2024-2025', 2);

-- Update event current_registrations (will be handled by trigger in real scenario)
UPDATE events SET current_registrations = (
    SELECT COUNT(*) FROM registrations 
    WHERE event_id = events.id AND status = 'registered'
);
