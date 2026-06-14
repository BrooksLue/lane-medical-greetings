import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { savePatients, getStoredPatients } from "@/lib/store";

export async function POST(req: NextRequest) {
  let formData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: `Could not read form data: ${e}` }, { status: 400 });
  }

  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file received — make sure you selected a file before clicking Import." }, { status: 400 });
  if (!file.size) return NextResponse.json({ error: "File is empty." }, { status: 400 });

  console.log("Importing file:", file.name, "size:", file.size, "type:", file.type);

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: `Could not read file: ${e}` }, { status: 400 });
  }
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (e) {
    return NextResponse.json({ error: `Could not parse file — is it a valid .xlsx or .csv? Error: ${e}` }, { status: 400 });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return NextResponse.json({ error: "Spreadsheet has no sheets." }, { status: 400 });
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const get = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find(
        (rk) => rk.toLowerCase().replace(/[\s_]/g, "") === k.toLowerCase().replace(/[\s_]/g, "")
      );
      if (found && row[found]) return String(row[found]).trim();
    }
    return "";
  };

  const formatDate = (val: string) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const existing = await getStoredPatients();
  const existingIds = new Set(existing.map((p) => p.phone));

  const imported = rows
    .map((row, i) => ({
      id: String(Date.now() + i),
      name: get(row, "name", "fullname", "patientname"),
      email: get(row, "email", "emailaddress"),
      phone: get(row, "phone", "phonenumber", "mobile", "cell"),
      dateOfBirth: formatDate(get(row, "dateofbirth", "dob", "birthdate", "birthday")),
      procedureDate: formatDate(get(row, "proceduredate", "surgerydate")),
      lastVisit: formatDate(get(row, "lastvisit", "lastappointment")),
      preferredContact: (get(row, "preferredcontact", "contact", "contactmethod") || "both") as "sms" | "email" | "both",
      active: true,
    }))
    .filter((p) => p.name && (p.email || p.phone));

  // Merge: skip duplicates by phone number
  const newPatients = imported.filter((p) => !existingIds.has(p.phone));
  const merged = [...existing, ...newPatients];

  await savePatients(merged);

  return NextResponse.json({
    imported: newPatients.length,
    skipped: imported.length - newPatients.length,
    total: merged.length,
  });
}
