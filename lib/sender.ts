import { Patient } from "./patients";
import { GreetingEvent, GreetingLog, buildMessage } from "./greetings";

export async function sendGreeting(
  patient: Patient,
  event: GreetingEvent,
  channel: "sms" | "email"
): Promise<GreetingLog> {
  const { subject, body } = buildMessage(event, channel);
  const logBase = {
    id: `${Date.now()}-${patient.id}-${channel}`,
    patientId: patient.id,
    patientName: patient.name,
    type: event.type,
    channel,
    sentAt: new Date().toISOString(),
    message: body,
  };

  try {
    if (channel === "sms") {
      const twilio = (await import("twilio")).default;
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: patient.phone,
      });
    } else {
      if (!process.env.SENDGRID_API_KEY) {
        return { ...logBase, status: "failed", error: "Email not configured — SendGrid API key not set." };
      }
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        to: patient.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL ?? "",
          name: process.env.SENDGRID_FROM_NAME ?? "Lane Medical Center",
        },
        subject: subject ?? "A message from Lane Medical Center",
        html: body,
      });
    }

    return { ...logBase, status: "sent" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to send ${channel} to ${patient.name}:`, message);
    return { ...logBase, status: "failed", error: message };
  }
}
