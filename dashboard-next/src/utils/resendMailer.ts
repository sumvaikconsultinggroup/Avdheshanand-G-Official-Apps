import { Resend } from 'resend';

/**
 * Thin wrapper around the Resend SDK.
 *
 * Configuration (see .env.local):
 *   RESEND_API_KEY        – required. Resend API key (https://resend.com/api-keys)
 *   RESEND_FROM           – verified sender, e.g. "Swami Avdheshanand G <office@avdheshanandg.org>"
 *   CONTACT_NOTIFY_EMAIL  – optional. Inbox that receives a copy of every contact submission.
 *
 * If RESEND_API_KEY is not set we log and no-op rather than throwing, so a
 * missing email config can never block a form submission from being stored.
 */

const BRAND = {
  maroon: '#800020',
  brand: '#9D1F1C',
  gold: '#D4A017',
  goldDark: '#B8860B',
  parchment: '#FFF8E7',
  warmWhite: '#FFFDF5',
  ink: '#4A0010',
  muted: '#8B7E74',
};

const MISSION_NAME = 'Swami Avdheshanand G';
const MISSION_ADDRESS = 'Harihar Ashram, Kankhal, Haridwar, Uttarakhand, India';
const MISSION_PHONE = '+91 94101 60022';
const MISSION_EMAIL = 'office@avdheshanandg.org';

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

