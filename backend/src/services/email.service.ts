import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── Transporter ───────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_EMAIL_RETRIES = 2;
const APP_NAME = 'Event Management';
const BRAND_PRIMARY = '#00358F';
const BRAND_ACCENT = '#F26600';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getFrontendBaseUrl = () =>
    process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';

const isEmailDeliveryDisabled = () =>
    process.env.NODE_ENV === 'test' || process.env.DISABLE_EMAIL_SENDING === 'true';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const css = `
    /* ── Reset & Base ─────────────────────────────────────────── */
    body { margin: 0; padding: 0; background: #EEF2F7; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }
    .email-body { background: #EEF2F7; padding: 32px 16px; }

    /* ── Main Wrapper ──────────────────────────────────────────── */
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden;
               box-shadow: 0 8px 32px rgba(0, 53, 143, 0.10); }

    /* ── Header ───────────────────────────────────────────────── */
    .header { background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, #004db3 100%); padding: 36px 40px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; background: rgba(255,255,255,0.06); border-radius: 50%; }
    .header::after  { content: ''; position: absolute; bottom: -60px; left: 20%; width: 300px; height: 300px; background: rgba(255,255,255,0.04); border-radius: 50%; }
    .header-table { width: 100%; border-collapse: collapse; }
    .header-logo-cell { vertical-align: middle; }
    .header-icon { width: 44px; height: 44px; }
    .header-title { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; padding-left: 14px; vertical-align: middle; }
    .header-subtitle { color: rgba(255,255,255,0.75); font-size: 13px; padding-left: 14px; vertical-align: top; padding-top: 4px; }
    .header-tag { display: inline-block; background: rgba(255,255,255,0.15); color: #ffffff; font-size: 11px; font-weight: 600;
                  padding: 3px 10px; border-radius: 20px; margin-top: 6px; margin-left: 14px; letter-spacing: 0.5px; text-transform: uppercase; }

    /* ── Body ─────────────────────────────────────────────────── */
    .body { padding: 36px 40px; }

    /* ── Section Title ─────────────────────────────────────────── */
    .section-title { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${BRAND_ACCENT}; margin: 0 0 8px; }
    .section-heading { font-size: 24px; font-weight: 700; color: ${BRAND_PRIMARY}; margin: 0 0 20px; line-height: 1.3; }
    .greeting { font-size: 16px; color: #111827; margin: 0 0 16px; }
    .body-text { font-size: 15px; color: #4B5563; line-height: 1.75; margin: 0 0 14px; }

    /* ── Card / Info Box ───────────────────────────────────────── */
    .card { background: #F8FAFF; border: 1px solid #E2E8F4; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
    .card-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .card-row:last-child { margin-bottom: 0; }
    .card-icon { width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
    .card-label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; min-width: 100px; }
    .card-value { font-size: 15px; color: #111827; font-weight: 500; flex: 1; }
    .card-divider { border: none; border-top: 1px dashed #D1D9E6; margin: 12px 0; }

    /* ── Highlight Card ────────────────────────────────────────── */
    .highlight-card { background: linear-gradient(135deg, ${BRAND_PRIMARY}05, ${BRAND_ACCENT}08); border-left: 4px solid ${BRAND_ACCENT}; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .highlight-card p { margin: 4px 0; font-size: 14px; color: #374151; }
    .highlight-card strong { color: ${BRAND_PRIMARY}; }

    /* ── Status Badge ──────────────────────────────────────────── */
    .badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
    .badge-success { background: #DCFCE7; color: #15803D; }
    .badge-warning { background: #FEF9C3; color: #A16207; }
    .badge-error   { background: #FEE2E2; color: #B91C1C; }
    .badge-info    { background: #DBEAFE; color: #1D4ED8; }

    /* ── Price ─────────────────────────────────────────────────── */
    .price-tag { font-size: 26px; font-weight: 800; color: ${BRAND_ACCENT}; }

    /* ── Ticket Code ───────────────────────────────────────────── */
    .ticket-code { font-size: 18px; font-weight: 800; color: ${BRAND_PRIMARY}; letter-spacing: 2px; font-family: 'Courier New', monospace; }

    /* ── QR Section ────────────────────────────────────────────── */
    .qr-section { text-align: center; padding: 28px 0 16px; }
    .qr-label { font-size: 13px; font-weight: 600; color: ${BRAND_PRIMARY}; margin-bottom: 14px; letter-spacing: 0.3px; }
    .qr-image { max-width: 180px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,53,143,0.15); }
    .qr-hint { font-size: 12px; color: #9CA3AF; margin-top: 10px; }

    /* ── CTA Button ────────────────────────────────────────────── */
    .cta-wrap { text-align: center; padding: 8px 0 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, ${BRAND_PRIMARY}, #004db3); color: #ffffff; text-decoration: none;
           padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.2px;
           box-shadow: 0 4px 16px rgba(0,53,143,0.30); transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .cta:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,53,143,0.35); }
    .cta-accent { background: linear-gradient(135deg, ${BRAND_ACCENT}, #d95a00); box-shadow: 0 4px 16px rgba(242,102,0,0.30); }
    .cta-accent:hover { box-shadow: 0 6px 24px rgba(242,102,0,0.35); }

    /* ── Checklist ─────────────────────────────────────────────── */
    .checklist { list-style: none; padding: 0; margin: 16px 0; }
    .checklist li { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; font-size: 14px; color: #374151; line-height: 1.5; }
    .check-bullet { flex-shrink: 0; width: 20px; height: 20px; margin-top: 1px; }

    /* ── Alert Boxes ───────────────────────────────────────────── */
    .alert { border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    .alert-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
    .alert p { font-size: 14px; margin: 3px 0; }
    .alert-green { background: #F0FDF4; border: 1px solid #BBF7D0; }
    .alert-green .alert-title { color: #15803D; }
    .alert-green p { color: #166534; }
    .alert-yellow { background: #FEFCE8; border: 1px solid #FDE68A; }
    .alert-yellow .alert-title { color: #A16207; }
    .alert-yellow p { color: #713F12; }
    .alert-red { background: #FEF2F2; border: 1px solid #FECACA; }
    .alert-red .alert-title { color: #B91C1C; }
    .alert-red p { color: #7F1D1D; }
    .alert-blue { background: #EFF6FF; border: 1px solid #BFDBFE; }
    .alert-blue .alert-title { color: #1D4ED8; }
    .alert-blue p { color: #1E3A8A; }

    /* ── Divider ───────────────────────────────────────────────── */
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 28px 0; }

    /* ── Footer ───────────────────────────────────────────────── */
    .footer { background: #F8FAFC; border-top: 1px solid #E5E7EB; padding: 28px 40px; text-align: center; }
    .footer-logo { font-size: 16px; font-weight: 700; color: ${BRAND_PRIMARY}; margin: 0 0 6px; }
    .footer p { color: #9CA3AF; font-size: 12px; margin: 4px 0; line-height: 1.6; }
    .footer a { color: ${BRAND_PRIMARY}; text-decoration: none; }
    .footer-links { margin-top: 14px; }
    .footer-links a { color: #6B7280; font-size: 12px; margin: 0 8px; }

    /* ── Utilities ─────────────────────────────────────────────── */
    .text-center { text-align: center; }
    .mt-24 { margin-top: 24px; }
    .mb-8  { margin-bottom: 8px; }
    .mb-16 { margin-bottom: 16px; }
    .mb-20 { margin-bottom: 20px; }

    /* ── Dark Mode ─────────────────────────────────────────────── */
    @media (prefers-color-scheme: dark) {
        .email-body { background: #1A1A2E !important; }
        .wrapper { background: #16213E !important; }
        .card { background: #1E2A4A !important; border-color: #2D3A5A !important; }
        .card-value { color: #E5E7EB !important; }
        .body-text  { color: #CBD5E1 !important; }
        .greeting   { color: #F1F5F9 !important; }
        .section-heading { color: #60A5FA !important; }
        .highlight-card { background: linear-gradient(135deg, #1D4ED820, #F2660015) !important; }
        .highlight-card p { color: #CBD5E1 !important; }
        .highlight-card strong { color: #60A5FA !important; }
        .alert-green { background: #052E1620 !important; border-color: #15803D40 !important; }
        .alert-green p { color: #86EFAC !important; }
        .alert-yellow { background: #42200620 !important; border-color: #A1620740 !important; }
        .alert-yellow p { color: #FDE68A !important; }
        .alert-red { background: #2D0A0A20 !important; border-color: #B91C1C40 !important; }
        .alert-red p { color: #FECACA !important; }
        .alert-blue { background: #17255420 !important; border-color: #1D4ED840 !important; }
        .alert-blue p { color: #93C5FD !important; }
        .footer { background: #0F172A !important; border-color: #1E293B !important; }
        .divider { border-color: #1E293B !important; }
    }
`;

