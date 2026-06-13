import { Patient } from "./patients";
import fs from "fs";
import path from "path";

const LOCAL_FILE = path.join(process.cwd(), "data", "patients.json");
const isVercel = !!process.env.KV_REST_API_URL;

export async function getStoredPatients(): Promise<Patient[]> {
  try {
    if (isVercel) {
      const { kv } = await import("@vercel/kv");
      const stored = await kv.get<Patient[]>("patients");
      return stored ?? [];
    } else {
      const raw = fs.readFileSync(LOCAL_FILE, "utf-8");
      return JSON.parse(raw) as Patient[];
    }
  } catch {
    return [];
  }
}

export async function savePatients(patients: Patient[]): Promise<void> {
  if (isVercel) {
    const { kv } = await import("@vercel/kv");
    await kv.set("patients", patients);
  } else {
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(patients, null, 2), "utf-8");
  }
}
