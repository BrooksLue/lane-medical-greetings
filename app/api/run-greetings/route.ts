import { NextRequest, NextResponse } from "next/server";
import { patients } from "@/lib/patients";
import { getTodaysEvents } from "@/lib/greetings";
import { sendGreeting } from "@/lib/sender";

export async function POST(req: NextRequest) {
  const { force } = await req.json().catch(() => ({ force: false }));

  // If called by Vercel cron, enforce the scheduled send time
  const scheduledTime = process.env.SEND_TIME ?? "08:00"; // 24hr format, e.g. "08:00"
  const [scheduledHour, scheduledMin] = scheduledTime.split(":").map(Number);
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMin = now.getUTCMinutes();

  const isCronCall = req.headers.get("x-vercel-cron") === "1";
  const isOnTime =
    currentHour === scheduledHour &&
    currentMin >= scheduledMin &&
    currentMin < scheduledMin + 5; // 5-minute window

  if (isCronCall && !isOnTime && !force) {
    return NextResponse.json({ skipped: true, reason: "Not scheduled time yet" });
  }

  const events = getTodaysEvents(patients);
  const logs = [];

  for (const event of events) {
    const patient = patients.find((p) => p.id === event.patientId);
    if (!patient) continue;

    for (const channel of event.channels) {
      const log = await sendGreeting(patient, event, channel);
      logs.push(log);
    }
  }

  return NextResponse.json({ sent: logs.length, logs, scheduledTime });
}