// ─── Email Shell ──────────────────────────────────────────────────────────────

const EMAIL_SHELL = (content: string, preheader?: string): string => `
<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Event Management</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>${css}</style>
</head>
<body>
  <div class="email-body">
    <!--[if mso]>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#EEF2F7;">
    <tr><td style="padding:32px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" width="600" align="center" style="max-width:600px;">
    <![endif]-->
    <!--[if !mso]><!-->
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
    <tr><td class="email-body">
    <!--<![endif]-->
      <table class="wrapper" role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px; margin:0 auto;">

        <!-- ── HEADER ─────────────────────────────────────────────── -->
        <tr>
          <td class="header">
            <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
              <tr>
                <td class="header-logo-cell">
                  <!-- Event Icon SVG -->
                  <svg class="header-icon" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="44" height="44" rx="10" fill="rgba(255,255,255,0.15)"/>
                    <path d="M12 14h20M12 22h20M12 30h20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <rect x="8" y="10" width="28" height="28" rx="4" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none"/>
                  </svg>
                </td>
                <td class="header-title">
                  Event Management
                  <div class="header-subtitle">Hệ thống Quản lý Sự kiện</div>
                  ${preheader ? `<span class="header-tag">${preheader}</span>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── BODY ───────────────────────────────────────────────── -->
        <tr>
          <td class="body">
            ${content}
          </td>
        </tr>

        <!-- ── FOOTER ────────────────────────────────────────────── -->
        <tr>
          <td class="footer">
            <p class="footer-logo">Event Management</p>
            <p>Hệ thống Quản lý Sự kiện &mdash; Tự động gửi thông báo</p>
            <p style="margin-top:10px;">
              Bạn nhận được email này vì đã đăng ký tài khoản trên hệ thống.<br/>
              Nếu không phải bạn thực hiện, vui lòng bỏ qua email này.
            </p>
            <div class="footer-links">
              <a href="${getFrontendBaseUrl()}">Truy cập hệ thống</a>
              <a href="mailto:noreply@university.edu.vn">Liên hệ hỗ trợ</a>
            </div>
            <p style="margin-top:16px; font-size:11px; color:#C4C9D4;">
              &copy; ${new Date().getFullYear()} Event Management. Mọi quyền được bảo lưu.
            </p>
          </td>
        </tr>

      </table>
    <!--[if !mso]><!-->
    </td></tr></table>
    <!--<![endif]-->
    <!--[if mso]>
    </table></td></tr></table>
    <![endif]-->
  </div>
