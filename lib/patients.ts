export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;       // YYYY-MM-DD
  procedureDate?: string;    // YYYY-MM-DD, optional
  lastVisit?: string;        // YYYY-MM-DD, optional
  preferredContact: "whatsapp" | "email" | "both";
  active: boolean;
};

// Seed data â€” replace with real DB or CSV import
export const patients: Patient[] = [
  {
    id: "1",
    name: "Maria Johnson",
    email: "maria.johnson@email.com",
    phone: "+18763178997",
    dateOfBirth: "2026-06-23",
    procedureDate: "2025-06-09",
    lastVisit: "2026-01-15",
    preferredContact: "both",
    active: true,
  },
  {
    id: "2",
    name: "James Williams",
    email: "timshernc@gmail.com",
    phone: "+18763178997",
    dateOfBirth: "2026-06-23",
    lastVisit: "2026-03-20",
    preferredContact: "whatsapp",
    active: true,
  },
  {
    id: "3",
    name: "Sandra Lee",
    email: "sandra.lee@email.com",
    phone: "+15550003333",
    dateOfBirth: "1990-12-25",
    procedureDate: "2024-06-09",
    preferredContact: "email",
    active: true,
  },
  {
    id: "4",
    name: "Robert Davis",
    email: "robert.d@email.com",
    phone: "+15550004444",
    dateOfBirth: "1968-03-14",
    lastVisit: "2025-11-01",
    preferredContact: "both",
    active: true,
  },
];


