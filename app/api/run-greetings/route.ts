import { NextResponse } from "next/server";
import { patients } from "@/lib/patients";
import { getTodaysEvents } from "@/lib/greetings";
import { sendGreeting } from "@/lib/sender";

export async function POST() {
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

  return NextResponse.json({ sent: logs.length, logs });
}
