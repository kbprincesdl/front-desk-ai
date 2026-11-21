import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AppointmentRequest,
  AppointmentStatus,
  ChatMessage,
  FeedbackValue,
  Ticket,
  TicketStatus,
} from '../types/clinic.ts';

interface StoreState {
  sessions: Record<string, ChatMessage[]>;
  tickets: Ticket[];
  appointments: AppointmentRequest[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'clinic-store.json');

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
      };
    }
  } catch (err) {
    console.error('Failed to read store file, starting fresh:', err);
  }
  return { sessions: {}, tickets: [], appointments: [] };
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

  appt.status = status;
  if (staffNote?.trim()) {
    appt.staffNote = staffNote.trim();
  }
  appt.updatedAt = new Date().toISOString();

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
