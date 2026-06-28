import { NextResponse } from "next/server";
import { savePatients } from "@/lib/store";

export async function POST() {
  const result = await savePatients([]);
  return NextResponse.json({ ok: result.ok, message: "Patient list cleared. Seed data will be used." });
}
