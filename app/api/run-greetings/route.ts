import { NextRequest, NextResponse } from "next/server";
import { patients as seedPatients } from "@/lib/patients";
import { getStoredPatients } from "@/lib/store";
import { getTodaysEvents } from "@/lib/greetings";
import { sendGreeting } from "@/lib/sender";

export async function POST(req: NextRequest) {
  const { force } = await req.json().catch(() => ({ force: false }));

  const scheduledTime = process.env.SEND_TIME ?? "08:00";
  const [scheduledHour, scheduledMin] = scheduledTime.split(":").map(Number);
  const now = new Date();

  const isCronCall = req.headers.get("x-vercel-cron") === "1";
  const isOnTime =
    now.getUTCHours() === scheduledHour &&
    now.getUTCMinutes() >= scheduledMin &&
    now.getUTCMinutes() < scheduledMin + 5;

  if (isCronCall && !isOnTime && !force) {
    return NextResponse.json({ skipped: true, reason: "Not scheduled time yet" });
  }

  const stored = await getStoredPatients();
  const patients = stored.length > 0 ? stored : seedPatients;

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
