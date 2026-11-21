export type TicketStatus = 'answered' | 'needs human' | 'urgent' | 'closed';

export type MessageRole = 'patient' | 'bot' | 'staff';

export type LanguageCode = 'en' | 'hi' | 'te';

export type FeedbackValue = 'up' | 'down' | null;

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  fromFallback?: boolean;
  language?: LanguageCode;
  suggestedFollowups?: string[];
  feedback?: FeedbackValue;
  ticketId?: string;
  ticketStatus?: TicketStatus;
}

export interface StaffReply {
  id: string;
  text: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  sessionId: string;
  question: string;
  botReply: string;
  status: TicketStatus;
  fromFallback: boolean;
  createdAt: string;
  updatedAt: string;
  staffReplies: StaffReply[];
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Rescheduled' | 'Rejected';

export interface AppointmentRequest {
  id: string;
  sessionId: string;
  reason: string;
  doctorName: string;
  dateISO: string;
  dateLabel: string;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
  status: AppointmentStatus;
  staffNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicDoctor {
  name: string;
  role: string;
  days: string;
}

export interface ClinicService {
  name: string;
  price: string;
  note?: string;
  duration?: string;
}

export interface ClinicData {
  note: string;
  clinic: {
    name: string;
    address: string;
    landmark: string;
    phone: string;
    emergency_phone: string;
    whatsapp: string;
    languages: string[];
    parking: string;
  };
  hours: {
    monday_to_saturday: string;
    sunday: string;
    lunch_break: string;
    public_holidays: string;
  };
  doctors: ClinicDoctor[];
  services: ClinicService[];
  policies: {
    appointments: string;
    walk_ins: string;
    payment: string;
    emi: string;
    insurance: string;
    children: string;
    first_visit: string;
    sterilisation: string;
  };
  emergency_rules: string;
  bot_rules: string[];
}