</body>
</html>
`;

// ─── Email sending ────────────────────────────────────────────────────────────

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
    console.log('[Email] sendEmail called:', { to: options.to, subject: options.subject });

    if (isEmailDeliveryDisabled()) {
        console.log('[Email] ⚠️ Delivery is DISABLED');
        return;
    }

    const textFallback = options.text ?? stripHtml(options.html);

    for (let attempt = 0; attempt <= MAX_EMAIL_RETRIES; attempt++) {
        try {
            console.log(`[Email] Attempt ${attempt + 1} - Sending to ${options.to}...`);
            const result = await transporter.sendMail({
                from: process.env.EMAIL_FROM || `${APP_NAME} <noreply@university.edu.vn>`,
                to: options.to,
                subject: options.subject,
                html: EMAIL_SHELL(options.html),
                text: textFallback,
            });
            console.log(`[Email] ✅ Success! MessageId: ${result.messageId}`);
            return;
        } catch (error: any) {
            console.error(`[Email] ❌ Attempt ${attempt + 1} failed:`, error.message);
            if (attempt === MAX_EMAIL_RETRIES) {
                console.error('[Email] Failed after retries');
                throw new Error('Failed to send email');
            }
            await wait((attempt + 1) * 500);
        }
    }
};

// ─── UTIL: strip HTML for text fallback ──────────────────────────────────────

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
}

// ─── UTIL: icon SVG inline ───────────────────────────────────────────────────

function iconCalendar() {
    return `<svg class="card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="${BRAND_PRIMARY}" stroke-width="1.5"/>
      <path d="M2 8h16M6 2v4M14 2v4" stroke="${BRAND_PRIMARY}" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}
function iconLocation() {
    return `<svg class="card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 11a3 3 0 100-6 3 3 0 000 6z" stroke="${BRAND_PRIMARY}" stroke-width="1.5"/>
      <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 9 5 9s5-4.75 5-9c0-2.76-2.24-5-5-5z" stroke="${BRAND_PRIMARY}" stroke-width="1.5"/>
    </svg>`;
}
function iconTicket() {
    return `<svg class="card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h14M3 14h14M6 3v14M14 3v14" stroke="${BRAND_PRIMARY}" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="6" cy="6" r="1.5" fill="${BRAND_PRIMARY}"/>
      <circle cx="6" cy="14" r="1.5" fill="${BRAND_PRIMARY}"/>
      <circle cx="14" cy="6" r="1.5" fill="${BRAND_PRIMARY}"/>
      <circle cx="14" cy="14" r="1.5" fill="${BRAND_PRIMARY}"/>
    </svg>`;
}
function iconCheck() {
    return `<svg class="check-bullet" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" fill="#DCFCE7"/>
      <path d="M6.5 10l2.5 2.5 4.5-5" stroke="#15803D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}
function iconWarning() {
    return `<svg class="card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L1.5 17h17L10 2z" stroke="${BRAND_ACCENT}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M10 8v4M10 14h.01" stroke="${BRAND_ACCENT}" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}
