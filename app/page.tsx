"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

type EventType = "birthday" | "procedure_anniversary" | "wellness_checkin";

type GreetingEvent = {
  patientId: string;
  patientName: string;
  type: EventType;
  label: string;
  channels: string[];
};

type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  procedureDate?: string;
  lastVisit?: string;
  preferredContact: string;
  active: boolean;
  todaysEvents: GreetingEvent[];
  hasEventToday: boolean;
};

type UpcomingEvent = {
  patientId: string;
  patientName: string;
  type: EventType;
  label: string;
  date: string;
  daysAway: number;
  channels: string[];
};

type Log = {
  id: string;
  patientName: string;
  type: EventType;
  channel: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  message: string;
};

const EVENT_ICONS: Record<EventType, string> = {
  birthday: "🎂",
  procedure_anniversary: "💪",
  wellness_checkin: "💙",
};

const EVENT_COLORS: Record<EventType, string> = {
  birthday: "bg-pink-100 text-pink-700 border-pink-200",
  procedure_anniversary: "bg-blue-100 text-blue-700 border-blue-200",
  wellness_checkin: "bg-green-100 text-green-700 border-green-200",
};

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<GreetingEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "patients" | "logs" | "import">("dashboard");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; saved: boolean; saveMessage: string | null } | null>(null);
  const [importError, setImportError] = useState("");
  const [sendTime, setSendTime] = useState("08:00");
  const [timeSaved, setTimeSaved] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("sendTime");
    if (saved) setSendTime(saved);
    setToday(format(new Date(), "EEEE, MMMM d, yyyy"));
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        setPatients(data.patients);
        setTodaysEvents(data.todaysEvents);
        setUpcomingEvents(data.upcomingEvents ?? []);
        setLoading(false);
      });
  }, []);

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);
    const form = new FormData();
    form.append("file", importFile);
    try {
      const res = await fetch("/api/import-patients", { method: "POST", body: form });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { setImportError(`Server response was not JSON: ${text.slice(0, 300)}`); setImporting(false); return; }
      if (data.error) { setImportError(data.error); } else {
        setImportResult(data);
        // Refresh patient list and upcoming events
        fetch("/api/patients")
          .then((r) => r.json())
          .then((d) => {
            setPatients(d.patients);
            setTodaysEvents(d.todaysEvents);
            setUpcomingEvents(d.upcomingEvents ?? []);
          });
      }
    } catch (e) {
      setImportError(`Network error: ${e}`);
    }
    setImporting(false);
  }

  async function runGreetings() {
    setSending(true);
    const res = await fetch("/api/run-greetings", { method: "POST" });
    const data = await res.json();
    setLogs((prev) => [...data.logs, ...prev]);
    setSending(false);
    setActiveTab("logs");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">L</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lane Medical Center</h1>
              <p className="text-sm text-gray-500">Patient Greetings Dashboard</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{today}</p>
            {todaysEvents.length > 0 && (
              <p className="text-sm font-semibold text-blue-600">
                {todaysEvents.length} greeting{todaysEvents.length !== 1 ? "s" : ""} scheduled today
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
          {(["dashboard", "patients", "logs", "import"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total Patients" value={patients.length} color="blue" />
              <StatCard label="Events Today" value={todaysEvents.length} color="pink" />
              <StatCard label="Greetings Sent" value={logs.filter((l) => l.status === "sent").length} color="green" />
            </div>

            {/* Scheduled Send Time */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">Scheduled Send Time</p>
                  <p className="text-sm text-gray-500 mt-0.5">Greetings auto-send daily at this time (UTC). Manual send below overrides this.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(e) => { setSendTime(e.target.value); setTimeSaved(false); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => { localStorage.setItem("sendTime", sendTime); setTimeSaved(true); setTimeout(() => setTimeSaved(false), 2000); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    {timeSaved ? "✓ Saved" : "Save Time"}
                  </button>
                </div>
              </div>
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm text-blue-700">
                🕐 Next auto-send: <strong>{sendTime} UTC</strong> — to change the server schedule, update <code className="bg-blue-100 px-1 rounded">SEND_TIME</code> in your Vercel environment variables.
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Today&apos;s Greetings</h2>
                <button
                  onClick={runGreetings}
                  disabled={sending || todaysEvents.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? "Sending..." : `Send ${todaysEvents.length} Greeting${todaysEvents.length !== 1 ? "s" : ""}`}
                </button>
              </div>

              {loading ? (
                <div className="px-6 py-12 text-center text-gray-400">Loading...</div>
              ) : todaysEvents.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="text-gray-500 font-medium">No greetings scheduled for today</p>
                  <p className="text-gray-400 text-sm mt-1">Check back tomorrow!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todaysEvents.map((event, i) => (
                    <div key={i} className="px-6 py-4 flex items-center gap-4">
                      <span className="text-2xl">{EVENT_ICONS[event.type]}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.patientName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${EVENT_COLORS[event.type]}`}>
                            {event.label}
                          </span>
                          {event.channels.map((ch) => (
                            <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              {ch === "sms" ? "📱 SMS" : "✉️ Email"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Upcoming Greetings — Next 30 Days</h2>
                <span className="text-sm text-gray-400">{upcomingEvents.length} scheduled</span>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400">No upcoming events in the next 30 days.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcomingEvents.map((event, i) => (
                    <div key={i} className="px-6 py-3 flex items-center gap-4">
                      <span className="text-xl">{EVENT_ICONS[event.type]}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{event.patientName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${EVENT_COLORS[event.type]}`}>
                            {event.label}
                          </span>
                          {event.channels.map((ch) => (
                            <span key={ch} className="text-xs text-gray-400">
                              {ch === "sms" ? "📱" : "✉️"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">
                          {event.daysAway === 0 ? "Today" : event.daysAway === 1 ? "Tomorrow" : `In ${event.daysAway} days`}
                        </p>
                        <p className="text-xs text-gray-400">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "patients" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">All Patients ({patients.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {patients.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.hasEventToday && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium">
                          Event today
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{p.email} · {p.phone}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>DOB: {p.dateOfBirth}</p>
                    <p className="capitalize">via {p.preferredContact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Send Log</h2>
            </div>
            {logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                No messages sent yet. Run greetings from the Dashboard tab.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                    <span className="text-xl mt-0.5">{EVENT_ICONS[log.type]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{log.patientName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          log.status === "sent"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {log.status === "sent" ? "✓ Sent" : "✗ Failed"}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                          {log.channel === "sms" ? "📱 SMS" : "✉️ Email"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{log.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{format(new Date(log.sentAt), "h:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Import Tab */}
        {activeTab === "import" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Import Patients from Excel / CSV</h2>
                <p className="text-sm text-gray-500 mt-1">Upload a spreadsheet with patient data. Required columns: Name, Phone or Email, Date of Birth.</p>
              </div>
              <div className="px-6 py-6 space-y-4">
                {/* Column reference */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Accepted Column Names</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ["Name", "Name, Full Name, Patient Name"],
                      ["Email", "Email, Email Address"],
                      ["Phone", "Phone, Phone Number, Mobile, Cell"],
                      ["Date of Birth", "Date of Birth, DOB, Birthdate, Birthday"],
                      ["Procedure Date", "Procedure Date, Surgery Date"],
                      ["Last Visit", "Last Visit, Last Appointment"],
                      ["Contact Method", "Preferred Contact, Contact (sms/email/both)"],
                    ].map(([field, accepted]) => (
                      <div key={field} className="flex gap-2">
                        <span className="font-medium text-gray-700 w-28 shrink-0">{field}:</span>
                        <span className="text-gray-500">{accepted}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* File upload */}
                {/* Download template */}
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Step 1 — Download the template</p>
                    <p className="text-xs text-blue-600 mt-0.5">Fill it in with patient data, then upload below.</p>
                  </div>
                  <a
                    href="/lane-medical-patient-template.csv"
                    download="Lane-Medical-Patient-Template.csv"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    ⬇ Download Template
                  </a>
                </div>

                {/* File upload */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Step 2 — Upload completed file (.csv)</p>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("file-input")?.click()}
                  >
                    <p className="text-3xl mb-2">📂</p>
                    <p className="font-medium text-gray-700">{importFile ? importFile.name : "Click to select your CSV file"}</p>
                    <p className="text-sm text-gray-400 mt-1">.csv recommended · .xlsx also supported</p>
                    <input
                      id="file-input"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); setImportError(""); }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? "Parsing file..." : "Import Patients"}
                </button>

                {importError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{importError}</div>
                )}

                {importResult && (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 space-y-1">
                      <p className="text-green-700 font-semibold">✓ {importResult.imported} new patient{importResult.imported !== 1 ? "s" : ""} imported{importResult.saved ? " and saved!" : "!"}</p>
                      <p className="text-green-600 text-sm">
                        {importResult.skipped > 0 ? `${importResult.skipped} duplicate${importResult.skipped !== 1 ? "s" : ""} skipped. ` : ""}
                        {importResult.total} total patients in system.
                      </p>
                      {importResult.saved && <p className="text-green-600 text-sm">Head to the <strong>Patients</strong> tab to see them, or <strong>Dashboard</strong> to send greetings.</p>}
                    </div>
                    {!importResult.saved && importResult.saveMessage && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                        <p className="text-yellow-800 font-semibold text-sm">⚠ Patients parsed but not saved permanently</p>
                        <p className="text-yellow-700 text-sm mt-1">{importResult.saveMessage}</p>
                        <p className="text-yellow-700 text-sm mt-1">To fix: go to your <strong>Vercel dashboard → Storage → Create KV Database → Connect</strong>, then redeploy.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Template download guide */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
              <h3 className="font-semibold text-gray-900 mb-2">Send This Template to Lane Medical</h3>
              <p className="text-sm text-gray-500 mb-3">Ask their front desk to fill in this spreadsheet with patient data and send it back to you.</p>
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      {["Name","Email","Phone","Date of Birth","Procedure Date","Last Visit","Preferred Contact"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Maria Johnson","maria@email.com","+1876xxxxxxx","1975-06-09","2025-01-15","2026-03-01","both"],
                      ["James Williams","james@email.com","+1876xxxxxxx","1982-03-22","","2026-02-10","sms"],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-gray-600">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    pink: "bg-pink-50 border-pink-100 text-pink-600",
    green: "bg-green-50 border-green-100 text-green-600",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}
