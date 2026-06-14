import { Patient } from "./patients";
import fs from "fs";
import path from "path";

const LOCAL_FILE = path.join(process.cwd(), "data", "patients.json");
const isVercel = !!process.env.VERCEL;
const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

function getRedis() {
  const { Redis } = require("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function getStoredPatients(): Promise<Patient[]> {
  try {
    if (hasUpstash) {
      const redis = getRedis();
      const stored = await redis.get("patients") as Patient[] | null;
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
    if (hasUpstash) {
      const redis = getRedis();
      await redis.set("patients", JSON.stringify(patients));
      return { ok: true };
    } else if (isVercel) {
      return {
        ok: false,
        message: "Database not connected. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel Environment Variables (free at upstash.com).",
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