function iconSuccess() {
    return `<svg class="card-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke="#15803D" stroke-width="1.5"/>
      <path d="M6.5 10l2.5 2.5 4.5-5" stroke="#15803D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

// ─── VERIFICATION EMAIL ──────────────────────────────────────────────────────

export const sendVerificationEmail = async (
    email: string,
    fullName: string,
    verificationToken: string
): Promise<void> => {
    const verificationUrl = `${getFrontendBaseUrl()}/verify-email?token=${verificationToken}`;

    const content = `
        <p class="section-title">Xác thực tài khoản</p>
        <h1 class="section-heading">Kích hoạt tài khoản của bạn</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Cảm ơn bạn đã đăng ký tài khoản trên <strong>Event Management</strong>. Vui lòng xác thực email để kích hoạt tài khoản và bắt đầu tham gia các sự kiện.</p>

        <div class="cta-wrap">
          <a href="${verificationUrl}" class="cta">Xác thực email ngay</a>
        </div>

        <div class="highlight-card">
          <p><strong>Lưu ý quan trọng:</strong></p>
          <p>&#8226; Link xác thực có hiệu lực trong <strong>24 giờ</strong> kể từ khi nhận email.</p>
          <p>&#8226; Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email — tài khoản sẽ không được tạo.</p>
          <p>&#8226; Không chia sẻ link xác thực cho bất kỳ ai.</p>
        </div>

        <p class="body-text" style="margin-top:20px; font-size:13px; color:#9CA3AF;">
          Nếu nút bên trên không hoạt động, sao chép và dán link sau vào trình duyệt:<br/>
          <span style="word-break:break-all; color:${BRAND_PRIMARY};">${verificationUrl}</span>
        </p>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Xác thực tài khoản — Kích hoạt ngay`,
        html: content,
        text: `
 Xin chào ${fullName},

 Cảm ơn bạn đã đăng ký tài khoản Event Management.

 Vui lòng xác thực email bằng cách truy cập:
 ${verificationUrl}

 Lưu ý:
 - Link xác thực hết hạn sau 24 giờ.
 - Nếu bạn không đăng ký, vui lòng bỏ qua email này.
        `.trim(),
    });
};

// ─── PASSWORD RESET EMAIL ─────────────────────────────────────────────────────

export const sendPasswordResetEmail = async (
    email: string,
    fullName: string,
    resetToken: string
): Promise<void> => {
    const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;

    const content = `
        <p class="section-title">Bảo mật tài khoản</p>
        <h1 class="section-heading">Đặt lại mật khẩu</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới.</p>

        <div class="cta-wrap">
          <a href="${resetUrl}" class="cta cta-accent">Đặt lại mật khẩu</a>
        </div>

        <div class="alert alert-red">
          <div class="alert-title">&#9888; Cảnh báo bảo mật</div>
          <p>&#8226; Link đặt lại mật khẩu chỉ có hiệu lực trong <strong>1 giờ</strong>.</p>
          <p>&#8226; Nếu bạn không yêu cầu đặt lại mật khẩu, email này có thể là giả mạo — <strong>không nhấp vào link</strong>.</p>
          <p>&#8226; Tuyệt đối không chia sẻ link cho người khác.</p>
        </div>

        <p class="body-text" style="margin-top:16px; font-size:13px; color:#9CA3AF;">
          Nếu nút bên trên không hoạt động, sao chép và dán link sau:<br/>
          <span style="word-break:break-all; color:${BRAND_PRIMARY};">${resetUrl}</span>
        </p>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Yêu cầu đặt lại mật khẩu`,
        html: content,
    });
};

// ─── REGISTRATION CONFIRMATION ───────────────────────────────────────────────

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
        email, fullName, eventTitle, eventLocation,
        eventStartTime, eventEndTime, trainingPoints, qrCodeDataUrl, eventCost,
    } = params;

    const startStr = format(eventStartTime, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
    const endStr = format(eventEndTime, 'HH:mm');
    const costSection = eventCost && eventCost > 0
        ? `<span class="price-tag">${eventCost.toLocaleString('vi-VN')} VNĐ</span>`
        : 'Miễn phí';
    const costBadge = eventCost && eventCost > 0
        ? '<span class="badge badge-success">Đã thanh toán</span>'
        : '<span class="badge badge-success">Đã đăng ký</span>';

    const content = `
        <p class="section-title">Xác nhận đăng ký</p>
        <h1 class="section-heading">Bạn đã đăng ký thành công!</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Bạn đã đăng ký thành công sự kiện bên dưới. Hãy lưu giữ email này và mang theo <strong>mã QR</strong> khi đến tham dự.</p>

        <div class="card">
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Sự kiện</div>
              <div class="card-value" style="font-size:17px; font-weight:700; color:${BRAND_PRIMARY};">${eventTitle}</div>
            </div>
          </div>
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Thời gian</div>
              <div class="card-value">${startStr} &ndash; ${endStr}</div>
            </div>
          </div>
          <div class="card-row">
            ${iconLocation()}
            <div>
              <div class="card-label">Địa điểm</div>
              <div class="card-value">${eventLocation}</div>
            </div>
          </div>
          <div class="card-row">
            ${iconTicket()}
            <div>
              <div class="card-label">Điểm rèn luyện</div>
              <div class="card-value">+${trainingPoints} điểm</div>
            </div>
          </div>
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconSuccess()}
            <div>
              <div class="card-label">Phí tham dự</div>
              <div class="card-value">${costSection} &nbsp; ${costBadge}</div>
            </div>
          </div>
        </div>

        <div class="qr-section">
          <div class="qr-label">Mã QR Check-in của bạn</div>
          <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-image" />
          <div class="qr-hint">Quét mã này tại cổng check-in của sự kiện</div>
        </div>

        <div class="alert alert-yellow">
          <div class="alert-title">&#9432; Hướng dẫn check-in</div>
          <p>&#8226; Vui lòng đến trước giờ bắt đầu sự kiện ít nhất <strong>15 phút</strong>.</p>
          <p>&#8226; Xuất trình email này hoặc mã QR khi check-in tại quầy.</p>
          <p>&#8226; Đảm bảo điện thoại đã sạc đầy để quét QR thuận tiện.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Xác nhận đăng ký: ${eventTitle}`,
        html: content,
    });
};

// ─── EVENT REMINDER ─────────────────────────────────────────────────────────

