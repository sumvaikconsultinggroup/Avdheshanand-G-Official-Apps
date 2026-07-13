type WhatsAppResult = {
  success: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
  data?: unknown;
};

type TemplatePayload = {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyValues?: string[];
  headerValues?: string[];
  buttonValues?: Record<string, string[]>;
  fileName?: string;
  callbackData?: string;
};

function getNormalizedPhone(to: string) {
  let digits = String(to || '').replace(/\D/g, '');
  if (!digits) return null;
  // International "00" dialling prefix → drop it (e.g. 00919810445508).
  if (digits.startsWith('00')) digits = digits.slice(2);
  // National trunk "0" before a 10-digit mobile → drop it (0 9810445508).
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  // Already country-coded: 91XXXXXXXXXX (12 digits).
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  // 91 + an 11-digit body where the extra is a leading trunk 0 → 9109810445508.
  if (digits.length === 13 && digits.startsWith('910')) return `91${digits.slice(3)}`;
  // Bare 10-digit mobile → add India's country code.
  if (digits.length === 10) return `91${digits}`;
  // Anything else (e.g. an 11-digit number with an extra/typo'd digit) is
  // malformed — return null so the caller reports a clear "invalid phone".
  return null;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<WhatsAppResult> {
  const apiUrl =
    process.env.WHATSAPP_API_URL ||
    'https://api.whatsappbiz.com/v1/public/message/';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const normalizedPhone = getNormalizedPhone(to);

  if (!normalizedPhone) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }
  if (!apiUrl || !message) {
    return { success: false, skipped: true, error: 'WhatsApp provider is not configured' };
  }

  try {
    const isVaibiStyleApi = Boolean(apiKey) || apiUrl.includes('whatsappbiz.com');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let body: Record<string, unknown>;

    if (isVaibiStyleApi) {
      headers.Authorization = `Basic ${apiKey || accessToken || ''}`;
      body = {
        fullPhoneNumber: normalizedPhone,
        callbackData: 'agm_platform_notification',
        type: 'Text',
        data: {
          message,
        },
      };
    } else {
      if (!accessToken) {
        return { success: false, skipped: true, error: 'WhatsApp provider token is missing' };
      }
      headers.Authorization = `Bearer ${accessToken}`;
      body = {
        to: normalizedPhone,
        message,
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: responseText,
      };
    }

    let parsed: unknown = responseText;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {}

    return { success: true, status: response.status, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
    };
  }
}

/**
 * Send an image (by URL) with an optional caption. Used for broadcasts that
 * attach a picture / logo. NOTE: the media payload below targets the whatsappbiz
 * ("Basic" auth) provider — if you switch providers, adjust the `data` fields.
 */
export async function sendWhatsAppImageMessage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<WhatsAppResult> {
  const apiUrl =
    process.env.WHATSAPP_API_URL || 'https://api.whatsappbiz.com/v1/public/message/';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const normalizedPhone = getNormalizedPhone(to);

  if (!normalizedPhone) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }
  if (!apiUrl || !imageUrl) {
    return { success: false, skipped: true, error: 'WhatsApp image provider is not configured' };
  }

  try {
    const isVaibiStyleApi = Boolean(apiKey) || apiUrl.includes('whatsappbiz.com');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: Record<string, unknown>;

    if (isVaibiStyleApi) {
      headers.Authorization = `Basic ${apiKey || accessToken || ''}`;
      body = {
        fullPhoneNumber: normalizedPhone,
        callbackData: 'agm_platform_media',
        type: 'Media',
        data: {
          mediaType: 'image',
          url: imageUrl,
          ...(caption ? { caption } : {}),
        },
      };
    } else {
      if (!accessToken) {
        return { success: false, skipped: true, error: 'WhatsApp provider token is missing' };
      }
      headers.Authorization = `Bearer ${accessToken}`;
      body = { to: normalizedPhone, image: imageUrl, caption };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const responseText = await response.text();
    if (!response.ok) {
      return { success: false, status: response.status, error: responseText };
    }
    let parsed: unknown = responseText;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {}
    return { success: true, status: response.status, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown WhatsApp image error',
    };
  }
}

export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = 'en',
  bodyValues = [],
  headerValues = [],
  buttonValues,
  fileName,
  callbackData = 'agm_platform_template',
}: TemplatePayload): Promise<WhatsAppResult> {
  const apiUrl =
    process.env.WHATSAPP_API_URL ||
    'https://api.whatsappbiz.com/v1/public/message/';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const normalizedPhone = getNormalizedPhone(to);

  if (!normalizedPhone) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }
  if (!apiUrl || !templateName) {
    return { success: false, skipped: true, error: 'WhatsApp template provider is not configured' };
  }

  try {
    const isVaibiStyleApi = Boolean(apiKey) || apiUrl.includes('whatsappbiz.com');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isVaibiStyleApi) {
      headers.Authorization = `Basic ${apiKey || accessToken || ''}`;
    } else if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      return { success: false, skipped: true, error: 'WhatsApp provider token is missing' };
    }

    const templateBody: Record<string, unknown> = {
      name: templateName,
      languageCode,
    };

    if (headerValues.length > 0) {
      templateBody.headerValues = headerValues;
    }
    if (fileName) {
      templateBody.fileName = fileName;
    }
    if (bodyValues.length > 0) {
      templateBody.bodyValues = bodyValues;
    }
    if (buttonValues && Object.keys(buttonValues).length > 0) {
      templateBody.buttonValues = buttonValues;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fullPhoneNumber: normalizedPhone,
        callbackData,
        type: 'Template',
        template: templateBody,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: responseText,
      };
    }

    let parsed: unknown = responseText;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {}

    return { success: true, status: response.status, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown WhatsApp template error',
    };
  }
}
