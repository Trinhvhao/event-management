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

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'Event Management <noreply@university.edu.vn>',
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
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