export const sendEventReminder = async (
    email: string,
    fullName: string,
    eventTitle: string,
    startTime: Date,
    location: string
): Promise<void> => {
    const startStr = format(startTime, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi });

    const content = `
        <p class="section-title">Nhắc nhở sự kiện</p>
        <h1 class="section-heading">Sự kiện sắp diễn ra!</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Sự kiện bạn đã đăng ký sẽ diễn ra <strong>trong ít giờ tới</strong>. Đừng bỏ lỡ nhé!</p>

        <div class="card">
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Sự kiện</div>
              <div class="card-value" style="font-size:17px; font-weight:700; color:${BRAND_PRIMARY};">${eventTitle}</div>
            </div>
          </div>
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Thời gian</div>
              <div class="card-value">${startStr}</div>
            </div>
          </div>
          <div class="card-row">
            ${iconLocation()}
            <div>
              <div class="card-label">Địa điểm</div>
              <div class="card-value">${location}</div>
            </div>
          </div>
        </div>

        <div class="alert alert-green">
          <div class="alert-title">&#10003; Chuẩn bị trước khi đến</div>
          <p>&#8226; Đảm bảo điện thoại đã sạc đầy để quét QR check-in.</p>
          <p>&#8226; Đến sớm <strong>10–15 phút</strong> để check-in thuận tiện.</p>
          <p>&#8226; Mang theo email xác nhận hoặc screenshot mã QR.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Nhắc nhở: "${eventTitle}" diễn ra sắp tới!`,
        html: content,
    });
};

// ─── EVENT UPDATE ────────────────────────────────────────────────────────────

export const sendEventUpdate = async (
    email: string,
    fullName: string,
    eventTitle: string,
    updateMessage: string,
    startTime?: Date,
    location?: string
): Promise<void> => {
    const startStr = startTime
        ? format(startTime, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi })
        : null;

    const extraDetails = [
        startStr ? `<p>&#8226; <strong>Thời gian mới:</strong> ${startStr}</p>` : '',
        location ? `<p>&#8226; <strong>Địa điểm mới:</strong> ${location}</p>` : '',
    ].filter(Boolean).join('');

    const content = `
        <p class="section-title">Cập nhật thông tin</p>
        <h1 class="section-heading">Thông tin sự kiện có thay đổi</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Sự kiện bạn đã đăng ký có thông tin thay đổi như sau:</p>

        <div class="card">
          <div class="card-row">
            ${iconTicket()}
            <div>
              <div class="card-label">Sự kiện</div>
              <div class="card-value" style="font-weight:700; color:${BRAND_PRIMARY};">${eventTitle}</div>
            </div>
          </div>
          ${extraDetails ? `<hr class="card-divider"/>` : ''}
          ${extraDetails}
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconWarning()}
            <div>
              <div class="card-label">Thay đổi</div>
              <div class="card-value">${updateMessage}</div>
            </div>
          </div>
        </div>

        <p class="body-text">Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ Ban tổ chức để được hỗ trợ.</p>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Cập nhật: "${eventTitle}" — Có thông tin mới!`,
        html: content,
    });
};

// ─── EVENT CANCELLATION ──────────────────────────────────────────────────────

export const sendEventCancellation = async (
    email: string,
    fullName: string,
    eventTitle: string,
    reason?: string
): Promise<void> => {
    const content = `
        <p class="section-title">Thông báo quan trọng</p>
        <h1 class="section-heading">Sự kiện đã bị hủy</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Rất tiếc, sự kiện bạn đã đăng ký đã bị <strong>hủy bỏ</strong> bởi Ban tổ chức.</p>

        <div class="alert alert-red">
          <div class="alert-title">&#10005; Sự kiện đã hủy</div>
          <p><strong>Tên sự kiện:</strong> ${eventTitle}</p>
          ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
          <p><strong>Trạng thái:</strong> <span class="badge badge-error">Đã hủy</span></p>
        </div>

        <div class="highlight-card">
          <p>&#8226; Chúng tôi rất xin lỗi về sự bất tiện này.</p>
          <p>&#8226; Nếu sự kiện được tổ chức lại, bạn sẽ nhận thông báo riêng.</p>
          <p>&#8226; Điểm rèn luyện của bạn sẽ <strong>không bị ảnh hưởng</strong> vì sự kiện hủy trước ngày diễn ra.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Thông báo hủy: "${eventTitle}"`,
        html: content,
    });
};

// ─── PAYMENT SUCCESS ─────────────────────────────────────────────────────────

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
    const timeStr = format(paymentTime, "dd/MM/yyyy 'lúc' HH:mm:ss", { locale: vi });

    const content = `
        <p class="section-title">Thanh toán</p>
        <h1 class="section-heading">Thanh toán thành công!</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Chúng tôi đã nhận được thanh toán của bạn cho sự kiện bên dưới. Bạn có thể yên tâm tham dự!</p>

        <div class="card">
          <div class="card-row">
            ${iconTicket()}
            <div>
              <div class="card-label">Sự kiện</div>
              <div class="card-value" style="font-weight:700; color:${BRAND_PRIMARY};">${eventTitle}</div>
            </div>
          </div>
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconSuccess()}
            <div>
              <div class="card-label">Số tiền</div>
              <div class="card-value"><span class="price-tag">${amount.toLocaleString('vi-VN')} VNĐ</span></div>
            </div>
          </div>
          <div class="card-row">
            ${iconTicket()}
            <div>
              <div class="card-label">Mã giao dịch</div>
              <div class="card-value" style="font-family:monospace; font-size:14px;">${transactionId}</div>
            </div>
          </div>
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Thời gian</div>
              <div class="card-value">${timeStr}</div>
            </div>
          </div>
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconSuccess()}
            <div>
              <div class="card-label">Trạng thái</div>
              <div class="card-value"><span class="badge badge-success">Thanh toán thành công</span></div>
            </div>
          </div>
        </div>

        <div class="alert alert-blue">
          <div class="alert-title">&#9432; Bước tiếp theo</div>
          <p>Bạn sẽ nhận được <strong>email xác nhận đăng ký</strong> kèm mã QR check-in trong thời gian ngắn.</p>
          <p>Theo dõi <a href="${getFrontendBaseUrl()}/dashboard/tickets" style="color:${BRAND_PRIMARY}; font-weight:600;">Vé của tôi</a> để xem trạng thái.</p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Thanh toán thành công: ${eventTitle}`,
        html: content,
    });
};

