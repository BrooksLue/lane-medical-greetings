import { format, parseISO, addDays } from "date-fns";
import { Patient } from "./patients";

export type GreetingEvent = {
  patientId: string;
  patientName: string;
  type: "birthday" | "procedure_anniversary" | "wellness_checkin";
  label: string;
  channels: ("whatsapp" | "email")[];
};

export type GreetingLog = {
  id: string;
  patientId: string;
  patientName: string;
  type: GreetingEvent["type"];
  channel: "whatsapp" | "email";
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

    const channels: ("whatsapp" | "email")[] =
      p.preferredContact === "both"
        ? ["whatsapp", "email"]
        : p.preferredContact === "email"
        ? ["email"]
        : ["whatsapp"];

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

export type UpcomingEvent = {
  patientId: string;
  patientName: string;
  type: GreetingEvent["type"];
  label: string;
  date: string;       // YYYY-MM-DD
  daysAway: number;
  channels: ("whatsapp" | "email")[];
};

export function getUpcomingEvents(patients: Patient[], daysAhead = 30): UpcomingEvent[] {
  const today = new Date();
  const upcoming: UpcomingEvent[] = [];

  for (const p of patients) {
    if (!p.active) continue;
    const channels: ("whatsapp" | "email")[] =
      p.preferredContact === "both" ? ["whatsapp", "email"]
      : p.preferredContact === "email" ? ["email"]
      : ["whatsapp"];

    const checkDate = (dateStr: string, type: GreetingEvent["type"], label: string) => {
      if (!dateStr) return;
      const base = parseISO(dateStr);
      // Find this year's occurrence
      const thisYear = new Date(today.getFullYear(), base.getMonth(), base.getDate());
      const nextYear = new Date(today.getFullYear() + 1, base.getMonth(), base.getDate());
      const target = thisYear >= today ? thisYear : nextYear;
      const daysAway = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysAway >= 0 && daysAway <= daysAhead) {
        upcoming.push({
          patientId: p.id,
          patientName: p.name,
          type,
          label,
          date: format(target, "yyyy-MM-dd"),
          daysAway,
          channels,
        });
      }
    };

    checkDate(p.dateOfBirth, "birthday", "Birthday");
    if (p.procedureDate) checkDate(p.procedureDate, "procedure_anniversary", "Procedure Anniversary");

    // Wellness check-in: 30 days after last visit
    if (p.lastVisit) {
      const checkinDate = addDays(parseISO(p.lastVisit), 30);
      const daysAway = Math.round((checkinDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAway >= 0 && daysAway <= daysAhead) {
        upcoming.push({
          patientId: p.id,
          patientName: p.name,
          type: "wellness_checkin",
          label: "30-Day Wellness Check-In",
          date: format(checkinDate, "yyyy-MM-dd"),
          daysAway,
          channels,
        });
      }
    }
  }

  return upcoming.sort((a, b) => a.daysAway - b.daysAway);
}

export function buildMessage(
  event: GreetingEvent,
  channel: "whatsapp" | "email"
): { subject?: string; body: string } {
  const name = event.patientName.split(" ")[0];
  const practice = "Lane Medical Center";

  if (event.type === "birthday") {
    return {
      subject: `Happy Birthday from ${practice}!`,
      body:
        channel === "whatsapp"
          ? `Hi ${name}! Wishing you a wonderful birthday from everyone at ${practice}. You deserve a great day!`
          : `<p>Hi ${name},</p><p>Everyone at <strong>${practice}</strong> wants to wish you a very <strong>Happy Birthday!</strong></p><p>We're grateful to have you as our patient. Here's to your health and happiness!</p><p>Warmly,<br/>The ${practice} Team</p>`,
    };
  }

  if (event.type === "procedure_anniversary") {
    return {
      subject: `One Year Stronger - ${practice}`,
      body:
        channel === "whatsapp"
          ? `Hi ${name}! It's been one year since your procedure at ${practice}. We're so proud of your recovery. Keep up the great work!`
          : `<p>Hi ${name},</p><p>One year ago, you took an important step toward better health at <strong>${practice}</strong>.</p><p>We're incredibly proud of how far you've come. Your strength and commitment inspire us every day.</p><p>If you ever have questions or need a check-up, we're always here for you.</p><p>Warmly,<br/>The ${practice} Team</p>`,
    };
  }

  // wellness_checkin
  return {
    subject: `Checking In On You - ${practice}`,
    body:
      channel === "whatsapp"
        ? `Hi ${name}, it's been 30 days since your visit at ${practice}. How are you feeling? Call us at (555) 000-1234 if you need anything!`
        : `<p>Hi ${name},</p><p>It's been 30 days since your last visit at <strong>${practice}</strong>, and we just wanted to check in!</p><p>How are you feeling? If you have any concerns or it's time for a follow-up, give us a call at <strong>(555) 000-1234</strong> or reply to this email.</p><p>Your wellbeing is our priority.</p><p>Warmly,<br/>The ${practice} Team</p>`,
  };
}
