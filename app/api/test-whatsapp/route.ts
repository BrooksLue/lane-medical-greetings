import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { phone } = await req.json().catch(() => ({ phone: "" }));
  if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json({ error: "WhatsApp not configured — check WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN" }, { status: 500 });
  }

  const to = phone.replace(/\s/g, "");
  const body = "Test message from Lane Medical Greetings app. WhatsApp is working correctly!";

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: json?.error?.message ?? `WhatsApp API error ${res.status}`, details: json }, { status: 500 });
  }

  return NextResponse.json({ ok: true, to, messageId: json?.messages?.[0]?.id });
}
