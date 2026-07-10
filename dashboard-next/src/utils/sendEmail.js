import { sendResendEmail } from '@/utils/resendMailer';

/**
 * Backwards-compatible email helper, now backed by Resend (was nodemailer).
 * Keeps the original sendEmail(to, subject, text, html) signature and the
 * { success, messageId } return shape so every existing caller works unchanged.
 * All outgoing email now flows through RESEND_API_KEY (no EMAIL_/SMTP_ vars).
 */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendEmail(to, subject, text, html) {
  const finalHtml =
    html ||
    `<pre style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A0010;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;

  const result = await sendResendEmail({
    to,
    subject,
    html: finalHtml,
    ...(text ? { text } : {}),
  });

  if (!result.success) {
    throw new Error(result.error || 'Email could not be sent (Resend not configured)');
  }

  return { success: true, messageId: result.id };
}
