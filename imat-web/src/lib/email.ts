// Application emails for IMAT, sent via the Resend REST API.
// Supabase email is NOT used for these flows — no Supabase Auth email
// templates, no magic links. Only RESEND_API_KEY / EMAIL_FROM are needed.

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "noreply@imat.codeflowx.dev";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = { ok: boolean; error?: string };

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `<div style="font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 560px; margin: 0 auto;">
  <h2 style="color: #0f5132;">${title}</h2>
  ${bodyHtml}
  <p style="color: #666; font-size: 13px; margin-top: 24px;">IMAT — Infrastructure Maintenance Awareness Team, FUTA</p>
</div>`;
}

/**
 * Send a single email through Resend. Returns { ok: false } instead of
 * throwing when the API key is missing or the request fails, so callers can
 * surface the failure without crashing the request.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Resend request failed (${res.status})${detail ? `: ${detail}` : ""}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email send error" };
  }
}

export function applicationReceivedEmail(name: string): EmailTemplate {
  const subject = "IMAT application received";
  const html = wrapEmail(
    "Application received",
    `<p>Hi ${escapeHtml(name)},</p>
<p>Thank you for applying to join IMAT (Infrastructure Maintenance Awareness Team), FUTA.</p>
<p>We have received your application and it is now under review. We will contact you at this email address once a decision has been made.</p>
<p>Best regards,<br />IMAT Team</p>`
  );
  const text = `Hi ${name},\n\nThank you for applying to join IMAT (Infrastructure Maintenance Awareness Team), FUTA.\n\nWe have received your application and it is now under review. We will contact you at this email address once a decision has been made.\n\nBest regards,\nIMAT Team`;
  return { subject, html, text };
}

export function acceptanceEmail(name: string, inviteLink: string): EmailTemplate {
  const subject = "Welcome to IMAT — your application was accepted";
  const html = wrapEmail(
    "Welcome to IMAT",
    `<p>Hi ${escapeHtml(name)},</p>
<p>Good news — your application to join IMAT (Infrastructure Maintenance Awareness Team), FUTA, has been accepted.</p>
<p>To finish setting up your account, set your password using the link below:</p>
<p><a href="${escapeHtml(inviteLink)}">${escapeHtml(inviteLink)}</a></p>
<p>If the link does not work, copy and paste it into your browser.</p>
<p>We look forward to working with you.</p>
<p>Best regards,<br />IMAT Team</p>`
  );
  const text = `Hi ${name},\n\nGood news — your application to join IMAT (Infrastructure Maintenance Awareness Team), FUTA, has been accepted.\n\nTo finish setting up your account, set your password using this link:\n${inviteLink}\n\nWe look forward to working with you.\n\nBest regards,\nIMAT Team`;
  return { subject, html, text };
}

export function rejectionEmail(name: string, notes?: string): EmailTemplate {
  const subject = "Update on your IMAT application";
  const notesHtml = notes ? `<p>Reviewer notes: ${escapeHtml(notes)}</p>` : "";
  const notesText = notes ? `\nReviewer notes: ${notes}\n` : "";
  const html = wrapEmail(
    "Update on your application",
    `<p>Hi ${escapeHtml(name)},</p>
<p>Thank you for applying to join IMAT (Infrastructure Maintenance Awareness Team), FUTA.</p>
<p>After careful review, we are unable to offer you a place in this intake cycle. We appreciate the time and effort you put into your application and encourage you to apply again in a future cycle.</p>${notesHtml}
<p>Best regards,<br />IMAT Team</p>`
  );
  const text = `Hi ${name},\n\nThank you for applying to join IMAT (Infrastructure Maintenance Awareness Team), FUTA.\n\nAfter careful review, we are unable to offer you a place in this intake cycle. We appreciate the time and effort you put into your application and encourage you to apply again in a future cycle.${notesText}\nBest regards,\nIMAT Team`;
  return { subject, html, text };
}
