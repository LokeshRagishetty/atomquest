import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    logger.warn("email.provider_missing", { to, subject });
    return { success: false, error: "Email provider is not configured." };
  }

  try {
    const data = await resend.emails.send({
      from: "AtomQuest <notifications@atomquest.app>",
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    logger.error("email.send_failed", error, { to, subject });
    return { success: false, error };
  }
}
