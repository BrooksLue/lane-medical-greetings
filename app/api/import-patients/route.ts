import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const patients = rows.map((row, i) => {
    // Normalize column headers — handle common variations
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find((rk) => rk.toLowerCase().replace(/[\s_]/g, "") === k.toLowerCase().replace(/[\s_]/g, ""));
        if (found && row[found]) return String(row[found]).trim();
      }
      return "";
    };

    const formatDate = (val: string) => {
      if (!val) return "";
      // Handle Excel serial dates and string dates
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    };

    return {
      id: String(i + 1),
      name: get("name", "fullname", "patientname"),
      email: get("email", "emailaddress"),
      phone: get("phone", "phonenumber", "mobile", "cell"),
      dateOfBirth: formatDate(get("dateofbirth", "dob", "birthdate", "birthday")),
      procedureDate: formatDate(get("proceduredate", "surgerydate", "proceduredate")),
      lastVisit: formatDate(get("lastvisit", "lastappointment", "lastvisitdate")),
      preferredContact: (get("preferredcontact", "contact", "contactmethod") || "both") as "sms" | "email" | "both",
      active: true,
    };
  }).filter((p) => p.name && (p.email || p.phone));

  return NextResponse.json({ imported: patients.length, patients });
}
