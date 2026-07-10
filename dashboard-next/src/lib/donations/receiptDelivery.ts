import { sendResendEmail } from '@/utils/resendMailer';
import { sendWhatsAppMessage, sendWhatsAppTemplateMessage } from '@/lib/whatsapp';

type ReceiptSource = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  amount?: number;
  paymentId?: string;
  orderId?: string;
  donatedAt?: Date | string;
  panNumber?: string;
  receiptNumber?: string;
  receiptAccessToken?: string;
};

type DeliveryOptions = {
  donation: ReceiptSource;
  campaignTitle?: string;
  requestOrigin?: string;
  documentUrlOverride?: string | null;
  languageCode?: string;
  callbackData?: string;
};

function isPublicHttpsUrl(value: string | undefined | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getPublicReceiptUrl(requestOrigin?: string, receiptAccessToken?: string) {
  if (!receiptAccessToken) return null;

  const configuredBaseUrl =
    process.env.PUBLIC_APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_BASE_URL;

  const origin = configuredBaseUrl || requestOrigin;
  if (!isPublicHttpsUrl(origin)) {
    return null;
  }

  return `${String(origin).replace(/\/+$/, '')}/api/donation-receipt/${receiptAccessToken}`;
}

export function buildDonationReceiptEmail({
  name,
  amount,
  donatedAt,
  receiptNumber,
  campaignTitle,
  panNumber,
}: {
  name?: string;
  amount?: number;
  donatedAt?: Date | string;
  receiptNumber?: string;
  campaignTitle?: string;
  panNumber?: string;
}) {
  const formattedAmount = `Rs. ${Number(amount || 0).toFixed(2)}`;
  const formattedDate = new Date(donatedAt || new Date()).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = 'Donation Receipt - AvdheshanandG Mission';
  const text = `Hari Om.

This is to acknowledge with thanks the donation of ${formattedAmount} received from ${name || 'the donor'} towards ${campaignTitle || 'General Donation'}.

Your donation receipt dated ${formattedDate} is attached herewith.

Receipt number is ${receiptNumber || 'Receipt Pending'} and PAN provided is ${panNumber || 'Not provided'}.

With regards,
AvdheshanandG Mission Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #7b1e1e;">Donation Receipt</h1>
      <p>Hari Om.</p>
      <p>This is to acknowledge with thanks the donation of <strong>${formattedAmount}</strong> received from <strong>${name || 'the donor'}</strong> towards <strong>${campaignTitle || 'General Donation'}</strong>.</p>
      <div style="background: #fff6ea; border: 1px solid #f0d2a4; border-radius: 16px; padding: 18px; margin-top: 16px;">
        <p><strong>Receipt Number:</strong> ${receiptNumber || 'Receipt Pending'}</p>
        <p><strong>Donation Date:</strong> ${formattedDate}</p>
        <p><strong>PAN:</strong> ${panNumber || 'Not provided'}</p>
      </div>
      <p style="margin-top: 16px; color: #555;">With regards,<br/>AvdheshanandG Mission Team</p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendDonationReceiptEmail({
  to,
  subject,
  text,
  html,
}: {
  to?: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!to) {
    return { success: false, skipped: true, error: 'Recipient email is missing' };
  }

  const result = await sendResendEmail({ to, subject, html, text });
  if (!result.success) {
    return { success: false, skipped: result.skipped, error: result.error || 'Email could not be sent' };
  }

  return {
    success: true,
    messageId: result.id,
  };
}

export function buildDonationReceiptTemplatePayload({
  donation,
  campaignTitle,
  requestOrigin,
  documentUrlOverride,
  languageCode = 'en',
  callbackData = 'donation_80g_receipt',
}: DeliveryOptions) {
  const templateName =
    process.env.WHATSAPP_DONATION_RECEIPT_TEMPLATE || 'donation_80g_receipt_v1';
  const documentUrl =
    (isPublicHttpsUrl(documentUrlOverride) && documentUrlOverride) ||
    (isPublicHttpsUrl(process.env.SAMPLE_DONATION_RECEIPT_URL)
      ? process.env.SAMPLE_DONATION_RECEIPT_URL
      : null) ||
    getPublicReceiptUrl(requestOrigin, donation.receiptAccessToken);

  if (!documentUrl) {
    return {
      success: false as const,
      error:
        'A public HTTPS document URL is required. Configure PUBLIC_APP_BASE_URL, SAMPLE_DONATION_RECEIPT_URL, or pass a document override.',
    };
  }

  return {
    success: true as const,
    payload: {
      to: donation.phone || '',
      templateName,
      languageCode,
      callbackData,
      headerValues: [documentUrl],
      fileName: `Donation-Receipt-${donation.receiptNumber || 'receipt'}.pdf`,
      bodyValues: [
        donation.name || 'Donor',
        Number(donation.amount || 0).toFixed(2),
        campaignTitle || 'General Donation',
        donation.paymentId || donation.orderId || 'pay_TEST123',
        new Date(donation.donatedAt || new Date()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        donation.receiptNumber || 'Receipt Pending',
        donation.panNumber || 'Not provided',
      ],
    },
  };
}

export async function deliverDonationReceipt(options: DeliveryOptions) {
  const { donation, campaignTitle } = options;

  const emailPayload = buildDonationReceiptEmail({
    name: donation.name,
    amount: donation.amount,
    donatedAt: donation.donatedAt,
    receiptNumber: donation.receiptNumber,
    campaignTitle,
    panNumber: donation.panNumber,
  });

  const emailResult = await sendDonationReceiptEmail({
    to: donation.email,
    ...emailPayload,
  }).catch((error) => ({
    success: false,
    error: error instanceof Error ? error.message : 'Unknown email error',
  }));

  const templatePayload = buildDonationReceiptTemplatePayload(options);
  let whatsappResult:
    | Awaited<ReturnType<typeof sendWhatsAppTemplateMessage>>
    | Awaited<ReturnType<typeof sendWhatsAppMessage>>
    | { success: false; skipped?: boolean; error?: string } = {
    success: false,
    skipped: true,
    error: 'Recipient phone is missing',
  };

  if (donation.phone) {
    if (templatePayload.success) {
      whatsappResult = await sendWhatsAppTemplateMessage(templatePayload.payload);
      if (!whatsappResult.success) {
        whatsappResult = await sendWhatsAppMessage(
          donation.phone,
          `Hari Om. This is to acknowledge with thanks the donation of Rs. ${Number(donation.amount || 0).toFixed(2)} received from ${donation.name || 'the donor'} towards ${campaignTitle || 'General Donation'}. Receipt number is ${donation.receiptNumber || 'Receipt Pending'}. With regards, AvdheshanandG Mission Team.`
        );
      }
    } else {
      whatsappResult = {
        success: false,
        skipped: true,
        error: templatePayload.error,
      };
    }
  }

  return {
    emailPayload,
    emailResult,
    templatePayload,
    whatsappResult,
  };
}
