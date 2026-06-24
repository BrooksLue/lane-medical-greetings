import { Patient } from "./patients";
import { GreetingEvent, GreetingLog, buildMessage } from "./greetings";

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\s/g, ""),
        type: "text",
        text: { body },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message ?? `WhatsApp API error ${res.status}`);
  }
}

export async function sendGreeting(
  patient: Patient,
  event: GreetingEvent,
  channel: "whatsapp" | "email"
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
    if (channel === "whatsapp") {
      await sendWhatsApp(patient.phone, body);
    } else {
      if (!process.env.SENDGRID_API_KEY) {
        return { ...logBase, status: "failed", error: "Email not configured - SendGrid API key not set." };
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
