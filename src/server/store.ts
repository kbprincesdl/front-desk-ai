import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { CLINIC_DATA } from '../data/clinicData.ts';
import type {
  AdminAnalytics,
  AppointmentRequest,
  AppointmentStatus,
  ChatMessage,
  ClinicDoctor,
  CustomerFeedback,
  FeedbackValue,
  PatientVisit,
  Ticket,
  TicketStatus,
  UserRole,
} from '../types/clinic.ts';

export interface StoredAuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

interface StoreState {
  sessions: Record<string, ChatMessage[]>;
  tickets: Ticket[];
  appointments: AppointmentRequest[];
  doctors: ClinicDoctor[];
  visits: PatientVisit[];
  feedbacks: CustomerFeedback[];
  users: StoredAuthUser[];
}

function resolveWritableDataDir(): string {
  const localDir = path.resolve(process.cwd(), 'data');
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'bright-roots-data');
  }
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    return path.join(os.tmpdir(), 'bright-roots-data');
  }
}

const DATA_DIR = resolveWritableDataDir();
const STORE_FILE = path.join(DATA_DIR, 'clinic-store.json');

const ALL_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function inferActiveDaysFromText(daysText: string): string[] {
  const lower = daysText.toLowerCase();
  if (lower.includes('monday to saturday') || lower.includes('mon to sat')) {
    return [...ALL_WEEKDAYS];
  }
  const matched = ALL_WEEKDAYS.filter((d) => {
    const fullMap: Record<string, string> = {
      Mon: 'monday',
      Tue: 'tuesday',
      Wed: 'wednesday',
      Thu: 'thursday',
      Fri: 'friday',
      Sat: 'saturday',
    };
    return lower.includes(d.toLowerCase()) || lower.includes(fullMap[d]);
  });
  return matched.length > 0 ? matched : [...ALL_WEEKDAYS];
}

function defaultDoctors(): ClinicDoctor[] {
  return CLINIC_DATA.doctors.map((d, idx) => ({
    id: `DR-${101 + idx}`,
    name: d.name,
    role: d.role,
    days: d.days,
    activeDays: inferActiveDaysFromText(d.days),
  }));
}

export function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getLastNDaysIST(n: number): { dateISO: string; label: string }[] {
  const now = new Date();
  const days: { dateISO: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(now.getTime() - i * 86400000);
    const dateISO = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const label = dt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
    });
    days.push({ dateISO, label });
  }
  return days;
}

let state: StoreState = loadInitialState();

function loadInitialState(): StoreState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      return {
        sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
        appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
        doctors:
          Array.isArray(parsed.doctors) && parsed.doctors.length > 0
            ? parsed.doctors
            : defaultDoctors(),
        visits: Array.isArray(parsed.visits) ? parsed.visits : [],
        feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
      };
    }
  } catch (err) {
    console.error('Failed to read store file, starting fresh:', err);
  }
  return {
    sessions: {},
    tickets: [],
    appointments: [],
    doctors: defaultDoctors(),
    visits: [],
    feedbacks: [],
    users: [],
  };
}

function persistState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store state:', err);
  }
}

export function getSessionMessages(sessionId: string): ChatMessage[] {
  return state.sessions[sessionId] ?? [];
}

export function appendSessionMessage(
  sessionId: string,
  message: Omit<ChatMessage, 'id' | 'sessionId' | 'createdAt'>,
): ChatMessage {
  const created: ChatMessage = {
    id: crypto.randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    feedback: null,
    ...message,
  };
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = [];
  }
  state.sessions[sessionId].push(created);
  persistState();
  return created;
}

export function setMessageFeedback(
  sessionId: string,
  messageId: string,
  feedback: FeedbackValue,
): ChatMessage | null {
  const list = state.sessions[sessionId];
  if (!list) return null;
  const msg = list.find((m) => m.id === messageId);
  if (!msg) return null;
  msg.feedback = feedback;
  persistState();
  return msg;
}

