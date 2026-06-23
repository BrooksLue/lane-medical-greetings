import { NextResponse } from "next/server";
import { patients as seedPatients } from "@/lib/patients";
import { getStoredPatients } from "@/lib/store";
import { getTodaysEvents, getUpcomingEvents } from "@/lib/greetings";

export async function GET() {
  const stored = await getStoredPatients();
  const patients = stored.length > 0 ? stored : seedPatients;

  const events = getTodaysEvents(patients);
  const upcoming = getUpcomingEvents(patients, 30);
  const todayIds = new Set(events.map((e) => e.patientId));

  const enriched = patients.map((p) => ({
    ...p,
    todaysEvents: events.filter((e) => e.patientId === p.id),
    hasEventToday: todayIds.has(p.id),
  }));

  return NextResponse.json({ patients: enriched, todaysEvents: events, upcomingEvents: upcoming });
}
