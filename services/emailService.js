import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Sends an email. In development, if SMTP credentials aren't configured,
 * logs the email to the console instead of throwing — so the rest of the
 * flow (password reset, admin replies) can still be exercised locally.
 */
export async function sendEmail({ to, subject, html, text }) {
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;

  if (!hasCredentials) {
    console.warn('[emailService] EMAIL_USER/EMAIL_PASSWORD not set — logging email instead of sending.');
    console.info(`[emailService] To: ${to}\nSubject: ${subject}\n${text || html}`);
    return { simulated: true };
  }

  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || `"SHAINA StudyVault" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  return info;
}

export function passwordResetTemplate({ name, resetUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#e01a9d;">Reset your SHAINA StudyVault password</h2>
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your password. This link expires in 30 minutes.</p>
      <p><a href="${resetUrl}" style="background:linear-gradient(90deg,#ff2fb8,#00d1ff);color:#05060f;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

export function contactReplyTemplate({ name, originalMessage, reply }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#00d1ff;">A reply from SHAINA StudyVault</h2>
      <p>Hi ${name || 'there'},</p>
      <p>${reply.replace(/\n/g, '<br/>')}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
      <p style="color:#888;font-size:12px;">Your original message: "${originalMessage}"</p>
    </div>
  `;
}

export default { sendEmail, passwordResetTemplate, contactReplyTemplate };
