import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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

// ─── Shared email shell ──────────────────────────────────────────────────────

const EMAIL_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Event Management</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #00358F 0%, #F26600 100%); padding: 32px 40px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .body h2 { color: #00358F; margin: 0 0 20px; font-size: 20px; }
    .body p { color: #374151; line-height: 1.7; margin: 0 0 14px; font-size: 15px; }
    .info-box { background: #f0f4ff; border-left: 4px solid #00358F; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .info-box p { margin: 4px 0; color: #1f2937; }
    .info-box strong { color: #00358F; }
    .cta { display: inline-block; background: linear-gradient(135deg, #00358F, #F26600); color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
    .qr-section { text-align: center; margin: 24px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 40px; text-align: center; }
    .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
    .price-tag { font-size: 24px; font-weight: 700; color: #F26600; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status-success { background: #dcfce7; color: #16a34a; }
    .status-warning { background: #fef9c3; color: #ca8a04; }
    .status-error { background: #fee2e2; color: #dc2626; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Event Management</h1>
      <p>Hệ thống quản lý sự kiện</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống Event Management.</p>
      <p>Nếu cần hỗ trợ, vui lòng liên hệ quản trị viên.</p>
    </div>
  </div>
</body>
</html>
`;

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
                html: EMAIL_SHELL(options.html),
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

    const content = `
        <h2>Xác thực tài khoản</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản Event Management. Vui lòng xác thực email để kích hoạt tài khoản.</p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="${verificationUrl}" class="cta">Xác thực email</a>
        </div>
        <div class="info-box">
            <p><strong>Lưu ý:</strong></p>
            <p>• Link xác thực sẽ hết hạn sau <strong>24 giờ</strong>.</p>
            <p>• Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: 'Xác thực email - Event Management',
        html: content,
    });
};

export const sendPasswordResetEmail = async (
    email: string,
    fullName: string,
    resetToken: string
): Promise<void> => {
    const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;

    const content = `
        <h2>Đặt lại mật khẩu</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Event Management. Nhấn nút bên dưới để đặt lại mật khẩu mới.</p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" class="cta">Đặt lại mật khẩu</a>
        </div>
        <div class="info-box">
            <p><strong>Lưu ý:</strong></p>
            <p>• Link đặt lại mật khẩu sẽ hết hạn sau <strong>1 giờ</strong>.</p>
            <p>• Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: 'Yêu cầu đặt lại mật khẩu - Event Management',
        html: content,
    });
};

interface RegistrationEmailParams {
    email: string;
    fullName: string;
    eventTitle: string;
    eventLocation: string;
    eventStartTime: Date;
    eventEndTime: Date;
    trainingPoints: number;
    qrCodeDataUrl: string;
    eventCost?: number;
}

export const sendRegistrationConfirmation = async (
    params: RegistrationEmailParams
): Promise<void> => {
    const {
        email,
        fullName,
        eventTitle,
        eventLocation,
        eventStartTime,
        eventEndTime,
        trainingPoints,
        qrCodeDataUrl,
        eventCost,
    } = params;

    const costSection = eventCost && eventCost > 0
        ? `<div class="info-box">
             <p><strong>Phí tham dự:</strong> <span class="price-tag">${eventCost.toLocaleString('vi-VN')} VNĐ</span></p>
             <p><strong>Trạng thái:</strong> <span class="status-badge status-success">Đã thanh toán</span></p>
           </div>`
        : `<div class="info-box">
             <p><strong>Phí tham dự:</strong> Miễn phí</p>
             <p><strong>Trạng thái:</strong> <span class="status-badge status-success">Đã đăng ký</span></p>
           </div>`;

    const content = `
        <h2>Đăng ký thành công!</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Bạn đã đăng ký thành công sự kiện bên dưới. Hãy lưu giữ thông tin này và mang theo mã QR khi tham dự.</p>

        <div class="info-box">
            <p><strong>Tên sự kiện:</strong> ${eventTitle}</p>
            <p><strong>Thời gian:</strong> ${format(eventStartTime, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi })} – ${format(eventEndTime, 'HH:mm')}</p>
            <p><strong>Địa điểm:</strong> ${eventLocation}</p>
            <p><strong>Điểm rèn luyện:</strong> +${trainingPoints} điểm</p>
        </div>

        ${costSection}

        <div class="qr-section">
            <p style="font-weight:600; color:#00358F; margin-bottom:12px;">Mã QR Check-in của bạn</p>
            <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width:200px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.1);" />
            <p style="font-size:12px; color:#9ca3af; margin-top:8px;">Quét mã này khi đến sự kiện</p>
        </div>

        <div class="info-box" style="background:#fef9c3; border-left-color:#ca8a04;">
            <p><strong>Hướng dẫn:</strong></p>
            <p>• Vui lòng đến trước giờ bắt đầu sự kiện ít nhất 15 phút.</p>
            <p>• Xuất trình email này hoặc mã QR khi check-in tại quầy.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `Xác nhận đăng ký: ${eventTitle}`,
        html: content,
    });
};

export const sendEventReminder = async (
    email: string,
    fullName: string,
    eventTitle: string,
    startTime: Date,
    location: string
): Promise<void> => {
    const content = `
        <h2>Nhắc nhở sự kiện sắp diễn ra!</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Sự kiện bạn đã đăng ký sẽ diễn ra <strong>trong ít giờ tới</strong>. Đừng bỏ lỡ nhé!</p>

        <div class="info-box">
            <p><strong>Sự kiện:</strong> ${eventTitle}</p>
            <p><strong>Thời gian:</strong> ${format(startTime, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}</p>
            <p><strong>Địa điểm:</strong> ${location}</p>
        </div>

        <div class="info-box" style="background:#dcfce7; border-left-color:#16a34a;">
            <p><strong>Chuẩn bị trước:</strong></p>
            <p>• Đảm bảo điện thoại đã sạc đầy để quét QR.</p>
            <p>• Đến sớm 10-15 phút để check-in thuận tiện.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `Nhắc nhở: ${eventTitle} - Diễn ra sắp tới!`,
        html: content,
    });
};

export const sendEventUpdate = async (
    email: string,
    fullName: string,
    eventTitle: string,
    updateMessage: string,
    startTime?: Date,
    location?: string
): Promise<void> => {
    const details = [
        startTime ? `<p><strong>Thời gian mới:</strong> ${format(startTime, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}</p>` : '',
        location ? `<p><strong>Địa điểm mới:</strong> ${location}</p>` : '',
    ].filter(Boolean).join('');

    const content = `
        <h2>Cập nhật thông tin sự kiện</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Sự kiện bạn đã đăng ký có thông tin thay đổi như sau:</p>

        <div class="info-box">
            <p><strong>Sự kiện:</strong> ${eventTitle}</p>
            ${details}
            <p><strong>Thay đổi:</strong> ${updateMessage}</p>
        </div>

        <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ Ban tổ chức để được hỗ trợ.</p>
    `;

    await sendEmail({
        to: email,
        subject: `Cập nhật: ${eventTitle} - Có thông tin mới!`,
        html: content,
    });
};

export const sendEventCancellation = async (
    email: string,
    fullName: string,
    eventTitle: string,
    reason?: string
): Promise<void> => {
    const content = `
        <h2>Thông báo hủy sự kiện</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Rất tiếc, sự kiện bạn đã đăng ký đã bị hủy bởi Ban tổ chức.</p>

        <div class="info-box" style="background:#fee2e2; border-left-color:#dc2626;">
            <p><strong>Sự kiện:</strong> ${eventTitle}</p>
            ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
            <p><strong>Trạng thái:</strong> <span class="status-badge status-error">Đã hủy</span></p>
        </div>

        <p>Chúng tôi rất xin lỗi về sự bất tiện này. Nếu sự kiện được tổ chức lại, bạn sẽ nhận thông báo riêng.</p>
        <p>Điểm rèn luyện của bạn sẽ không bị ảnh hưởng vì sự kiện đã bị hủy trước khi diễn ra.</p>
    `;

    await sendEmail({
        to: email,
        subject: `Hủy sự kiện: ${eventTitle}`,
        html: content,
    });
};

interface PaymentSuccessEmailParams {
    email: string;
    fullName: string;
    eventTitle: string;
    amount: number;
    transactionId: string;
    paymentTime: Date;
}

export const sendPaymentSuccessEmail = async (
    params: PaymentSuccessEmailParams
): Promise<void> => {
    const { email, fullName, eventTitle, amount, transactionId, paymentTime } = params;

    const content = `
        <h2>Thanh toán thành công!</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Chúng tôi đã nhận được thanh toán của bạn cho sự kiện bên dưới. Bạn có thể yên tâm tham dự!</p>

        <div class="info-box">
            <p><strong>Sự kiện:</strong> ${eventTitle}</p>
            <p><strong>Số tiền:</strong> <span class="price-tag">${amount.toLocaleString('vi-VN')} VNĐ</span></p>
            <p><strong>Mã giao dịch:</strong> ${transactionId}</p>
            <p><strong>Thời gian:</strong> ${format(paymentTime, "dd/MM/yyyy 'lúc' HH:mm:ss", { locale: vi })}</p>
            <p><strong>Trạng thái:</strong> <span class="status-badge status-success">Thanh toán thành công</span></p>
        </div>

        <p>Bạn sẽ nhận được email xác nhận đăng ký kèm mã QR trong thời gian ngắn.</p>
    `;

    await sendEmail({
        to: email,
        subject: `Thanh toán thành công: ${eventTitle}`,
        html: content,
    });
};

interface PaymentFailedEmailParams {
    email: string;
    fullName: string;
    eventTitle: string;
    amount: number;
    reason?: string;
}

export const sendPaymentFailedEmail = async (
    params: PaymentFailedEmailParams
): Promise<void> => {
    const { email, fullName, eventTitle, amount, reason } = params;

    const content = `
        <h2>Thanh toán không thành công</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Rất tiếc, thanh toán cho sự kiện bên dưới đã không thành công.</p>

        <div class="info-box" style="background:#fee2e2; border-left-color:#dc2626;">
            <p><strong>Sự kiện:</strong> ${eventTitle}</p>
            <p><strong>Số tiền:</strong> ${amount.toLocaleString('vi-VN')} VNĐ</p>
            ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
            <p><strong>Trạng thái:</strong> <span class="status-badge status-error">Thanh toán thất bại</span></p>
        </div>

        <p>Đăng ký của bạn vẫn còn hiệu lực trong <strong>15 phút</strong>. Vui lòng thử thanh toán lại.</p>
        <p>Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
    `;

    await sendEmail({
        to: email,
        subject: `Thanh toán thất bại: ${eventTitle} - Vui lòng thử lại`,
        html: content,
    });
};
