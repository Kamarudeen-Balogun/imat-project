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
  return `<div style="font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 560px; margin: 0 auto; background: #ffffff;">
  <div style="background: #0f5132; color: #ffffff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <div style="font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">IMAT</div>
    <div style="font-size: 13px; opacity: 0.85;">Infrastructure Maintenance Awareness Team &middot; FUTA</div>
  </div>
  <div style="padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #0f5132; margin-top: 0;">${title}</h2>
    ${bodyHtml}
  </div>
  <p style="color: #888; font-size: 12px; text-align: center; margin-top: 16px;">IMAT &mdash; Infrastructure Maintenance Awareness Team, FUTA<br />This email was sent from noreply@imat.codeflowx.dev. Please do not reply to it.</p>
</div>`;
}

function buttonHtml(label: string, url: string): string {
  return `<p style="margin: 24px 0;"><a href="${escapeHtml(url)}" style="display: inline-block; background: #0f5132; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 6px;">${label}</a></p>`;
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

export function passwordResetEmail(name: string, resetLink: string): EmailTemplate {
  const subject = "Reset your IMAT password";
  const html = wrapEmail(
    "Reset your password",
    `<p>Hi ${escapeHtml(name)},</p>
<p>We received a request to reset the password for your IMAT account. Use the button below to choose a new password:</p>
${buttonHtml("Reset your password", resetLink)}
<p style="color: #666; font-size: 13px;">If the button does not work, copy and paste this link into your browser:<br /><a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p>
<p>If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
<p>Best regards,<br />IMAT Team</p>`
  );
  const text = `Hi ${name},\n\nWe received a request to reset the password for your IMAT account. Use this link to choose a new password:\n${resetLink}\n\nIf you did not request a password reset, you can safely ignore this email — your password will not change.\n\nBest regards,\nIMAT Team`;
  return { subject, html, text };
}

export function announcementEmail(opts: {
  authorName: string;
  title: string;
  excerpt: string;
  url: string;
}): EmailTemplate {
  const subject = `IMAT News: ${opts.title}`;
  const html = wrapEmail(
    opts.title,
    `<p style="color: #666; font-size: 13px;">Published by ${escapeHtml(opts.authorName)} &middot; IMAT Newsroom</p>
<p>${escapeHtml(opts.excerpt)}</p>
${buttonHtml("Read the full post", opts.url)}
<p style="color: #666; font-size: 13px;">If the button does not work, copy and paste this link into your browser:<br /><a href="${escapeHtml(opts.url)}">${escapeHtml(opts.url)}</a></p>`
  );
  const text = `${opts.title}\nPublished by ${opts.authorName} · IMAT Newsroom\n\n${opts.excerpt}\n\nRead the full post: ${opts.url}`;
  return { subject, html, text };
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
<p>To finish setting up your account, set your password using the button below:</p>
${buttonHtml("Set your password", inviteLink)}
<p style="color: #666; font-size: 13px;">If the button does not work, copy and paste this link into your browser:<br /><a href="${escapeHtml(inviteLink)}">${escapeHtml(inviteLink)}</a></p>
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
