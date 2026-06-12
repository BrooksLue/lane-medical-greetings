import { NextResponse } from "next/server";
import { patients } from "@/lib/patients";
import { getTodaysEvents } from "@/lib/greetings";

export async function GET() {
  const events = getTodaysEvents(patients);
  const todayIds = new Set(events.map((e) => e.patientId));

  const enriched = patients.map((p) => ({
    ...p,
    todaysEvents: events.filter((e) => e.patientId === p.id),
    hasEventToday: todayIds.has(p.id),
  }));

  return NextResponse.json({ patients: enriched, todaysEvents: events });
}
