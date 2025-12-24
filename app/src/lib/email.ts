/**
 * Email Service
 *
 * Centralized email sending using Resend.
 * Handles consent-related notifications and other system emails.
 */

import { Resend } from "resend";

// Initialize Resend client lazily
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_your_api_key_here") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || "noreply@chkin.co.za";

// Email sending result type
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      console.error(`[Email] Failed to send to ${options.to}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Email] Error sending to ${options.to}:`, message);
    return { success: false, error: message };
  }
}

// ============================================================================
// Consent Expiry Email Templates
// ============================================================================

interface ConsentExpiryEmailData {
  patientName: string;
  patientEmail: string;
  organizationName: string;
  formTitle: string;
  expiresAt: Date;
  daysRemaining: number;
  renewalUrl: string;
  submissionId: string;
}

/**
 * Get the email subject based on urgency
 */
function getExpirySubject(daysRemaining: number, organizationName: string): string {
  if (daysRemaining <= 7) {
    return `Urgent: Your consent with ${organizationName} expires in ${daysRemaining} days`;
  }
  if (daysRemaining <= 14) {
    return `Reminder: Your consent with ${organizationName} expires soon`;
  }
  return `Notice: Your consent with ${organizationName} will expire in ${daysRemaining} days`;
}

/**
 * Generate the consent expiry notification email HTML
 */
function generateExpiryEmailHtml(data: ConsentExpiryEmailData): string {
  const expiryDate = data.expiresAt.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgencyColor = data.daysRemaining <= 7 ? "#dc2626" : data.daysRemaining <= 14 ? "#f59e0b" : "#0d9488";
  const urgencyBgColor = data.daysRemaining <= 7 ? "#fef2f2" : data.daysRemaining <= 14 ? "#fffbeb" : "#f0fdfa";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Consent Expiry Notice</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">
                    Consent Expiry Notice
                  </h1>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    From ${data.organizationName}
                  </p>
                </td>
              </tr>

              <!-- Urgency Banner -->
              <tr>
                <td style="padding: 16px 32px; background-color: ${urgencyBgColor}; border-left: 4px solid ${urgencyColor};">
                  <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${urgencyColor};">
                    ${data.daysRemaining <= 7 ? "⚠️ Urgent Action Required" : data.daysRemaining <= 14 ? "📅 Action Needed Soon" : "ℹ️ Upcoming Expiry"}
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #374151;">
                    Your consent expires in <strong>${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}</strong> on ${expiryDate}
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
                    Hello ${data.patientName || "there"},
                  </p>
                  <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Your consent for <strong>${data.formTitle}</strong> at <strong>${data.organizationName}</strong>
                    is approaching its expiration date.
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    To continue receiving services and ensure uninterrupted care, please renew your consent
                    before it expires.
                  </p>

                  <!-- CTA Button -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td align="center">
                        <a href="${data.renewalUrl}"
                           style="display: inline-block; padding: 16px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                          Renew My Consent
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                    Or copy this link: ${data.renewalUrl}
                  </p>
                </td>
              </tr>

              <!-- What Happens Section -->
              <tr>
                <td style="padding: 24px 32px; background-color: #f9fafb;">
                  <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">
                    What happens if I don't renew?
                  </h3>
                  <ul style="margin: 0; padding: 0 0 0 20px; font-size: 13px; color: #6b7280; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">Your consent will expire and your provider may no longer have access to your submitted information</li>
                    <li style="margin-bottom: 8px;">A 30-day grace period allows time to renew without losing access</li>
                    <li>You can withdraw consent at any time from your patient portal</li>
                  </ul>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #ffffff; border-radius: 0 0 16px 16px; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                    This email was sent by Chkin on behalf of ${data.organizationName}
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    If you have questions, please contact your healthcare provider directly.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send a consent expiry warning email
 */
export async function sendConsentExpiryEmail(data: ConsentExpiryEmailData): Promise<EmailResult> {
  const subject = getExpirySubject(data.daysRemaining, data.organizationName);
  const html = generateExpiryEmailHtml(data);

  return sendEmail({
    to: data.patientEmail,
    subject,
    html,
  });
}

// ============================================================================
// Consent Renewed Confirmation Email
// ============================================================================

interface ConsentRenewedEmailData {
  patientName: string;
  patientEmail: string;
  organizationName: string;
  formTitle: string;
  newExpiresAt: Date;
  durationMonths: number;
}

/**
 * Send a consent renewal confirmation email
 */
export async function sendConsentRenewedEmail(data: ConsentRenewedEmailData): Promise<EmailResult> {
  const expiryDate = data.newExpiresAt.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Consent Renewed</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff; border-radius: 16px 16px 0 0; text-align: center;">
                  <div style="display: inline-block; padding: 12px; background-color: #d1fae5; border-radius: 50%; margin-bottom: 16px;">
                    <span style="font-size: 32px;">✓</span>
                  </div>
                  <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">
                    Consent Renewed Successfully
                  </h1>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    ${data.organizationName}
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
                    Hello ${data.patientName || "there"},
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Your consent for <strong>${data.formTitle}</strong> has been renewed for
                    <strong>${data.durationMonths} month${data.durationMonths !== 1 ? "s" : ""}</strong>.
                  </p>

                  <!-- New Expiry Box -->
                  <div style="padding: 16px; background-color: #f0fdfa; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                      New Expiry Date
                    </p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0d9488;">
                      ${expiryDate}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #ffffff; border-radius: 0 0 16px 16px; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                    This email was sent by Chkin on behalf of ${data.organizationName}
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    You can manage your consents at any time from your patient portal.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Consent Renewed: ${data.formTitle} at ${data.organizationName}`,
    html,
  });
}

// ============================================================================
// Consent Withdrawn Confirmation Email
// ============================================================================

interface ConsentWithdrawnEmailData {
  patientName: string;
  patientEmail: string;
  organizationName: string;
  formTitle: string;
  withdrawnAt: Date;
}

/**
 * Send a consent withdrawal confirmation email
 */
export async function sendConsentWithdrawnEmail(data: ConsentWithdrawnEmailData): Promise<EmailResult> {
  const withdrawnDate = data.withdrawnAt.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Consent Withdrawn</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">
                    Consent Withdrawn
                  </h1>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    ${data.organizationName}
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
                    Hello ${data.patientName || "there"},
                  </p>
                  <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    This email confirms that your consent for <strong>${data.formTitle}</strong> at
                    <strong>${data.organizationName}</strong> has been withdrawn as of ${withdrawnDate}.
                  </p>

                  <div style="padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b;">
                      The provider will no longer have access to your submitted information.
                    </p>
                  </div>

                  <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    If you withdrew consent by mistake or wish to re-consent, please contact
                    ${data.organizationName} directly or submit a new check-in form.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #ffffff; border-radius: 0 0 16px 16px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    This email was sent by Chkin on behalf of ${data.organizationName}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.patientEmail,
    subject: `Consent Withdrawn: ${data.formTitle} at ${data.organizationName}`,
    html,
  });
}