// ─── PAYMENT FAILED ───────────────────────────────────────────────────────────

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
        <p class="section-title">Thanh toán</p>
        <h1 class="section-heading">Thanh toán không thành công</h1>
        <p class="greeting">Xin chào <strong>${fullName}</strong>,</p>
        <p class="body-text">Rất tiếc, thanh toán cho sự kiện bên dưới đã không thành công.</p>

        <div class="alert alert-red">
          <div class="alert-title">&#10005; Thanh toán thất bại</div>
          <p><strong>Sự kiện:</strong> ${eventTitle}</p>
          <p><strong>Số tiền:</strong> ${amount.toLocaleString('vi-VN')} VNĐ</p>
          ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
          <p><strong>Trạng thái:</strong> <span class="badge badge-error">Thanh toán thất bại</span></p>
        </div>

        <div class="highlight-card">
          <p>&#8226; Đăng ký của bạn vẫn còn hiệu lực trong <strong>15 phút</strong>. Vui lòng thử thanh toán lại.</p>
          <p>&#8226; Kiểm tra số dư tài khoản và thông tin thẻ trước khi thử lại.</p>
          <p>&#8226; Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ quản trị viên.</p>
        </div>

        <div class="cta-wrap">
          <a href="${getFrontendBaseUrl()}/dashboard/events" class="cta">Thử thanh toán lại</a>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: `[Event Management] Thanh toán thất bại: ${eventTitle} — Vui lòng thử lại`,
        html: content,
    });
};

// ─── TICKET EMAIL with PDF attachment ────────────────────────────────────────

export const sendEmailWithAttachment = async (
    options: SendEmailOptions & { attachment?: { filename: string; path: string } }
): Promise<void> => {
    if (isEmailDeliveryDisabled()) {
        return;
    }

    const textFallback = options.text ?? stripHtml(options.html);

    for (let attempt = 0; attempt <= MAX_EMAIL_RETRIES; attempt++) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || `${APP_NAME} <noreply@university.edu.vn>`,
                to: options.to,
                subject: options.subject,
                html: EMAIL_SHELL(options.html),
                text: textFallback,
                attachments: options.attachment ? [options.attachment] : [],
            });
            return;
        } catch (error) {
            if (attempt === MAX_EMAIL_RETRIES) {
                console.error('[Email] Failed with attachment:', error);
                throw new Error('Failed to send email');
            }
            await wait((attempt + 1) * 500);
        }
    }
};