function getFromAddress(): string {
  return (
    process.env.RESEND_FROM ||
    `${MISSION_NAME} <onboarding@resend.dev>`
  );
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type SendResult = {
  success: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
};

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const client = getClient();
  if (!client) {
    console.warn('[resendMailer] RESEND_API_KEY not set — skipping email to', params.to);
    return { success: false, skipped: true };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (error) {
      console.error('[resendMailer] Resend returned an error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[resendMailer] Failed to send email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Shared shell so every mission email has a consistent, branded look. */
function emailShell(innerHtml: string): string {
  return `
  <div style="margin:0;padding:0;background:${BRAND.parchment};">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
      <!-- Header -->
      <div style="text-align:center;padding:28px 20px;background:linear-gradient(135deg,${BRAND.brand},${BRAND.maroon});border-radius:20px 20px 0 0;">
        <div style="font-size:40px;line-height:1;color:${BRAND.gold};margin-bottom:8px;">&#x950;</div>
        <div style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;">${MISSION_NAME}</div>
        <div style="font-size:12px;color:#FCE9C8;margin-top:4px;font-style:italic;">Hari Om Tat Sat</div>
      </div>
      <!-- Body card -->
      <div style="background:${BRAND.warmWhite};border:1px solid #F0D6A2;border-top:none;border-radius:0 0 20px 20px;padding:28px 24px;">
        ${innerHtml}
      </div>
      <!-- Footer -->
      <div style="text-align:center;padding:20px 12px;color:${BRAND.muted};font-size:12px;line-height:1.7;">
        <div style="color:${BRAND.gold};font-size:16px;margin-bottom:6px;">&#x950; &#x938;&#x930;&#x94D;&#x935;&#x947; &#x92D;&#x935;&#x928;&#x94D;&#x924;&#x941; &#x938;&#x941;&#x916;&#x93F;&#x928;&#x903;</div>
        <div>${MISSION_ADDRESS}</div>
        <div>${MISSION_PHONE} &nbsp;&bull;&nbsp; ${MISSION_EMAIL}</div>
      </div>
    </div>
  </div>`;
}

/** Branded confirmation email sent to the person who submitted the contact form. */
export function buildContactConfirmationEmail(input: {
  fullName: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.fullName);
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replace(/\n/g, '<br/>');

  const inner = `
    <p style="font-size:16px;margin:0 0 14px;">Dear <strong style="color:${BRAND.maroon};">${name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#5A4A3F;">
      Thank you for reaching out to ${MISSION_NAME}. Your message has been received with care,
      and a member of the Ashram office will respond to you shortly.
    </p>
    <div style="background:${BRAND.parchment};border-left:4px solid ${BRAND.gold};border-radius:10px;padding:16px 18px;margin:20px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.goldDark};font-weight:700;margin-bottom:8px;">Your Message</div>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin:0;font-size:14px;color:#5A4A3F;font-style:italic;">&ldquo;${message}&rdquo;</p>
    </div>
    <p style="font-size:15px;line-height:1.7;margin:0;color:#5A4A3F;">
      With warm regards,<br/>
      <strong style="color:${BRAND.maroon};">The Ashram Office</strong>
    </p>`;

  const text = `Dear ${input.fullName},

Thank you for reaching out to ${MISSION_NAME}. Your message has been received with care, and a member of the Ashram office will respond to you shortly.

Your Message
Subject: ${input.subject}
"${input.message}"

With warm regards,
The Ashram Office

${MISSION_ADDRESS}
${MISSION_PHONE} | ${MISSION_EMAIL}`;

  return {
    subject: "We've received your message — " + MISSION_NAME,
    html: emailShell(inner),
    text,
  };
}

/** Branded confirmation email sent to a Mantra Diksha applicant. */
export function buildDikshaConfirmationEmail(input: {
  fullName: string;
  registrationDate: Date;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.fullName);
  const dateStr = input.registrationDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const inner = `
    <p style="font-size:16px;margin:0 0 14px;">Dear <strong style="color:${BRAND.maroon};">${name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#5A4A3F;">
      Namaste. Your application for <strong>Mantra Diksha</strong> has been received and recorded with care.
      It is now with the Ashram office for review.
    </p>
    <div style="background:${BRAND.parchment};border-left:4px solid ${BRAND.gold};border-radius:10px;padding:16px 18px;margin:20px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.goldDark};font-weight:700;margin-bottom:8px;">Application Received</div>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Name:</strong> ${name}</p>
      <p style="margin:0;font-size:14px;"><strong>Date:</strong> ${dateStr}</p>
    </div>
    <p style="font-size:14px;line-height:1.7;margin:0 0 6px;color:#5A4A3F;"><strong style="color:${BRAND.maroon};">Please note:</strong></p>
    <ul style="margin:0 0 18px;padding-left:20px;color:#5A4A3F;font-size:14px;line-height:1.7;">
      <li>Diksha is offered only in person; registration does not guarantee approval.</li>
      <li>The Ashram office will review your application and contact you with next steps.</li>
      <li>Please keep your phone reachable for any clarifications.</li>
    </ul>
    <p style="font-size:15px;line-height:1.7;margin:0;color:#5A4A3F;">
      With divine blessings,<br/>
      <strong style="color:${BRAND.maroon};">The Ashram Office</strong>
    </p>`;

  const text = `Dear ${input.fullName},

Namaste. Your application for Mantra Diksha has been received and recorded with care. It is now with the Ashram office for review.

Application Received
Name: ${input.fullName}
Date: ${dateStr}

Please note:
- Diksha is offered only in person; registration does not guarantee approval.
- The Ashram office will review your application and contact you with next steps.
- Please keep your phone reachable for any clarifications.

With divine blessings,
The Ashram Office

${MISSION_ADDRESS}
${MISSION_PHONE} | ${MISSION_EMAIL}`;

  return {
    subject: 'Your Mantra Diksha application has been received — ' + MISSION_NAME,
    html: emailShell(inner),
    text,
  };
}

/** Branded confirmation email sent to a volunteer applicant. */
export function buildVolunteerConfirmationEmail(input: {
  fullName: string;
  skills?: string[];
  location?: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.fullName);
  const skills = (input.skills || []).filter(Boolean).map(escapeHtml).join(', ');
  const location = input.location ? escapeHtml(input.location) : '';

  const inner = `
    <p style="font-size:16px;margin:0 0 14px;">Dear <strong style="color:${BRAND.maroon};">${name}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#5A4A3F;">
      Thank you for your generous heart. Your wish to serve with ${MISSION_NAME} has been
      received with gratitude. Seva is the highest form of devotion, and we are blessed to have you.
      The team will review your application and reach out to you about the next steps.
    </p>
    ${(skills || location) ? `
    <div style="background:${BRAND.parchment};border-left:4px solid ${BRAND.gold};border-radius:10px;padding:16px 18px;margin:20px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.goldDark};font-weight:700;margin-bottom:8px;">Your Application</div>
      ${location ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Location:</strong> ${location}</p>` : ''}
      ${skills ? `<p style="margin:0;font-size:14px;"><strong>Skills:</strong> ${skills}</p>` : ''}
    </div>` : ''}
    <p style="font-size:15px;line-height:1.7;margin:0;color:#5A4A3F;">
      With gratitude,<br/>
      <strong style="color:${BRAND.maroon};">The Seva Coordination Team</strong>
    </p>`;

  const text = `Dear ${input.fullName},

Thank you for your generous heart. Your wish to serve with ${MISSION_NAME} has been received with gratitude. The team will review your application and reach out about the next steps.

${location ? `Location: ${input.location}\n` : ''}${skills ? `Skills: ${(input.skills || []).join(', ')}\n` : ''}
With gratitude,
The Seva Coordination Team

${MISSION_ADDRESS}
${MISSION_PHONE} | ${MISSION_EMAIL}`;

  return {
    subject: 'Thank you for offering to serve — ' + MISSION_NAME,
    html: emailShell(inner),
    text,
  };
}

/** Branded reply email sent to a devotee when the admin responds to a prayer request. */
export function buildPrayerResponseEmail(input: {
  fullName: string;
  subject?: string;
  responseText: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.fullName);
  const body = escapeHtml(input.responseText).replace(/\n/g, '<br/>');

  const inner = `
    <p style="font-size:16px;margin:0 0 14px;">Dear <strong style="color:${BRAND.maroon};">${name}</strong>,</p>
    <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.goldDark};font-weight:700;margin:0 0 6px;">Hari Om &#x950;</p>
    <div style="background:${BRAND.parchment};border-left:4px solid ${BRAND.gold};border-radius:10px;padding:16px 18px;margin:12px 0 20px;">
      <p style="margin:0;font-size:15px;line-height:1.8;color:#5A4A3F;">${body}</p>
    </div>
    <p style="font-size:15px;line-height:1.7;margin:0;color:#5A4A3F;">
      With divine blessings,<br/>
      <strong style="color:${BRAND.maroon};">The Ashram Office</strong>
    </p>`;

  const text = `Hari Om ${input.fullName},

${input.responseText}

With divine blessings,
The Ashram Office

${MISSION_ADDRESS}
${MISSION_PHONE} | ${MISSION_EMAIL}`;

  return {
    subject: input.subject
      ? `Re: ${input.subject} — ${MISSION_NAME}`
      : `A message from ${MISSION_NAME}`,
    html: emailShell(inner),
    text,
  };
}

/** Internal notification email sent to the Ashram office for each submission. */
export function buildContactNotificationEmail(input: {
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.fullName);
  const email = escapeHtml(input.email);
  const phone = input.phone ? escapeHtml(input.phone) : '—';
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replace(/\n/g, '<br/>');

  const inner = `
    <p style="font-size:16px;margin:0 0 16px;color:${BRAND.maroon};font-weight:700;">New message from the app</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:${BRAND.muted};width:90px;">Name</td><td style="padding:6px 0;"><strong>${name}</strong></td></tr>
      <tr><td style="padding:6px 0;color:${BRAND.muted};">Email</td><td style="padding:6px 0;"><a href="mailto:${email}" style="color:${BRAND.brand};">${email}</a></td></tr>
      <tr><td style="padding:6px 0;color:${BRAND.muted};">Phone</td><td style="padding:6px 0;">${phone}</td></tr>
      <tr><td style="padding:6px 0;color:${BRAND.muted};">Subject</td><td style="padding:6px 0;">${subject}</td></tr>
    </table>
    <div style="background:${BRAND.parchment};border-left:4px solid ${BRAND.gold};border-radius:10px;padding:16px 18px;margin:18px 0 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${BRAND.goldDark};font-weight:700;margin-bottom:8px;">Message</div>
      <p style="margin:0;font-size:14px;color:#5A4A3F;">${message}</p>
    </div>`;

  const text = `New message from the app

Name: ${input.fullName}
Email: ${input.email}
Phone: ${input.phone || '—'}
Subject: ${input.subject}

Message:
${input.message}`;

  return {
    subject: `New enquiry: ${input.subject} — ${input.fullName}`,
    html: emailShell(inner),
    text,
  };
}
