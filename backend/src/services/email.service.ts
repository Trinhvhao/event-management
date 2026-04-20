import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

const MAX_EMAIL_RETRIES = 2;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getFrontendBaseUrl = () =>
    process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';

const isEmailDeliveryDisabled = () =>
    process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL_SENDING === 'true';

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
    if (isEmailDeliveryDisabled()) {
        return;
    }

    for (let attempt = 0; attempt <= MAX_EMAIL_RETRIES; attempt++) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || 'Event Management <noreply@university.edu.vn>',
                to: options.to,
                subject: options.subject,
                html: options.html,
            });
            return;
        } catch (error) {
            const isLastAttempt = attempt === MAX_EMAIL_RETRIES;

            if (isLastAttempt) {
                console.error('Error sending email:', error);
                throw new Error('Failed to send email');
            }

            await wait((attempt + 1) * 500);
        }
    }
};

export const sendVerificationEmail = async (
    email: string,
    fullName: string,
    verificationToken: string
): Promise<void> => {
    const verificationUrl = `${getFrontendBaseUrl()}/verify-email?token=${verificationToken}`;

    const html = `
        <h2>Xac thuc email tai khoan</h2>
        <p>Xin chao ${fullName},</p>
        <p>Vui long xac thuc email de kich hoat tai khoan cua ban.</p>
        <p><a href="${verificationUrl}">Xac thuc email</a></p>
        <p>Link se het han sau 24 gio.</p>
    `;

    await sendEmail({
        to: email,
        subject: 'Xac thuc email tai khoan',
        html,
    });
};

export const sendPasswordResetEmail = async (
    email: string,
    fullName: string,
    resetToken: string
): Promise<void> => {
    const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;

    const html = `
        <h2>Dat lai mat khau</h2>
        <p>Xin chao ${fullName},</p>
        <p>Ban vua yeu cau dat lai mat khau cho tai khoan Event Management.</p>
        <p><a href="${resetUrl}">Dat lai mat khau</a></p>
        <p>Link se het han sau 1 gio. Neu ban khong thuc hien yeu cau nay, vui long bo qua email.</p>
    `;

    await sendEmail({
        to: email,
        subject: 'Yeu cau dat lai mat khau',
        html,
    });
};

export const sendRegistrationConfirmation = async (
    email: string,
    eventTitle: string,
    qrCode: string
): Promise<void> => {
    const html = `
        <h2>Đăng ký sự kiện thành công</h2>
        <p>Bạn đã đăng ký thành công sự kiện: <strong>${eventTitle}</strong></p>
        <p>Mã QR của bạn: <strong>${qrCode}</strong></p>
        <p>Vui lòng mang mã QR này khi tham dự sự kiện.</p>
    `;

    await sendEmail({
        to: email,
        subject: `Xác nhận đăng ký: ${eventTitle}`,
        html,
    });
};

export const sendEventReminder = async (
    email: string,
    eventTitle: string,
    startTime: Date
): Promise<void> => {
    const html = `
        <h2>Nhắc nhở sự kiện</h2>
        <p>Sự kiện <strong>${eventTitle}</strong> sẽ diễn ra vào ${startTime.toLocaleString('vi-VN')}</p>
        <p>Đừng quên tham dự!</p>
    `;

    await sendEmail({
        to: email,
        subject: `Nhắc nhở: ${eventTitle}`,
        html,
    });
};

export const sendEventUpdate = async (
    email: string,
    eventTitle: string,
    updateMessage: string
): Promise<void> => {
    const html = `
        <h2>Cập nhật sự kiện</h2>
        <p>Sự kiện <strong>${eventTitle}</strong> có thông tin cập nhật:</p>
        <p>${updateMessage}</p>
    `;

    await sendEmail({
        to: email,
        subject: `Cập nhật: ${eventTitle}`,
        html,
    });
};

export const sendEventCancellation = async (
    email: string,
    eventTitle: string,
    reason?: string
): Promise<void> => {
    const html = `
        <h2>Hủy sự kiện</h2>
        <p>Sự kiện <strong>${eventTitle}</strong> đã bị hủy.</p>
        ${reason ? `<p>Lý do: ${reason}</p>` : ''}
        <p>Chúng tôi xin lỗi vì sự bất tiện này.</p>
    `;

    await sendEmail({
        to: email,
        subject: `Hủy sự kiện: ${eventTitle}`,
        html,
    });
};