export function createTicket(input: {
  sessionId: string;
  question: string;
  botReply: string;
  status: TicketStatus;
  fromFallback: boolean;
}): Ticket {
  const now = new Date().toISOString();
  const ticketNum = state.tickets.length + 101;
  const ticket: Ticket = {
    id: `TKT-${ticketNum}`,
    sessionId: input.sessionId,
    question: input.question,
    botReply: input.botReply,
    status: input.status,
    fromFallback: input.fromFallback,
    createdAt: now,
    updatedAt: now,
    staffReplies: [],
  };
  state.tickets.unshift(ticket);
  persistState();
  return ticket;
}

export function listTickets(): Ticket[] {
  return [...state.tickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function addStaffReply(ticketId: string, replyText: string): Ticket | null {
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return null;
  }
  const now = new Date().toISOString();
  const reply = {
    id: crypto.randomUUID(),
    text: replyText.trim(),
    createdAt: now,
  };
  ticket.staffReplies.push(reply);
  if (ticket.status !== 'closed') {
    ticket.status = 'answered';
  }
  ticket.updatedAt = now;

  appendSessionMessage(ticket.sessionId, {
    role: 'staff',
    text: reply.text,
    fromFallback: false,
    ticketId: ticket.id,
    ticketStatus: ticket.status,
  });

  persistState();
  return ticket;
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): Ticket | null {
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return null;
  }
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  persistState();
  return ticket;
}

export function createAppointment(input: {
  sessionId: string;
  reason: string;
  doctorName: string;
  dateISO: string;
  dateLabel: string;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
}): AppointmentRequest {
  const now = new Date().toISOString();
  const num = state.appointments.length + 201;
  const appt: AppointmentRequest = {
    id: `APT-${num}`,
    sessionId: input.sessionId,
    reason: input.reason,
    doctorName: input.doctorName,
    dateISO: input.dateISO,
    dateLabel: input.dateLabel,
    timeSlot: input.timeSlot,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
  };
  state.appointments.unshift(appt);
  persistState();
  return appt;
}

