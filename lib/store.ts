import { Patient } from "./patients";
import fs from "fs";
import path from "path";

const LOCAL_FILE = path.join(process.cwd(), "data", "patients.json");
const isVercel = !!process.env.VERCEL;
const hasKV = !!process.env.KV_REST_API_URL;

export async function getStoredPatients(): Promise<Patient[]> {
  try {
    if (isVercel && hasKV) {
      const { kv } = await import("@vercel/kv");
      const stored = await kv.get<Patient[]>("patients");
      return stored ?? [];
    } else if (!isVercel) {
      if (!fs.existsSync(LOCAL_FILE)) return [];
      const raw = fs.readFileSync(LOCAL_FILE, "utf-8");
      return JSON.parse(raw) as Patient[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function savePatients(patients: Patient[]): Promise<{ ok: boolean; message?: string }> {
  try {
    if (isVercel && hasKV) {
      const { kv } = await import("@vercel/kv");
      await kv.set("patients", patients);
      return { ok: true };
    } else if (isVercel && !hasKV) {
      return {
        ok: false,
        message: "Storage not connected. Add a Vercel KV database in your project dashboard to save patients permanently.",
      };
    } else {
      fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(patients, null, 2), "utf-8");
      return { ok: true };
    }
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