export const sendTicketEmail = async (
    ticket: any,
    pdfPath?: string
): Promise<void> => {
    const { registration, ticket_code, qr_image } = ticket;
    const { user, event } = registration;

    const startStr = format(new Date(event.start_time), "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
    const endStr = format(new Date(event.end_time), 'HH:mm');

    const content = `
        <p class="section-title">Xác nhận đăng ký</p>
        <h1 class="section-heading">Vé điện tử của bạn</h1>
        <p class="greeting">Xin chào <strong>${user.full_name}</strong>,</p>
        <p class="body-text">Bạn đã đăng ký thành công sự kiện bên dưới. <strong>Ticket điện tử</strong> được đính kèm trong email này (file PDF). Vui lòng lưu giữ cẩn thận.</p>

        <div class="card">
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Sự kiện</div>
              <div class="card-value" style="font-size:17px; font-weight:700; color:${BRAND_PRIMARY};">${event.title}</div>
            </div>
          </div>
          <hr class="card-divider"/>
          <div class="card-row">
            ${iconCalendar()}
            <div>
              <div class="card-label">Thời gian</div>
              <div class="card-value">${startStr} &ndash; ${endStr}</div>
            </div>
          </div>
          <div class="card-row">
            ${iconLocation()}
            <div>
              <div class="card-label">Địa điểm</div>
              <div class="card-value">${event.location || 'Chưa xác định'}</div>
            </div>
          </div>
          <div class="card-row">
            ${iconTicket()}
            <div>
              <div class="card-label">Mã Ticket</div>
              <div class="card-value"><span class="ticket-code">${ticket_code}</span></div>
            </div>
          </div>
        </div>

        ${event.description ? `<p class="body-text" style="font-style:italic; color:#9CA3AF; margin-top:8px;">${event.description}</p>` : ''}

        <div class="qr-section">
          <div class="qr-label">Mã QR Check-in</div>
          <img src="${qr_image}" alt="QR Code" class="qr-image" />
          <div class="qr-hint">Quét mã này tại cổng check-in của sự kiện</div>
        </div>

        <div class="card" style="background:#F0FDF4; border-color:#BBF7D0;">
          <div class="card-label" style="margin-bottom:10px;">Thông tin người tham dự</div>
          <div class="card-row">
            <div>
              <div class="card-label">Họ tên</div>
              <div class="card-value">${user.full_name}</div>
            </div>
            <div>
              <div class="card-label">MSSV</div>
              <div class="card-value">${user.student_id || 'N/A'}</div>
            </div>
            ${user.department ? `
            <div>
              <div class="card-label">Khoa</div>
              <div class="card-value">${user.department.name}</div>
            </div>` : ''}
          </div>
        </div>

        <div class="alert alert-yellow">
          <div class="alert-title">&#9432; Hướng dẫn check-in</div>
          <ul class="checklist">
            <li>${iconCheck()} Vui lòng đến trước giờ bắt đầu sự kiện ít nhất <strong>15 phút</strong>.</li>
            <li>${iconCheck()} Xuất trình <strong>ticket PDF</strong> đính kèm hoặc mã QR khi check-in tại cổng.</li>
            <li>${iconCheck()} <strong>Không chia sẻ ticket</strong> với người khác dưới mọi hình thức.</li>
            <li>${iconCheck()} Đảm bảo điện thoại đã sạc đầy để quét QR.</li>
          </ul>
        </div>

        <div class="cta-wrap">
          <a href="${getFrontendBaseUrl()}/dashboard/tickets" class="cta">Xem ticket trên website</a>
        </div>
    `;

    const emailOptions: SendEmailOptions & { attachment?: { filename: string; path: string } } = {
        to: user.email,
        subject: `[Event Management] Vé điện tử — ${event.title}`,
        html: content,
    };

    if (pdfPath && fs.existsSync(pdfPath)) {
        emailOptions.attachment = {
            filename: `VE-${ticket_code}.pdf`,
            path: pdfPath,
        };
    }

    await sendEmailWithAttachment(emailOptions);
};

// ─── PROFESSIONAL TICKET PDF ─────────────────────────────────────────────────

export const generateTicketPDF = async (ticket: any): Promise<string> => {
    const { registration, ticket_code, qr_image } = ticket;
    const { user, event } = registration;

    const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const pdfPath = path.join(uploadsDir, `VE-${ticket_code}.pdf`);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A5',
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                info: {
                    Title: `Vé sự kiện - ${event.title}`,
                    Author: 'Event Management',
                    Subject: `Ticket ${ticket_code}`,
                    Keywords: `event, ticket, ${ticket_code}`,
                },
            });
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            const W = doc.page.width;
            const H = doc.page.height;

            // ── BACKGROUND ─────────────────────────────────────────────
            // Soft gradient-like background via filled rectangles
            doc.rect(0, 0, W, H).fill('#FAFCFF');

            // Left brand strip
            doc.rect(0, 0, 8, H).fill(BRAND_PRIMARY);

            // Top decorative arc
            doc.circle(W - 20, -20, 100).fill('#00358F10');
            doc.circle(20, H + 20, 80).fill('#F2660010');

            // ── HEADER ───────────────────────────────────────────────
            const headerH = 72;
            doc.rect(0, 0, W, headerH).fill(BRAND_PRIMARY);

            // Event icon area
            doc.roundedRect(12, 12, 48, 48, 8).fill('rgba(255,255,255,0.12)');
            doc.fillColor('#FFFFFF')
                .font('Helvetica-Bold')
                .fontSize(10)
                .text('EVENT', 16, 28, { width: 40, align: 'center' })
                .text('TICKET', 16, 40, { width: 40, align: 'center' });

            // Title
            doc.fillColor('#FFFFFF')
                .font('Helvetica-Bold')
                .fontSize(20)
                .text('VÉ SỰ KIỆN', 68, 14, { width: W - 90 });

            // App name
            doc.fillColor('rgba(255,255,255,0.65)')
                .font('Helvetica')
                .fontSize(10)
                .text('Event Management System', 68, 38, { width: W - 90 });

            // Ticket code badge
            doc.roundedRect(W - 148, 18, 132, 36, 6).fill('rgba(255,255,255,0.15)');
            doc.fillColor('#FFFFFF')
                .font('Helvetica-Bold')
                .fontSize(11)
                .text('MÃ VÉ', W - 142, 22, { width: 120, align: 'center' });
            doc.fontSize(13)
                .text(ticket_code, W - 142, 36, { width: 120, align: 'center' });

            // ── PERFORATION LINE ──────────────────────────────────────
            const perfY = headerH + 110;
            doc.dash(4, { space: 3 });
            doc.moveTo(8, perfY).lineTo(W - 8, perfY).strokeColor('#D1D5DB').stroke();
            doc.undash();

            // ── MAIN TICKET BODY ─────────────────────────────────────
            const bodyTop = headerH + 8;
            const bodyPad = 14;

            // Event title block
            doc.fillColor(BRAND_PRIMARY)
                .font('Helvetica-Bold')
                .fontSize(16)
                .text(event.title, bodyPad, bodyTop + 4, { width: W - 28, lineGap: 2 });

            // ── QR CODE ───────────────────────────────────────────────
            const qrSize = 100;
            const qrX = (W - qrSize) / 2;
            const qrY = bodyTop + 55;

            if (qr_image) {
                try {
                    const qrBuffer = Buffer.from(qr_image.split(',')[1], 'base64');
                    doc.image(qrBuffer, qrX, qrY, { width: qrSize });
                } catch {
                    // Fallback: draw placeholder
                    doc.rect(qrX, qrY, qrSize, qrSize)
                        .fillAndStroke('#F3F4F6', '#D1D5DB');
                    doc.fillColor('#9CA3AF')
                        .fontSize(10)
                        .text('[QR Code]', qrX, qrY + 40, { width: qrSize, align: 'center' });
                }
            }

            // QR label
            doc.fillColor('#6B7280')
                .fontSize(8)
                .text('QUÉT MÃ QR ĐỂ CHECK-IN', 0, qrY + qrSize + 4, { align: 'center' });

            // ── DETAILS GRID ─────────────────────────────────────────
            const gridY = qrY + qrSize + 22;
            const colW = (W - 28) / 2;

            const drawDetail = (label: string, value: string, x: number, y: number, w: number) => {
                doc.fillColor('#9CA3AF')
                    .fontSize(8)
                    .text(label.toUpperCase(), x, y, { width: w });
                doc.fillColor('#111827')
                    .font('Helvetica-Bold')
                    .fontSize(11)
                    .text(value, x, y + 12, { width: w });
            };

            // Date & Time
            const dateStr = format(new Date(event.start_time), 'dd/MM/yyyy');
            const timeStr = `${format(new Date(event.start_time), 'HH:mm')} – ${format(new Date(event.end_time), 'HH:mm')}`;
            drawDetail('Ngày diễn ra', dateStr, bodyPad, gridY, colW);
            drawDetail('Giờ bắt đầu', timeStr, bodyPad + colW, gridY, colW);

            // Location
            doc.fillColor('#9CA3AF').fontSize(8).text('ĐỊA ĐIỂM', bodyPad, gridY + 32, { width: W - 28 });
            doc.fillColor('#111827')
                .font('Helvetica-Bold')
                .fontSize(11)
                .text(event.location || 'Chưa xác định', bodyPad, gridY + 44, { width: W - 28 });

            // ── ATTENDEE INFO ────────────────────────────────────────
            const attendeeY = gridY + 68;
            doc.rect(bodyPad, attendeeY, W - 28, 60)
                .fillAndStroke('#F8FAFF', '#E2E8F0');

            doc.fillColor(BRAND_PRIMARY)
                .font('Helvetica-Bold')
                .fontSize(8)
                .text('THÔNG TIN NGƯỜI THAM DỰ', bodyPad + 8, attendeeY + 6, { width: W - 44 });

            doc.fillColor('#111827')
                .font('Helvetica')
                .fontSize(9.5);

            const attendeeInfo = [
                `Họ tên: ${user.full_name}`,
                `MSSV: ${user.student_id || 'N/A'}`,
                user.department ? `Khoa: ${user.department.name}` : null,
            ].filter(Boolean);

            attendeeInfo.forEach((line, i) => {
                doc.text(line as string, bodyPad + 8, attendeeY + 20 + i * 14, { width: W - 44 });
            });

            // ── STUB (left tear-off) ──────────────────────────────────
            const stubTop = headerH;
            const stubW = 48;

            // Vertical divider
            doc.dash(2, { space: 2 });
            doc.moveTo(stubW + 6, stubTop).lineTo(stubW + 6, perfY).strokeColor('#D1D5DB').stroke();
            doc.undash();

            // Stub content
            doc.fillColor(BRAND_PRIMARY)
                .font('Helvetica-Bold')
                .fontSize(7)
                .text('VÉ', 4, stubTop + 10, { width: stubW - 4, align: 'center' });

            doc.fillColor('#6B7280')
                .fontSize(6)
                .text(ticket_code, 2, stubTop + 30, { width: stubW, align: 'center', lineGap: 1 });

            // Stub QR (smaller)
            if (qr_image) {
                try {
                    const qrBuf = Buffer.from(qr_image.split(',')[1], 'base64');
                    doc.image(qrBuf, 8, stubTop + 50, { width: 32 });
                } catch {
                    // skip
                }
            }

            // ── FOOTER ───────────────────────────────────────────────
            const footerY = H - 44;
            doc.rect(0, footerY, W, 44).fill('#F8FAFC');

            doc.fillColor('#9CA3AF')
                .fontSize(7.5)
                .text('Event Management System', bodyPad, footerY + 10, { width: W / 2 - 14 })
                .text(`${new Date().getFullYear()} — Mọi quyền được bảo lưu`, bodyPad, footerY + 22, { width: W / 2 - 14 });

            doc.fillColor(BRAND_PRIMARY)
                .font('Helvetica-Bold')
                .fontSize(7.5)
                .text('ĐEM THEO VÉ NÀY KHI CHECK-IN', W / 2, footerY + 10, { width: W / 2 - 14, align: 'right' })
                .text('DO NOT SHARE THIS TICKET', W / 2, footerY + 22, { width: W / 2 - 14, align: 'right' });

            doc.end();

            stream.on('finish', () => resolve(pdfPath));
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
};
