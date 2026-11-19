import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ChatMessage, Ticket, TicketStatus } from '../types/clinic.ts';

interface StoreState {
  sessions: Record<string, ChatMessage[]>;
  tickets: Ticket[];
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
      };
    }
  } catch (err) {
    console.error('Failed to read store file, starting fresh:', err);
  }
  return { sessions: {}, tickets: [] };
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
    ...message,
  };
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = [];
  }
  state.sessions[sessionId].push(created);
  persistState();
  return created;
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
