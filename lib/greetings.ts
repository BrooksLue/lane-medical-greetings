import { format, isToday, parseISO } from "date-fns";
import { Patient } from "./patients";

export type GreetingEvent = {
  patientId: string;
  patientName: string;
  type: "birthday" | "procedure_anniversary" | "wellness_checkin";
  label: string;
  channels: ("sms" | "email")[];
};

export type GreetingLog = {
  id: string;
  patientId: string;
  patientName: string;
  type: GreetingEvent["type"];
  channel: "sms" | "email";
  status: "sent" | "failed" | "pending";
  sentAt: string;
  message: string;
  error?: string;
};

export function getTodaysEvents(patients: Patient[]): GreetingEvent[] {
  const today = new Date();
  const todayMMDD = format(today, "MM-dd");
  const events: GreetingEvent[] = [];

  for (const p of patients) {
    if (!p.active) continue;

    const channels: ("sms" | "email")[] =
      p.preferredContact === "both"
        ? ["sms", "email"]
        : [p.preferredContact];

    // Birthday check
    if (p.dateOfBirth) {
      const dobMMDD = p.dateOfBirth.slice(5); // MM-DD
      if (dobMMDD === todayMMDD) {
        events.push({
          patientId: p.id,
          patientName: p.name,
          type: "birthday",
          label: "Birthday",
          channels,
        });
      }
    }

    // Procedure anniversary check
    if (p.procedureDate) {
      const procMMDD = p.procedureDate.slice(5);
      if (procMMDD === todayMMDD) {
        events.push({
          patientId: p.id,
          patientName: p.name,
          type: "procedure_anniversary",
          label: "Procedure Anniversary",
          channels,
        });
      }
    }

    // 30-day wellness check-in (based on lastVisit)
    if (p.lastVisit) {
      const visit = parseISO(p.lastVisit);
      const daysSince = Math.floor(
        (today.getTime() - visit.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince === 30) {
        events.push({
          patientId: p.id,
          patientName: p.name,
          type: "wellness_checkin",
          label: "30-Day Wellness Check-In",
          channels,
        });
      }
    }
  }

  return events;
}

export function buildMessage(
  event: GreetingEvent,
  channel: "sms" | "email"
): { subject?: string; body: string } {
  const name = event.patientName.split(" ")[0];
  const practice = "Lane Medical Center";

  if (event.type === "birthday") {
    return {
      subject: `Happy Birthday from ${practice}! 🎂`,
      body:
        channel === "sms"
          ? `Hi ${name}! 🎂 Wishing you a wonderful birthday from everyone at ${practice}. You deserve a great day!`
          : `<p>Hi ${name},</p><p>Everyone at <strong>${practice}</strong> wants to wish you a very <strong>Happy Birthday!</strong> 🎂</p><p>We're grateful to have you as our patient. Here's to your health and happiness!</p><p>Warmly,<br/>The ${practice} Team</p>`,
    };
  }

  if (event.type === "procedure_anniversary") {
    return {
      subject: `One Year Stronger — ${practice}`,
      body:
        channel === "sms"
          ? `Hi Eric Williams! It's been one year since your procedure at ${practice}. We're so proud of your recovery. Keep up the great work! 💪`
          : `<p>Hi ${name},</p><p>One year ago, you took an important step toward better health at <strong>${practice}</strong>.</p><p>We're incredibly proud of how far you've come. Your strength and commitment inspire us every day.</p><p>If you ever have questions or need a check-up, we're always here for you.</p><p>Warmly,<br/>The ${practice} Team</p>`,
    };
  }

  // wellness_checkin
  return {
    subject: `Checking In On You — ${practice}`,
    body:
      channel === "sms"
        ? `Hi ${name}, it's been 30 days since your visit at ${practice}. How are you feeling? Reply or call us at (555) 000-1234 if you need anything!`
        : `<p>Hi ${name},</p><p>It's been 30 days since your last visit at <strong>${practice}</strong>, and we just wanted to check in!</p><p>How are you feeling? If you have any concerns or it's time for a follow-up, give us a call at <strong>(555) 000-1234</strong> or reply to this email.</p><p>Your wellbeing is our priority.</p><p>Warmly,<br/>The ${practice} Team</p>`,
  };
}
