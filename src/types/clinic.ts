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

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Rescheduled' | 'Rejected' | 'Visited';

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
  id: string;
  name: string;
  role: string;
  days: string;
  activeDays: string[]; // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
}

export interface PatientVisit {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  reason: string;
  dateISO: string; // YYYY-MM-DD in Asia/Kolkata
  source: 'appointment' | 'walk_in';
  createdAt: string;
}

export interface CustomerFeedback {
  id: string;
  patientName: string;
  doctorName?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface AdminAnalytics {
  todayISO: string;
  todayVisits: number;
  totalVisits: number;
  dailyTotals: { dateISO: string; label: string; count: number }[];
  doctorStats: {
    doctorId: string;
    doctorName: string;
    role: string;
    todayCount: number;
    totalCount: number;
    dailyCounts: Record<string, number>;
  }[];
  topDoctors: {
    doctorId: string;
    doctorName: string;
    role: string;
    totalCount: number;
    todayCount: number;
  }[];
  feedbackStats: {
    helpfulCount: number;
    notHelpfulCount: number;
    totalBotRatings: number;
    reviewCount: number;
    averageRating: number;
  };
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
  doctors: Omit<ClinicDoctor, 'id' | 'activeDays'>[];
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

export type UserRole = 'admin' | 'staff';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  source?: 'env' | 'store';
  createdAt?: string;
}

export interface AuthSessionState {
  user: AuthUser;
  token: string;
}

export interface AuthStatusResponse {
  adminConfigured: boolean;
  staffConfigured: boolean;
  envAdminConfigured: boolean;
  envStaffConfigured: boolean;
}

