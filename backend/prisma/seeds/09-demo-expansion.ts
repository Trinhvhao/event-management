import {
  Category,
  Department,
  Event,
  EventStatus,
  PrismaClient,
  Registration,
  RegistrationStatus,
  User,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { calculateSemester, generateQRCode } from './utils';

interface BaseSeedContext {
  departments: Department[];
  categories: Category[];
  organizers: User[];
  students: User[];
  anchorEvents: {
    completedEvent: Event;
    completedEvent2: Event;
    ongoingEvent: Event;
    upcomingEvent1: Event;
  };
}

interface DemoExpansionResult {
  extraOrganizers: User[];
  extraStudents: User[];
  extraEvents: Event[];
  extraRegistrations: Registration[];
  extraAttendances: number;
  extraTrainingPoints: number;
  extraFeedback: number;
  extraNotifications: number;
  auditLogs: number;
}

interface EventBlueprint {
  title: string;
  description: string;
  status: EventStatus;
  dayOffset: number;
  startHour: number;
  durationHours: number;
  location: string;
  categoryName: string;
  departmentCode: string;
  organizerIndex: number;
  capacity: number;
  trainingPoints: number;
  isFeatured?: boolean;
  registrationDeadlineOffset: number;
  softDeleted?: boolean;
}

const ADMIN_EMAIL = 'admin@dnu.edu.vn';

const findDepartmentByCode = (departments: Department[], code: string): Department => {
  const department = departments.find((item) => item.code === code);
  if (!department) {
    throw new Error(`Department with code '${code}' not found`);
  }
  return department;
};

const findCategoryByName = (categories: Category[], name: string): Category => {
  const category = categories.find((item) => item.name === name);
  if (!category) {
    throw new Error(`Category '${name}' not found`);
  }
  return category;
};

const buildDate = (dayOffset: number, hour: number, minute = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const eventBlueprints: EventBlueprint[] = [
  {
    title: 'Seminar AI trong Y tế 2026',
    description: 'Ứng dụng trí tuệ nhân tạo trong chẩn đoán và chăm sóc sức khỏe số.',
    status: 'pending',
    dayOffset: 9,
    startHour: 8,
    durationHours: 3,
    location: 'Hội trường B2-01',
    categoryName: 'Học thuật',
    departmentCode: 'KHTN',
    organizerIndex: 0,
    capacity: 120,
    trainingPoints: 4,
    registrationDeadlineOffset: 2,
  },
  {
    title: 'Workshop CV & Phỏng vấn cùng HR',
    description: 'Chuẩn bị hồ sơ xin việc và kỹ năng phỏng vấn thực chiến.',
    status: 'approved',
    dayOffset: 12,
    startHour: 14,
    durationHours: 3,
    location: 'Phòng C3-05',
    categoryName: 'Tuyển dụng',
    departmentCode: 'KTDN',
    organizerIndex: 1,
    capacity: 150,
    trainingPoints: 3,
    registrationDeadlineOffset: 3,
    isFeatured: true,
  },
  {
    title: 'Ngày hội CLB Sinh viên 2026',
    description: 'Trưng bày hoạt động và tuyển thành viên mới cho các CLB.',
    status: 'upcoming',
    dayOffset: 5,
    startHour: 7,
    durationHours: 8,
    location: 'Sân trung tâm',
    categoryName: 'Ngoại khóa',
    departmentCode: 'XH',
    organizerIndex: 2,
    capacity: 600,
    trainingPoints: 2,
    registrationDeadlineOffset: 1,
    isFeatured: true,
  },
  {
    title: 'Bootcamp Data Analytics',
    description: 'Bootcamp 2 ngày về SQL, BI và trực quan hóa dữ liệu.',
    status: 'upcoming',
    dayOffset: 18,
    startHour: 8,
    durationHours: 9,
    location: 'Lab D1-02',
    categoryName: 'Học thuật',
    departmentCode: 'CNTT',
    organizerIndex: 3,
    capacity: 80,
    trainingPoints: 6,
    registrationDeadlineOffset: 4,
  },
  {
    title: 'Diễn đàn Khởi nghiệp trẻ',
    description: 'Kết nối mentor, startup và sinh viên có ý tưởng khởi nghiệp.',
    status: 'ongoing',
    dayOffset: 0,
    startHour: 8,
    durationHours: 10,
    location: 'Trung tâm Hội nghị',
    categoryName: 'Kỹ năng mềm',
    departmentCode: 'KTDN',
    organizerIndex: 4,
    capacity: 250,
    trainingPoints: 5,
    registrationDeadlineOffset: -1,
    isFeatured: true,
  },
  {
    title: 'Giải chạy Campus Run',
    description: 'Hoạt động thể thao kết hợp gây quỹ học bổng.',
    status: 'upcoming',
    dayOffset: 22,
    startHour: 6,
    durationHours: 4,
    location: 'Khuôn viên trường',
    categoryName: 'Thể thao',
    departmentCode: 'XH',
    organizerIndex: 5,
    capacity: 400,
    trainingPoints: 3,
    registrationDeadlineOffset: 5,
  },
  {
    title: 'Đêm nhạc Acoustic vì cộng đồng',
    description: 'Đêm nhạc gây quỹ hỗ trợ sinh viên khó khăn.',
    status: 'cancelled',
    dayOffset: 11,
    startHour: 19,
    durationHours: 3,
    location: 'Nhà Văn hóa',
    categoryName: 'Văn hóa',
    departmentCode: 'NN',
    organizerIndex: 2,
    capacity: 350,
    trainingPoints: 2,
    registrationDeadlineOffset: 3,
  },
  {
    title: 'Workshop Nghiên cứu khoa học cơ bản',
    description: 'Phương pháp xây dựng đề cương và công bố nghiên cứu.',
    status: 'completed',
    dayOffset: -35,
    startHour: 9,
    durationHours: 4,
    location: 'Phòng Hội thảo A2',
    categoryName: 'Học thuật',
    departmentCode: 'KHTN',
    organizerIndex: 0,
    capacity: 100,
    trainingPoints: 4,
    registrationDeadlineOffset: -40,
  },
  {
    title: 'Ngày hội Ngoại ngữ & Văn hóa quốc tế',
    description: 'Hoạt động giao lưu ngoại ngữ và văn hóa đa quốc gia.',
    status: 'completed',
    dayOffset: -20,
    startHour: 8,
    durationHours: 8,
    location: 'Khu học thuật A',
    categoryName: 'Văn hóa',
    departmentCode: 'NN',
    organizerIndex: 1,
    capacity: 280,
    trainingPoints: 3,
    registrationDeadlineOffset: -24,
  },
  {
    title: 'Phiên chợ Ý tưởng sáng tạo',
    description: 'Sinh viên trình bày ý tưởng và nhận phản biện từ hội đồng.',
    status: 'pending',
    dayOffset: 16,
    startHour: 13,
    durationHours: 4,
    location: 'Không gian Startup Hub',
    categoryName: 'Ngoại khóa',
    departmentCode: 'CNTT',
    organizerIndex: 3,
    capacity: 120,
    trainingPoints: 3,
    registrationDeadlineOffset: 3,
  },
  {
    title: 'Tuần lễ Định hướng Tân sinh viên (bản lưu)',
    description: 'Bản sự kiện cũ phục vụ kiểm thử lọc soft-delete.',
    status: 'cancelled',
    dayOffset: -7,
    startHour: 8,
    durationHours: 6,
    location: 'Hội trường Cũ',
    categoryName: 'Ngoại khóa',
    departmentCode: 'XH',
    organizerIndex: 4,
    capacity: 500,
    trainingPoints: 1,
    registrationDeadlineOffset: -10,
    softDeleted: true,
  },
  {
    title: 'Open Class: Public Speaking Intensive',
    description: 'Thực hành nói trước đám đông theo nhóm nhỏ.',
    status: 'approved',
    dayOffset: 27,
    startHour: 15,
    durationHours: 3,
    location: 'Phòng Đa năng M1',
    categoryName: 'Kỹ năng mềm',
    departmentCode: 'KTDN',
    organizerIndex: 5,
    capacity: 60,
    trainingPoints: 2,
    registrationDeadlineOffset: 6,
  },
];

const makeRegistrationStatus = (
  eventStatus: EventStatus,
  participantIndex: number
): RegistrationStatus => {
  if (eventStatus === 'cancelled') {
    return participantIndex % 4 === 0 ? 'registered' : 'cancelled';
  }

  if (eventStatus === 'pending') {
    return participantIndex % 5 === 0 ? 'cancelled' : 'registered';
  }

  if (eventStatus === 'completed') {
    return participantIndex % 6 === 0 ? 'cancelled' : 'registered';
  }

  return participantIndex % 8 === 0 ? 'cancelled' : 'registered';
};

export async function seedDemoExpansion(
  prisma: PrismaClient,
  context: BaseSeedContext
): Promise<DemoExpansionResult> {
  console.log('🚀 Seeding demo expansion data (multi-module)...');

  const organizerPassword = await bcrypt.hash('organizer123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const departmentByCode = new Map(context.departments.map((item) => [item.code, item]));

  const extraOrganizerSpecs = [
    {
      email: 'organizer.khtn@dnu.edu.vn',
      fullName: 'Phan Minh Khoa',
      departmentCode: 'KHTN',
    },
    {
      email: 'organizer.xh@dnu.edu.vn',
      fullName: 'Đỗ Thu Hà',
      departmentCode: 'XH',
    },
    {
      email: 'organizer.cntt2@dnu.edu.vn',
      fullName: 'Vũ Hoàng Long',
      departmentCode: 'CNTT',
    },
  ];

  const extraOrganizers: User[] = [];
  for (const spec of extraOrganizerSpecs) {
    const department = departmentByCode.get(spec.departmentCode);
    if (!department) {
      throw new Error(`Department '${spec.departmentCode}' not found for organizer seeding`);
    }

    const organizer = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        full_name: spec.fullName,
        role: 'organizer',
        department_id: department.id,
        is_active: true,
        email_verified: true,
      },
      create: {
        email: spec.email,
        password_hash: organizerPassword,
        full_name: spec.fullName,
        role: 'organizer',
        department_id: department.id,
        is_active: true,
        email_verified: true,
      },
    });

    extraOrganizers.push(organizer);
  }

  const extraStudentNames = [
    'Bùi Gia Hân',
    'Nguyễn Quốc Nam',
    'Trịnh Thanh Tùng',
    'Lâm Hải Yến',
    'Trần Đức Huy',
    'Phạm Gia Linh',
    'Đặng Minh Quân',
    'Hoàng Mai Trang',
    'Lý Anh Khoa',
    'Võ Thảo Nhi',
    'Đoàn Tuấn Kiệt',
    'Ngô Quỳnh Anh',
    'Phan Thành Đạt',
    'Tạ Thu Phương',
    'Chu Minh Đức',
    'Mai Hải Đăng',
    'Đinh Khánh Vy',
    'Lê Anh Dũng',
    'Nguyễn Hà My',
    'Phạm Anh Tuấn',
  ];

  const departmentCycle = ['CNTT', 'KTDN', 'NN', 'KHTN', 'XH'];
  const extraStudents: User[] = [];

  for (let index = 0; index < extraStudentNames.length; index += 1) {
    const studentNumber = 6 + index;
    const email = `student${studentNumber}@dnu.edu.vn`;
    const studentId = `2071020${String(studentNumber).padStart(3, '0')}`;
    const departmentCode = departmentCycle[index % departmentCycle.length];
    const department = departmentByCode.get(departmentCode);

    if (!department) {
      throw new Error(`Department '${departmentCode}' not found for student seeding`);
    }

    const student = await prisma.user.upsert({
      where: { email },
      update: {
        full_name: extraStudentNames[index],
        student_id: studentId,
        role: 'student',
        department_id: department.id,
        is_active: true,
        email_verified: true,
      },
      create: {
        email,
        password_hash: studentPassword,
        full_name: extraStudentNames[index],
        student_id: studentId,
        role: 'student',
        department_id: department.id,
        is_active: true,
        email_verified: true,
      },
    });

    extraStudents.push(student);
  }

  const allOrganizers = [...context.organizers, ...extraOrganizers];
  const allStudents = [...context.students, ...extraStudents];

  const extraEvents: Event[] = [];

  for (const [index, blueprint] of eventBlueprints.entries()) {
    const category = findCategoryByName(context.categories, blueprint.categoryName);
    const department = findDepartmentByCode(context.departments, blueprint.departmentCode);
    const organizer = allOrganizers[index % allOrganizers.length];

    const startTime = buildDate(blueprint.dayOffset, blueprint.startHour);
    const endTime = buildDate(blueprint.dayOffset, blueprint.startHour + blueprint.durationHours);
    const registrationDeadline = buildDate(
      blueprint.registrationDeadlineOffset,
      Math.max(7, blueprint.startHour - 2)
    );

    const event = await prisma.event.create({
      data: {
        title: blueprint.title,
        description: blueprint.description,
        start_time: startTime,
        end_time: endTime,
        location: blueprint.location,
        category_id: category.id,
        department_id: department.id,
        organizer_id: organizer.id,
        capacity: blueprint.capacity,
        training_points: blueprint.trainingPoints,
        status: blueprint.status,
        is_featured: blueprint.isFeatured ?? false,
        registration_deadline: registrationDeadline,
        deleted_at: blueprint.softDeleted ? new Date() : null,
      },
    });

    extraEvents.push(event);
  }

  const candidateEvents = [
    context.anchorEvents.completedEvent,
    context.anchorEvents.completedEvent2,
    context.anchorEvents.ongoingEvent,
    context.anchorEvents.upcomingEvent1,
    ...extraEvents.filter((event) => event.deleted_at === null),
  ];

  const extraRegistrations: Registration[] = [];
  const attendanceRecords: Array<{ registrationId: number; checkedBy: number; checkedInAt: Date }> = [];

  for (const [eventIndex, event] of candidateEvents.entries()) {
    const desiredParticipants = Math.min(event.capacity, 8 + (eventIndex % 10) + 6);
    const usedStudentIds = new Set<number>();
    const participantPool = allStudents
      .slice()
      .sort((a, b) => ((a.id + eventIndex * 17) % 97) - ((b.id + eventIndex * 17) % 97));

    let assignedCount = 0;

    for (let participantIndex = 0; participantIndex < participantPool.length; participantIndex += 1) {
      if (assignedCount >= desiredParticipants) {
        break;
      }

      const student = participantPool[participantIndex];

      if (usedStudentIds.has(student.id)) {
        continue;
      }
      usedStudentIds.add(student.id);

      const status = makeRegistrationStatus(event.status, participantIndex);

      const existed = await prisma.registration.findUnique({
        where: {
          user_id_event_id: {
            user_id: student.id,
            event_id: event.id,
          },
        },
      });

      if (existed) {
        continue;
      }

      const registration = await prisma.registration.create({
        data: {
          user_id: student.id,
          event_id: event.id,
          status,
          qr_code: await generateQRCode(student.id, event.id),
          registered_at: new Date(event.created_at.getTime() + participantIndex * 60000),
        },
      });

      extraRegistrations.push(registration);
      assignedCount += 1;

      const shouldCreateAttendance =
        status === 'registered' &&
        (event.status === 'completed' || event.status === 'ongoing') &&
        (event.status === 'completed' ? participantIndex % 5 !== 0 : participantIndex % 2 === 0);

      if (shouldCreateAttendance) {
        attendanceRecords.push({
          registrationId: registration.id,
          checkedBy: event.organizer_id,
          checkedInAt: new Date(event.start_time.getTime() + (10 + (participantIndex % 30)) * 60000),
        });
      }
    }
  }

  for (const item of attendanceRecords) {
    await prisma.attendance.create({
      data: {
        registration_id: item.registrationId,
        checked_by: item.checkedBy,
        checked_in_at: item.checkedInAt,
      },
    });
  }

  const createdAttendances = await prisma.attendance.findMany({
    where: {
      registration_id: {
        in: attendanceRecords.map((item) => item.registrationId),
      },
    },
    include: {
      registration: {
        include: {
          event: true,
        },
      },
    },
  });

  for (const attendance of createdAttendances) {
    await prisma.trainingPoint.create({
      data: {
        user_id: attendance.registration.user_id,
        event_id: attendance.registration.event_id,
        points: attendance.registration.event.training_points,
        semester: calculateSemester(attendance.checked_in_at),
        earned_at: attendance.checked_in_at,
      },
    });
  }

  const completedEventIds = new Set(
    candidateEvents.filter((event) => event.status === 'completed').map((event) => event.id)
  );

  let feedbackCounter = 0;
  for (const [index, registration] of extraRegistrations.entries()) {
    if (!completedEventIds.has(registration.event_id) || registration.status !== 'registered') {
      continue;
    }

    if (index % 3 === 0) {
      continue;
    }

    const rating = 3 + (index % 3);
    await prisma.feedback.create({
      data: {
        user_id: registration.user_id,
        event_id: registration.event_id,
        rating,
        comment:
          rating >= 4
            ? 'Nội dung tốt, tổ chức chuyên nghiệp và đúng kỳ vọng.'
            : 'Sự kiện ổn nhưng cần cải thiện khâu điều phối thời gian.',
        suggestions:
          rating >= 4
            ? 'Nên mở thêm phiên nâng cao để đào sâu chuyên môn.'
            : 'Cần gửi agenda chi tiết trước sự kiện 2-3 ngày.',
        is_anonymous: index % 4 === 0,
      },
    });
    feedbackCounter += 1;
  }

  const eventById = new Map(candidateEvents.map((event) => [event.id, event]));

  const registrationNotifications = extraRegistrations.map((registration, index) => {
    const event = eventById.get(registration.event_id);
    const title = registration.status === 'cancelled' ? 'Đăng ký đã hủy' : 'Đăng ký sự kiện thành công';
    const message = event
      ? registration.status === 'cancelled'
        ? `Yêu cầu hủy đăng ký cho sự kiện "${event.title}" đã được ghi nhận.`
        : `Bạn đã đăng ký thành công sự kiện "${event.title}".`
      : 'Thông tin đăng ký đã được cập nhật.';

    return {
      user_id: registration.user_id,
      event_id: registration.event_id,
      type: 'registration_confirm' as const,
      title,
      message,
      is_read: index % 2 === 0,
      sent_at: new Date(),
    };
  });

  const eventReminderNotifications = extraRegistrations
    .filter((registration) => registration.status === 'registered')
    .map((registration, index) => {
      const event = eventById.get(registration.event_id);
      return {
        user_id: registration.user_id,
        event_id: registration.event_id,
        type: 'event_reminder' as const,
        title: 'Nhắc nhở tham gia sự kiện',
        message: event
          ? `Sự kiện "${event.title}" sắp diễn ra, vui lòng kiểm tra lịch của bạn.`
          : 'Bạn có một sự kiện sắp diễn ra.',
        is_read: index % 3 === 0,
        sent_at: new Date(),
      };
    })
    .slice(0, 80);

  const eventUpdateNotifications = extraRegistrations
    .filter((registration) => registration.status === 'registered')
    .map((registration, index) => {
      const event = eventById.get(registration.event_id);
      return {
        user_id: registration.user_id,
        event_id: registration.event_id,
        type: 'event_update' as const,
        title: 'Cập nhật lịch trình sự kiện',
        message: event
          ? `Sự kiện "${event.title}" đã cập nhật thông tin lịch trình mới.`
          : 'Sự kiện của bạn có cập nhật mới.',
        is_read: index % 4 === 0,
        sent_at: new Date(),
      };
    })
    .slice(0, 60);

  const eventCancelledNotifications = extraRegistrations
    .filter((registration) => {
      const event = eventById.get(registration.event_id);
      return event?.status === 'cancelled';
    })
    .map((registration) => {
      const event = eventById.get(registration.event_id);
      return {
        user_id: registration.user_id,
        event_id: registration.event_id,
        type: 'event_cancelled' as const,
        title: 'Thông báo hủy sự kiện',
        message: event
          ? `Sự kiện "${event.title}" đã bị hủy. Điểm rèn luyện sẽ không được tính cho sự kiện này.`
          : 'Sự kiện bạn đăng ký đã bị hủy.',
        is_read: false,
        sent_at: new Date(),
      };
    });

  const checkinNotifications = createdAttendances.map((attendance, index) => {
    const event = eventById.get(attendance.registration.event_id);
    return {
      user_id: attendance.registration.user_id,
      event_id: attendance.registration.event_id,
      type: 'checkin_success' as const,
      title: 'Check-in thành công',
      message: event
        ? `Bạn đã check-in thành công tại sự kiện "${event.title}".`
        : 'Bạn đã check-in thành công.',
      is_read: index % 2 === 0,
      sent_at: attendance.checked_in_at,
    };
  });

  const awardedPoints = await prisma.trainingPoint.findMany({
    where: {
      event_id: {
        in: candidateEvents.map((event) => event.id),
      },
      user_id: {
        in: allStudents.map((student) => student.id),
      },
    },
    include: {
      event: true,
    },
  });

  const pointsNotifications = awardedPoints.map((point, index) => ({
    user_id: point.user_id,
    event_id: point.event_id,
    type: 'points_awarded' as const,
    title: 'Đã cộng điểm rèn luyện',
    message: `Bạn nhận được ${point.points} điểm từ sự kiện "${point.event.title}".`,
    is_read: index % 3 === 0,
    sent_at: point.earned_at,
  }));

  const feedbackRequestNotifications = extraRegistrations
    .filter((registration) => completedEventIds.has(registration.event_id) && registration.status === 'registered')
    .slice(0, 50)
    .map((registration) => {
      const event = eventById.get(registration.event_id);
      return {
        user_id: registration.user_id,
        event_id: registration.event_id,
        type: 'feedback_request' as const,
        title: 'Mời bạn đánh giá sự kiện',
        message: event
          ? `Vui lòng gửi phản hồi cho sự kiện "${event.title}" để nhà trường cải thiện chất lượng tổ chức.`
          : 'Vui lòng gửi phản hồi cho sự kiện bạn đã tham gia.',
        is_read: false,
        sent_at: new Date(),
      };
    });

  const allNotificationPayloads = [
    ...registrationNotifications,
    ...eventReminderNotifications,
    ...eventUpdateNotifications,
    ...eventCancelledNotifications,
    ...checkinNotifications,
    ...pointsNotifications,
    ...feedbackRequestNotifications,
  ];

  if (allNotificationPayloads.length > 0) {
    await prisma.notification.createMany({
      data: allNotificationPayloads,
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    throw new Error('Admin account not found for audit log seeding');
  }

  const auditedUsers = [...allOrganizers, ...allStudents].slice(0, 18);
  const actionTypes = [
    'USER_ROLE_CHANGED',
    'USER_LOCKED',
    'EVENT_APPROVED',
    'EVENT_REJECTED',
    'CATEGORY_UPDATED',
    'DEPARTMENT_UPDATED',
  ];

  const auditLogPayloads = auditedUsers.map((user, index) => ({
    action_type: actionTypes[index % actionTypes.length],
    admin_id: admin.id,
    user_id: user.id,
    entity_type: user.role === 'student' ? 'user' : 'organizer',
    entity_id: user.id,
    old_value: { status: 'before-change', role: user.role },
    new_value: { status: 'after-change', role: user.role },
    metadata: { source: 'demo-seed-expansion', index },
    ip_address: `192.168.10.${20 + index}`,
    user_agent: 'SeedScript/1.0',
    created_at: new Date(Date.now() - index * 3600 * 1000),
  }));

  if (auditLogPayloads.length > 0) {
    await prisma.auditLog.createMany({
      data: auditLogPayloads,
    });
  }

  console.log(
    `✅ Demo expansion done: +${extraOrganizers.length} organizers, +${extraStudents.length} students, +${extraEvents.length} events`
  );

  return {
    extraOrganizers,
    extraStudents,
    extraEvents,
    extraRegistrations,
    extraAttendances: createdAttendances.length,
    extraTrainingPoints: awardedPoints.length,
    extraFeedback: feedbackCounter,
    extraNotifications: allNotificationPayloads.length,
    auditLogs: auditLogPayloads.length,
  };
}