export function listAppointments(): AppointmentRequest[] {
  return [...state.appointments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function updateAppointmentDecision(
  appointmentId: string,
  status: AppointmentStatus,
  staffNote?: string,
): AppointmentRequest | null {
  const appt = state.appointments.find((a) => a.id === appointmentId);
  if (!appt) return null;

  const previousStatus = appt.status;
  appt.status = status;
  if (staffNote?.trim()) {
    appt.staffNote = staffNote.trim();
  }
  appt.updatedAt = new Date().toISOString();

  // If marked Visited (and wasn't already Visited), record a real patient visit entry
  if (status === 'Visited' && previousStatus !== 'Visited') {
    const matchedDoc = state.doctors.find(
      (d) => d.name.toLowerCase() === appt.doctorName.toLowerCase(),
    );
    recordVisit({
      doctorId: matchedDoc?.id ?? appt.doctorName,
      doctorName: appt.doctorName,
      patientName: appt.patientName,
      reason: appt.reason,
      dateISO: appt.dateISO || getTodayIST(),
      source: 'appointment',
    });
  }

  let messageText = '';
  if (status === 'Confirmed') {
    messageText = `Appointment Confirmed (${appt.id}): ${appt.patientName}, your ${appt.reason} with ${appt.doctorName} on ${appt.dateLabel} at ${appt.timeSlot} is confirmed by our front desk.${appt.staffNote ? ` Note: ${appt.staffNote}` : ''}`;
  } else if (status === 'Rescheduled') {
    messageText = `Reschedule Update (${appt.id}): Our front desk proposes rescheduling your ${appt.reason} with ${appt.doctorName}.${appt.staffNote ? ` ${appt.staffNote}` : ' Please call 040 5550 0123 or WhatsApp 98000 00123 to pick a new slot.'}`;
  } else if (status === 'Rejected') {
    messageText = `Appointment Update (${appt.id}): We could not accommodate the requested slot for ${appt.dateLabel} at ${appt.timeSlot}.${appt.staffNote ? ` ${appt.staffNote}` : ' Please call 040 5550 0123 or WhatsApp 98000 00123 so our front desk can help.'}`;
  }

  if (messageText) {
    appendSessionMessage(appt.sessionId, {
      role: 'staff',
      text: messageText,
      fromFallback: false,
    });
  }

  persistState();
  return appt;
}

// --- Admin Clinic Directory (Doctors) ---
export function listDoctors(): ClinicDoctor[] {
  return [...state.doctors];
}

export function addDoctor(input: {
  name: string;
  role: string;
  days: string;
  activeDays?: string[];
}): ClinicDoctor {
  const num = state.doctors.length + 101;
  const activeDays =
    Array.isArray(input.activeDays) && input.activeDays.length > 0
      ? input.activeDays
      : inferActiveDaysFromText(input.days);
  const doctor: ClinicDoctor = {
    id: `DR-${num}-${Date.now().toString(36).slice(-4)}`,
    name: input.name.trim(),
    role: input.role.trim(),
    days: input.days.trim() || activeDays.join(', '),
    activeDays,
  };
  state.doctors.push(doctor);
  persistState();
  return doctor;
}

export function updateDoctor(
  doctorId: string,
  input: {
    name: string;
    role: string;
    days: string;
    activeDays?: string[];
  },
): ClinicDoctor | null {
  const doc = state.doctors.find((d) => d.id === doctorId);
  if (!doc) return null;

  const oldName = doc.name;
  doc.name = input.name.trim();
  doc.role = input.role.trim();
  doc.days = input.days.trim() || (input.activeDays?.join(', ') ?? doc.days);
  doc.activeDays =
    Array.isArray(input.activeDays) && input.activeDays.length > 0
      ? input.activeDays
      : inferActiveDaysFromText(doc.days);

  // Keep existing visit logs linked cleanly if doctor name was edited
  if (oldName !== doc.name) {
    for (const v of state.visits) {
      if (v.doctorId === doc.id) {
        v.doctorName = doc.name;
      }
    }
  }

  persistState();
  return doc;
}

export function deleteDoctor(doctorId: string): boolean {
  const before = state.doctors.length;
  state.doctors = state.doctors.filter((d) => d.id !== doctorId);
  if (state.doctors.length === before) return false;
  persistState();
  return true;
}

// --- Patient Visits & Daily Doctor Analytics ---
export function recordVisit(input: {
  doctorId?: string;
  doctorName: string;
  patientName: string;
  reason?: string;
  dateISO?: string;
  source?: 'appointment' | 'walk_in';
}): PatientVisit {
  const matchedDoc = state.doctors.find(
    (d) =>
      (input.doctorId && d.id === input.doctorId) ||
      d.name.toLowerCase() === input.doctorName.toLowerCase(),
  );
  const visit: PatientVisit = {
    id: `VST-${state.visits.length + 301}`,
    doctorId: matchedDoc?.id ?? input.doctorId ?? input.doctorName,
    doctorName: matchedDoc?.name ?? input.doctorName.trim(),
    patientName: input.patientName.trim(),
    reason: input.reason?.trim() || 'Clinic visit',
    dateISO: input.dateISO?.trim() || getTodayIST(),
    source: input.source ?? 'walk_in',
    createdAt: new Date().toISOString(),
  };
  state.visits.unshift(visit);
  persistState();
  return visit;
}

export function listVisits(): PatientVisit[] {
  return [...state.visits].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// --- Customer Feedbacks ---
export function addCustomerFeedback(input: {
  patientName: string;
  doctorName?: string;
  rating: number;
  comment: string;
}): CustomerFeedback {
  const fb: CustomerFeedback = {
    id: `FB-${state.feedbacks.length + 101}`,
    patientName: input.patientName.trim(),
    doctorName: input.doctorName?.trim() || undefined,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment.trim(),
    createdAt: new Date().toISOString(),
  };
  state.feedbacks.unshift(fb);
  persistState();
  return fb;
}

export function listCustomerFeedbacks(): CustomerFeedback[] {
  return [...state.feedbacks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getAdminAnalytics(): AdminAnalytics {
  const todayISO = getTodayIST();
  const days = getLastNDaysIST(7);
  const daySet = new Set(days.map((d) => d.dateISO));

  const dailyMap: Record<string, number> = {};
  for (const d of days) dailyMap[d.dateISO] = 0;

  let todayVisits = 0;
  for (const v of state.visits) {
    if (v.dateISO === todayISO) todayVisits++;
    if (daySet.has(v.dateISO)) {
      dailyMap[v.dateISO] = (dailyMap[v.dateISO] || 0) + 1;
    }
  }

  const dailyTotals = days.map((d) => ({
    dateISO: d.dateISO,
    label: d.dateISO === todayISO ? 'Today' : d.label,
    count: dailyMap[d.dateISO] || 0,
  }));

  const doctorStats = state.doctors.map((doc) => {
    const dailyCounts: Record<string, number> = {};
    for (const d of days) dailyCounts[d.dateISO] = 0;

    let totalCount = 0;
    let todayCount = 0;

    for (const v of state.visits) {
      const matches =
        v.doctorId === doc.id || v.doctorName.toLowerCase() === doc.name.toLowerCase();
      if (!matches) continue;
      totalCount++;
      if (v.dateISO === todayISO) todayCount++;
      if (daySet.has(v.dateISO)) {
        dailyCounts[v.dateISO] = (dailyCounts[v.dateISO] || 0) + 1;
      }
    }

    return {
      doctorId: doc.id,
      doctorName: doc.name,
      role: doc.role,
      todayCount,
      totalCount,
      dailyCounts,
    };
  });

  const topDoctors = [...doctorStats]
    .sort((a, b) => b.totalCount - a.totalCount || b.todayCount - a.todayCount)
    .map((d) => ({
      doctorId: d.doctorId,
      doctorName: d.doctorName,
      role: d.role,
      totalCount: d.totalCount,
      todayCount: d.todayCount,
    }));

  let helpfulCount = 0;
  let notHelpfulCount = 0;
  for (const msgs of Object.values(state.sessions)) {
    for (const m of msgs) {
      if (m.feedback === 'up') helpfulCount++;
      if (m.feedback === 'down') notHelpfulCount++;
    }
  }

  const reviewCount = state.feedbacks.length;
  const averageRating =
    reviewCount > 0
      ? Number(
          (state.feedbacks.reduce((sum, f) => sum + f.rating, 0) / reviewCount).toFixed(1),
        )
      : 0;

  return {
    todayISO,
    todayVisits,
    totalVisits: state.visits.length,
    dailyTotals,
    doctorStats,
    topDoctors,
    feedbackStats: {
      helpfulCount,
      notHelpfulCount,
      totalBotRatings: helpfulCount + notHelpfulCount,
      reviewCount,
      averageRating,
    },
  };
}

// --- Portal Auth Users (Admin & Staff) ---
export function listStoredUsers(): StoredAuthUser[] {
  return [...state.users];
}

export function findStoredUserByUsername(username: string): StoredAuthUser | undefined {
  const normalized = username.trim().toLowerCase();
  return state.users.find((u) => u.username.toLowerCase() === normalized);
}

export function upsertStoredUser(input: {
  username: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
}): StoredAuthUser {
  const normalized = input.username.trim().toLowerCase();
  const existingIdx = state.users.findIndex((u) => u.username.toLowerCase() === normalized);
  if (existingIdx !== -1) {
    const updated: StoredAuthUser = {
      ...state.users[existingIdx],
      username: normalized,
      displayName: input.displayName.trim(),
      role: input.role,
      passwordHash: input.passwordHash,
    };
    state.users[existingIdx] = updated;
    persistState();
    return updated;
  }

  const created: StoredAuthUser = {
    id: `USR-${state.users.length + 101}-${crypto.randomBytes(2).toString('hex')}`,
    username: normalized,
    displayName: input.displayName.trim(),
    role: input.role,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };
  state.users.push(created);
  persistState();
  return created;
}

export function deleteStoredUser(id: string): boolean {
  const before = state.users.length;
  state.users = state.users.filter((u) => u.id !== id);
  if (state.users.length === before) return false;
  persistState();
  return true;
}

