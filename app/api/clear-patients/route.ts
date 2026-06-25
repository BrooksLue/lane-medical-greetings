import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function POST() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.json({ error: "Upstash not configured" }, { status: 500 });
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  await redis.del("patients");
  return NextResponse.json({ ok: true, message: "Stored patients cleared. App will now use seed data." });
}