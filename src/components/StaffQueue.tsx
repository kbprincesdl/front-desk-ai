import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  CheckCircle2,
  Clock,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type {
  AdminAnalytics,
  AppointmentRequest,
  AppointmentStatus,
  AuthSessionState,
  AuthUser,
  ClinicDoctor,
  CustomerFeedback,
  Ticket,
  TicketStatus,
  UserRole,
} from '../types/clinic';
import { CustomerFeedbackBanner } from './CustomerFeedbackBanner';

type FilterTab = 'all' | TicketStatus;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const STATUS_META: Record<
  TicketStatus,
  { label: string; colorClass: string; Icon: typeof AlertTriangle }
> = {
  urgent: {
    label: 'Urgent',
    colorClass:
      'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/60 dark:border-red-900',
    Icon: AlertTriangle,
  },
  'needs human': {
    label: 'Needs human',
    colorClass:
      'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-900',
    Icon: Clock,
  },
  answered: {
    label: 'Answered',
    colorClass:
      'text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-900',
    Icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    colorClass:
      'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
    Icon: XCircle,
  },
};

const APPT_STATUS_CLASSES: Record<AppointmentStatus, string> = {
  Pending:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  Confirmed:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  Rescheduled:
    'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300',
  Rejected:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
  Visited:
    'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface AppointmentCardProps {
  appt: AppointmentRequest;
  authToken: string;
  onUnauthorized: () => void;
  onUpdated: (updated: AppointmentRequest) => void;
}

const LOCAL_APPT_KEY = 'bright_roots_local_appointments';

function readLocalAppointments(): AppointmentRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_APPT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppointmentRequest[]) : [];
  } catch {
    return [];
  }
}

function updateLocalAppointment(
  id: string,
  status: AppointmentStatus,
  staffNote?: string,
): AppointmentRequest | null {
  const list = readLocalAppointments();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated: AppointmentRequest = {
    ...list[idx],
    status,
    staffNote: staffNote?.trim() || list[idx].staffNote,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  try {
    localStorage.setItem(LOCAL_APPT_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
  return updated;
}

function AppointmentCard({ appt, authToken, onUnauthorized, onUpdated }: AppointmentCardProps) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (status: AppointmentStatus, staffNote?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/appointments/${encodeURIComponent(appt.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status, staffNote }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { appointment: AppointmentRequest };
        setRescheduleOpen(false);
        setNoteInput('');
        onUpdated(data.appointment);
        return;
      }
      if (res.status === 404 || res.status === 405) {
        const localUpdated = updateLocalAppointment(appt.id, status, staffNote);
        if (localUpdated) {
          setRescheduleOpen(false);
          setNoteInput('');
          onUpdated(localUpdated);
        }
      }
    } catch {
      const localUpdated = updateLocalAppointment(appt.id, status, staffNote);
      if (localUpdated) {
        setRescheduleOpen(false);
        setNoteInput('');
        onUpdated(localUpdated);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm dark:border-[#1E3347] dark:bg-[#111E2B]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {appt.id}
            </span>
            <span aria-hidden="true">·</span>
            <span>{appt.reason}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
            {appt.patientName}{' '}
            <span className="font-mono text-xs font-medium tabular-nums text-slate-600 dark:text-slate-400">
              ({appt.patientPhone})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
            {appt.doctorName} · {appt.dateLabel} at{' '}
            <span className="font-semibold tabular-nums">{appt.timeSlot}</span>
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${APPT_STATUS_CLASSES[appt.status]}`}
        >
          {appt.status}
        </span>
      </div>

      {appt.staffNote && (
        <p className="mt-2 rounded-lg bg-[#EFF7FB] px-3 py-1.5 text-xs text-slate-700 dark:bg-[#152534] dark:text-slate-300">
          Note: {appt.staffNote}
        </p>
      )}

      {rescheduleOpen && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Suggest a new slot (e.g., Saturday 11:30 am)..."
            className="min-h-[38px] flex-1 rounded-lg border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => decide('Rescheduled', noteInput)}
            className="min-h-[38px] rounded-lg bg-[#0284C7] px-3 text-xs font-semibold text-white hover:bg-[#0369A1] disabled:opacity-50"
          >
            Send Reschedule
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#DCEBF3] pt-3 dark:border-[#1E3347]">
        <button
          type="button"
          disabled={busy || appt.status === 'Confirmed' || appt.status === 'Visited'}
          onClick={() => decide('Confirmed')}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#0E7490] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#155E75] disabled:opacity-45 dark:bg-cyan-600"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          <span>Confirm</span>
        </button>

        <button
          type="button"
          disabled={busy || appt.status === 'Visited'}
          onClick={() => decide('Visited')}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-45"
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Mark Visited</span>
        </button>

        <button
          type="button"
          disabled={busy || appt.status === 'Visited'}
          onClick={() => setRescheduleOpen((o) => !o)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#BDD8E7] bg-[#F5FAFD] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#E6F4F9] disabled:opacity-45 dark:border-[#243B52] dark:bg-[#152534] dark:text-slate-200"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Reschedule</span>
        </button>

        <button
          type="button"
          disabled={busy || appt.status === 'Rejected' || appt.status === 'Visited'}
          onClick={() => decide('Rejected')}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-45 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          <CalendarX className="h-3.5 w-3.5" />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
}

interface TicketCardProps {
  ticket: Ticket;
  authToken: string;
  onUnauthorized: () => void;
  onReplySent: (updated: Ticket) => void;
  onStatusChanged: (updated: Ticket) => void;
}

function TicketCard({
  ticket,
  authToken,
  onUnauthorized,
  onReplySent,
  onStatusChanged,
}: TicketCardProps) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = STATUS_META[ticket.status];
  const StatusIcon = meta.Icon;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reply: trimmed }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error('Could not send staff reply.');
      }
      const data = (await res.json()) as { ticket: Ticket };
      setReplyText('');
      onReplySent(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (nextStatus: TicketStatus) => {
    if (nextStatus === ticket.status || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticket.id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error('Could not update ticket status.');
      }
      const data = (await res.json()) as { ticket: Ticket };
      onStatusChanged(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <article
      data-ticket={ticket.id}
      data-status={ticket.status}
      className="min-w-0 rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm sm:p-5 dark:border-[#1E3347] dark:bg-[#111E2B]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCEBF3] pb-3 dark:border-[#1E3347]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {ticket.id}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatDateTime(ticket.createdAt)}</span>
          {ticket.fromFallback && (
            <>
              <span aria-hidden="true">·</span>
              <span>Clinic file matcher</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.colorClass}`}
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{meta.label}</span>
          </span>

          <label className="sr-only" htmlFor={`status-${ticket.id}`}>
            Update status for {ticket.id}
          </label>
          <select
            id={`status-${ticket.id}`}
            value={ticket.status}
            disabled={isUpdatingStatus}
            onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
            className="min-h-[34px] rounded-lg border border-[#BDD8E7] bg-white px-2 text-xs font-medium text-slate-700 focus:border-[#0E7490] focus:outline-none dark:border-[#243B52] dark:bg-[#152534] dark:text-slate-200"
          >
            <option value="urgent">urgent</option>
            <option value="needs human">needs human</option>
            <option value="answered">answered</option>
            <option value="closed">closed</option>
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Patient question
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 break-words dark:text-slate-50">
            {ticket.question}
          </p>
        </div>

        <div className="rounded-xl border border-[#DCEBF3] bg-[#F5FAFD] p-3 dark:border-[#1E3347] dark:bg-[#152534]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Initial FrontDesk AI reply
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 break-words dark:text-slate-300">
            {ticket.botReply}
          </p>
        </div>

        {ticket.staffReplies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Staff replies sent to patient chat
            </p>
            {ticket.staffReplies.map((sr) => (
              <div
                key={sr.id}
                className="rounded-xl border border-emerald-200 bg-[#ECFDF5] p-3 text-sm text-slate-900 break-words dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-slate-100"
              >
                <p className="leading-relaxed">{sr.text}</p>
                <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  Sent {formatDateTime(sr.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendReply}
        className="mt-4 space-y-2 border-t border-[#DCEBF3] pt-3 dark:border-[#1E3347]"
      >
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          <span className="mb-1.5 block">Reply to patient</span>
          <textarea
            id="staff-reply"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a reply for this patient's chat..."
            className="w-full rounded-xl border border-[#BDD8E7] bg-white px-3 py-2 text-base font-normal text-slate-900 placeholder:text-slate-400 focus:border-[#0E7490] focus:outline-none focus:ring-2 focus:ring-[#0E7490]/20 sm:text-sm dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
          />
        </label>
        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end">
          <button
            id="staff-send"
            type="submit"
            disabled={isSending || !replyText.trim()}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#0E7490] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#155E75] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            <span>{isSending ? 'Sending...' : 'Send Reply'}</span>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </article>
  );
}

interface StaffQueueProps {
  authSession: AuthSessionState;
  onLogout: () => void;
}

export function StaffQueue({ authSession, onLogout }: StaffQueueProps) {
  const isAdmin = authSession.user.role === 'admin';
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${authSession.token}` }),
    [authSession.token],
  );

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({
    helpfulCount: 0,
    totalBotRatings: 0,
    averageRating: 0,
  });
  const [portalUsers, setPortalUsers] = useState<AuthUser[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  // Quick Walk-in / Daily Visit Recorder state
  const [visitDoctorId, setVisitDoctorId] = useState('');
  const [visitPatientName, setVisitPatientName] = useState('');
  const [visitReason, setVisitReason] = useState('Consultation');
  const [visitDateISO, setVisitDateISO] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
  );
  const [loggingVisit, setLoggingVisit] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);
  const [visitSuccess, setVisitSuccess] = useState<string | null>(null);

  // Admin Doctor Directory Editor state
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docRole, setDocRole] = useState('');
  const [docActiveDays, setDocActiveDays] = useState<string[]>([...WEEKDAYS]);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Admin Portal User Management state
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/tickets', { headers: authHeaders }),
        fetch('/api/appointments', { headers: authHeaders }),
        fetch('/api/doctors'),
        fetch('/api/feedback'),
      ];
      if (isAdmin) {
        requests.push(fetch('/api/analytics', { headers: authHeaders }));
        requests.push(fetch('/api/auth/users', { headers: authHeaders }));
      }

      const [tRes, aRes, dRes, fRes, anRes, uRes] = await Promise.all(requests);

      if (tRes.status === 401 || aRes.status === 401 || anRes?.status === 401) {
        onLogout();
        return;
      }

      if (tRes.ok) {
        const tData = (await tRes.json()) as { tickets?: Ticket[] };
        if (Array.isArray(tData.tickets)) setTickets(tData.tickets);
      }
      const localAppts = readLocalAppointments();
      if (aRes.ok) {
        const aData = (await aRes.json()) as { appointments?: AppointmentRequest[] };
        const serverAppts = Array.isArray(aData.appointments) ? aData.appointments : [];
        const serverIds = new Set(serverAppts.map((a) => a.id));
        const merged = [...serverAppts, ...localAppts.filter((a) => !serverIds.has(a.id))];
        setAppointments(merged);
      } else if (localAppts.length > 0) {
        setAppointments(localAppts);
      }
      if (dRes.ok) {
        const dData = (await dRes.json()) as { doctors?: ClinicDoctor[] };
        if (Array.isArray(dData.doctors)) {
          setDoctors(dData.doctors);
          setVisitDoctorId((prev) => prev || dData.doctors?.[0]?.id || '');
        }
      }
      if (fRes.ok) {
        const fData = (await fRes.json()) as {
          feedbacks?: CustomerFeedback[];
          feedbackStats?: {
            helpfulCount: number;
            totalBotRatings: number;
            averageRating: number;
          };
        };
        if (Array.isArray(fData.feedbacks)) setFeedbacks(fData.feedbacks);
        if (fData.feedbackStats) setFeedbackStats(fData.feedbackStats);
      }
      if (anRes && anRes.ok) {
        const anData = (await anRes.json()) as AdminAnalytics;
        setAnalytics(anData);
        setVisitDateISO((prev) => prev || anData.todayISO);
      }
      if (uRes && uRes.ok) {
        const uData = (await uRes.json()) as { users?: AuthUser[] };
        if (Array.isArray(uData.users)) setPortalUsers(uData.users);
      }
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders, isAdmin, onLogout]);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 3000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const counts = useMemo(() => {
    const map: Record<FilterTab, number> = {
      all: tickets.length,
      urgent: 0,
      'needs human': 0,
      answered: 0,
      closed: 0,
    };
    for (const t of tickets) {
      map[t.status] = (map[t.status] || 0) + 1;
    }
    return map;
  }, [tickets]);

  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'Pending').length,
    [appointments],
  );

  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (
        q &&
        !t.question.toLowerCase().includes(q) &&
        !t.id.toLowerCase().includes(q) &&
        !t.botReply.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [tickets, filter, search]);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDoc = doctors.find((d) => d.id === visitDoctorId) ?? doctors[0];
    if (!selectedDoc || !visitPatientName.trim() || loggingVisit) return;

    setLoggingVisit(true);
    setVisitError(null);
    setVisitSuccess(null);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          doctorId: selectedDoc.id,
          doctorName: selectedDoc.name,
          patientName: visitPatientName.trim(),
          reason: visitReason.trim() || 'Clinic visit',
          dateISO: visitDateISO || analytics?.todayISO,
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        setVisitError('Could not record patient visit.');
        return;
      }
      setVisitPatientName('');
      setVisitSuccess('Patient visit recorded.');
      await loadData();
    } catch {
      setVisitError('Network error while recording visit.');
    } finally {
      setLoggingVisit(false);
    }
  };

  const openAddDoctor = () => {
    if (!isAdmin) return;
    setEditingDocId(null);
    setDocName('');
    setDocRole('');
    setDocActiveDays([...WEEKDAYS]);
    setDocError(null);
    setDocFormOpen(true);
  };

  const openEditDoctor = (doc: ClinicDoctor) => {
    if (!isAdmin) return;
    setEditingDocId(doc.id);
    setDocName(doc.name);
    setDocRole(doc.role);
    const active = Array.isArray(doc.activeDays) ? doc.activeDays : [];
    setDocActiveDays(active.length > 0 ? [...active] : [...WEEKDAYS]);
    setDocError(null);
    setDocFormOpen(true);
  };

  const toggleDocDay = (day: string) => {
    setDocActiveDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return WEEKDAYS.filter((w) => next.includes(w));
    });
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!docName.trim() || !docRole.trim() || docActiveDays.length === 0 || savingDoc) {
      setDocError('Please enter doctor name, speciality, and at least one day.');
      return;
    }
    setSavingDoc(true);
    setDocError(null);
    try {
      const daysText =
        docActiveDays.length === 6
          ? 'Monday to Saturday'
          : docActiveDays.length === 1
            ? `${docActiveDays[0]} only`
            : docActiveDays.join(', ');

      if (editingDocId) {
        const res = await fetch(`/api/doctors/${encodeURIComponent(editingDocId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            name: docName.trim(),
            role: docRole.trim(),
            days: daysText,
            activeDays: docActiveDays,
          }),
        });
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) {
          setDocError('Could not save doctor changes.');
          return;
        }
        setDocFormOpen(false);
        setEditingDocId(null);
        await loadData();
      } else {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            name: docName.trim(),
            role: docRole.trim(),
            days: daysText,
            activeDays: docActiveDays,
          }),
        });
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) {
          setDocError('Could not add doctor.');
          return;
        }
        setDocFormOpen(false);
        await loadData();
      }
    } catch {
      setDocError('Network error while saving doctor.');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || savingUser) return;
    setSavingUser(true);
    setUserError(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          displayName: newDisplayName.trim() || (newUserRole === 'admin' ? 'Clinic Admin' : 'Front Desk Staff'),
          role: newUserRole,
          password: newUserPassword,
        }),
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setUserError(data.error || 'Could not save user account.');
        return;
      }
      setNewUsername('');
      setNewDisplayName('');
      setNewUserPassword('');
      await loadData();
    } catch {
      setUserError('Network error while creating portal user.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!isAdmin) return;
    setUserError(null);
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setUserError(data.error || 'Could not delete user.');
        return;
      }
      await loadData();
    } catch {
      setUserError('Network error while deleting user.');
    }
  };

  const handleTicketUpdate = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleAppointmentUpdate = (updated: AppointmentRequest) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    loadData();
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'needs human', label: 'Needs human' },
    { key: 'answered', label: 'Answered' },
    { key: 'closed', label: 'Closed' },
  ];

  const maxDailyVisits = Math.max(
    1,
    ...(analytics?.dailyTotals.map((d) => d.count) ?? [1]),
  );
  const maxTopDoctorVisits = Math.max(
    1,
    ...(analytics?.topDoctors.map((d) => d.totalCount) ?? [1]),
  );

  const topDoctor = analytics?.topDoctors[0];

  return (
    <main className="animate-page-in mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Top Customer Feedback Showcase */}
      <CustomerFeedbackBanner
        feedbacks={feedbacks}
        helpfulCount={analytics?.feedbackStats.helpfulCount ?? feedbackStats.helpfulCount}
        totalBotRatings={analytics?.feedbackStats.totalBotRatings ?? feedbackStats.totalBotRatings}
        averageRating={analytics?.feedbackStats.averageRating ?? feedbackStats.averageRating}
        doctors={doctors}
        onFeedbackAdded={(fb) => {
          setFeedbacks((prev) => [fb, ...prev]);
          loadData();
        }}
      />

      {/* Staff & Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-lg font-bold text-slate-900 sm:text-2xl dark:text-slate-50">
              {isAdmin ? 'Admin & Staff Operations' : 'Front Desk Staff Operations'}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                isAdmin
                  ? 'border-cyan-200 bg-[#ECF8FC] text-[#0E7490] dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300'
                  : 'border-emerald-200 bg-[#ECFDF5] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {isAdmin ? (
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {authSession.user.displayName} ({isAdmin ? 'Admin' : 'Staff'})
              </span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
            {isAdmin
              ? 'Full admin access: daily visit analytics, doctor directory editor, portal accounts, bookings, and tickets.'
              : 'Staff front desk access: reply to patient tickets, manage booking requests, and record walk-in visits.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#BDD8E7] bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-[#E8F6FB] whitespace-nowrap shrink-0 dark:border-[#243B52] dark:bg-[#111E2B] dark:text-slate-200 dark:hover:bg-[#192D40]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#BDD8E7] bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap shrink-0 dark:border-[#243B52] dark:bg-[#111E2B] dark:text-slate-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* KPI Strip with Clinical Color Coding */}
      <section
        aria-label="Clinic operations summary"
        className={`mt-4 grid grid-cols-2 gap-3 ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}
      >
        {isAdmin && (
          <>
            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-[#EAF8FC] to-white p-3.5 shadow-sm dark:border-cyan-900/70 dark:from-[#0E2938] dark:to-[#111E2B]">
              <div className="flex items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-300">
                <span>Patients visited today</span>
                <Users className="h-3.5 w-3.5 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
              </div>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                {analytics?.todayVisits ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {analytics?.totalVisits ?? 0} total recorded
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#ECFDF5] to-white p-3.5 shadow-sm dark:border-emerald-900/70 dark:from-[#0D2A24] dark:to-[#111E2B]">
              <div className="flex items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-300">
                <span>Top Doctor</span>
                <Award className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p className="mt-1 truncate font-display text-base font-bold text-slate-900 dark:text-slate-50">
                {topDoctor && topDoctor.totalCount > 0 ? topDoctor.doctorName : 'No visits yet'}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-emerald-800 dark:text-emerald-300">
                {topDoctor && topDoctor.totalCount > 0
                  ? `${topDoctor.totalCount} visits (${topDoctor.todayCount} today)`
                  : 'Log a visit below'}
              </p>
            </div>
          </>
        )}

        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-[#EFF6FF] to-white p-3.5 shadow-sm dark:border-sky-900/70 dark:from-[#0F243A] dark:to-[#111E2B]">
          <p className="text-xs text-slate-600 dark:text-slate-300">Booking requests</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {appointments.length}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-[#0284C7] tabular-nums dark:text-sky-300">
            {pendingAppointments} pending approval
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-[#FFF1F2] to-white p-3.5 shadow-sm dark:border-rose-900/70 dark:from-[#2C151D] dark:to-[#111E2B]">
          <p className="text-xs text-slate-600 dark:text-slate-300">Open tickets</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {counts['needs human'] + counts.urgent}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-rose-700 dark:text-rose-300">
            {counts.urgent} urgent · {counts['needs human']} needs human
          </p>
        </div>
      </section>

      {/* Daily Patient Visits & Admin Analytics */}
      <section aria-label="Daily patient visits and top doctors" className="mt-5 space-y-4">
        {/* Log Walk-in / Daily Patient Visit Form */}
        <form
          onSubmit={handleLogVisit}
          className="rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm dark:border-[#1E3347] dark:bg-[#111E2B]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
              Log Daily Patient Visit
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Updates daily clinic totals and doctor leaderboards
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            <select
              value={visitDoctorId}
              onChange={(e) => setVisitDoctorId(e.target.value)}
              aria-label="Select doctor"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              value={visitPatientName}
              onChange={(e) => setVisitPatientName(e.target.value)}
              placeholder="Patient name"
              aria-label="Patient name"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />

            <input
              type="text"
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              placeholder="Visit reason"
              aria-label="Visit reason"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />

            <input
              type="date"
              value={visitDateISO}
              onChange={(e) => setVisitDateISO(e.target.value)}
              aria-label="Visit date"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base tabular-nums text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />

            <button
              type="submit"
              disabled={loggingVisit || !visitPatientName.trim()}
              className="min-h-[40px] rounded-xl bg-[#0E7490] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#155E75] disabled:opacity-50 dark:bg-cyan-600"
            >
              {loggingVisit ? 'Recording...' : 'Record Visit'}
            </button>
          </div>
          {visitError && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {visitError}
            </p>
          )}
          {visitSuccess && (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {visitSuccess}
            </p>
          )}
        </form>

        {/* Admin-Only Analytics Charts & Per-Doctor Matrix */}
        {isAdmin && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Patients Visited Every Day */}
          <div className="rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm dark:border-[#1E3347] dark:bg-[#111E2B]">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
              Patients Visited Every Day (Last 7 Days)
            </h3>
            <div className="mt-3 space-y-2.5">
              {(analytics?.dailyTotals ?? []).map((day) => (
                <div key={day.dateISO} className="flex items-center gap-2.5 text-xs">
                  <span className="w-16 shrink-0 font-medium tabular-nums text-slate-600 dark:text-slate-400">
                    {day.label}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#E3F1F8] dark:bg-[#1A2D3E]">
                    <div
                      className="h-full rounded-full bg-[#0E7490] transition-all dark:bg-cyan-400"
                      style={{ width: `${Math.round((day.count / maxDailyVisits) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {day.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Doctors Leaderboard */}
          <div className="rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm dark:border-[#1E3347] dark:bg-[#111E2B]">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
              Top Doctors by Patient Visits
            </h3>
            <div className="mt-3 space-y-3">
              {(analytics?.topDoctors ?? []).map((doc, idx) => (
                <div key={doc.doctorId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 truncate dark:text-slate-100">
                      <span className="mr-1.5 font-mono text-[#0284C7] dark:text-sky-300">
                        #{idx + 1}
                      </span>
                      {doc.doctorName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-slate-700 shrink-0 dark:text-slate-300">
                      {doc.totalCount} total · {doc.todayCount} today
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E3F1F8] dark:bg-[#1A2D3E]">
                    <div
                      className="h-full rounded-full bg-[#0284C7] transition-all dark:bg-sky-400"
                      style={{
                        width: `${Math.round((doc.totalCount / maxTopDoctorVisits) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Each Doctor's Daily Patient Visits Matrix */}
        <div className="rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm dark:border-[#1E3347] dark:bg-[#111E2B]">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
            Each Doctor’s Daily Patient Visits
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#DCEBF3] text-slate-500 dark:border-[#1E3347] dark:text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Doctor</th>
                  {(analytics?.dailyTotals ?? []).map((d) => (
                    <th key={d.dateISO} className="px-2 py-2 text-right font-semibold tabular-nums">
                      {d.label}
                    </th>
                  ))}
                  <th className="pl-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF4F9] dark:divide-[#1A2D3E]">
                {(analytics?.doctorStats ?? []).map((ds) => (
                  <tr key={ds.doctorId}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-900 dark:text-slate-100">
                      {ds.doctorName}
                    </td>
                    {(analytics?.dailyTotals ?? []).map((d) => (
                      <td
                        key={d.dateISO}
                        className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300"
                      >
                        {ds.dailyCounts[d.dateISO] ?? 0}
                      </td>
                    ))}
                    <td className="pl-3 py-2.5 text-right font-mono font-bold tabular-nums text-[#0E7490] dark:text-cyan-300">
                      {ds.totalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
      </section>

      {/* Admin Clinic Directory Management (Read-only for Staff, Full Edit for Admin) */}
      <section
        aria-label="Manage clinic doctors"
        className="mt-6 rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm sm:p-5 dark:border-[#1E3347] dark:bg-[#111E2B]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
              Clinic Directory — Doctors ({doctors.length})
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isAdmin
                ? 'Add new doctors or edit existing schedules and click Save to update FrontDesk AI live.'
                : 'Current doctor schedule (sign in as Admin to add or edit doctors).'}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openAddDoctor}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#0284C7] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0369A1] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Doctor</span>
            </button>
          )}
        </div>

        {docFormOpen && (
          <form
            onSubmit={handleSaveDoctor}
            className="mt-4 space-y-3 rounded-xl border border-cyan-300 bg-[#EEF8FB] p-4 dark:border-cyan-800 dark:bg-cyan-950/30"
          >
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {editingDocId ? 'Edit Doctor Details' : 'Add New Doctor'}
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Doctor name (e.g., Dr. Kavita Reddy)"
                aria-label="Doctor name"
                className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
              />
              <input
                type="text"
                required
                value={docRole}
                onChange={(e) => setDocRole(e.target.value)}
                placeholder="Speciality / role"
                aria-label="Doctor speciality"
                className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                Available days
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = docActiveDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDocDay(day)}
                      className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#0E7490] text-white dark:bg-cyan-500 dark:text-slate-950'
                          : 'border border-[#BDD8E7] bg-white text-slate-600 dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-400'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            {docError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {docError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDocFormOpen(false);
                  setEditingDocId(null);
                  setDocError(null);
                }}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-[#BDD8E7] bg-white px-3.5 text-xs font-medium text-slate-700 dark:border-[#243B52] dark:bg-[#152534] dark:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={savingDoc}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-[#0E7490] px-4 text-xs font-semibold text-white hover:bg-[#155E75] disabled:opacity-50 dark:bg-cyan-600"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{savingDoc ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-xl border border-[#DCEBF3] bg-[#F5FAFD] p-3.5 dark:border-[#1E3347] dark:bg-[#152534]"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {doc.name}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openEditDoctor(doc)}
                      className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-[#BDD8E7] bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:border-[#0E7490] hover:text-[#0E7490] dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-200"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{doc.role}</p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-[#0E7490] dark:text-cyan-300">
                {doc.days}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Admin-Only Staff & Portal Accounts Management */}
      {isAdmin && (
        <section
          aria-label="Manage portal user accounts"
          className="mt-6 rounded-2xl border border-[#CFE3EE] bg-white p-4 shadow-sm sm:p-5 dark:border-[#1E3347] dark:bg-[#111E2B]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-slate-900 dark:text-slate-50">
                <UserPlus className="h-4 w-4 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
                <span>Portal User Accounts ({portalUsers.length})</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Create or update Staff and Admin logins for the Bright Roots portal.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateUser}
            className="mt-3 grid grid-cols-1 gap-2.5 rounded-xl border border-[#DCEBF3] bg-[#F5FAFD] p-3 sm:grid-cols-5 dark:border-[#1E3347] dark:bg-[#152534]"
          >
            <input
              type="text"
              required
              minLength={3}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username (e.g., reception1)"
              aria-label="New portal username"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Display name"
              aria-label="New portal display name"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              aria-label="User role"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            >
              <option value="staff">Staff User</option>
              <option value="admin">Admin User</option>
            </select>
            <input
              type="password"
              required
              minLength={6}
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              aria-label="New portal password"
              className="min-h-[40px] rounded-xl border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={savingUser || !newUsername.trim() || newUserPassword.length < 6}
              className="min-h-[40px] rounded-xl bg-[#0E7490] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#155E75] disabled:opacity-50 dark:bg-cyan-600"
            >
              {savingUser ? 'Saving...' : 'Save User'}
            </button>
          </form>

          {userError && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {userError}
            </p>
          )}

          {portalUsers.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {portalUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#DCEBF3] bg-[#F8FCFE] px-3 py-2.5 text-xs dark:border-[#1E3347] dark:bg-[#0F1B26]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                      {u.displayName}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      @{u.username} · {u.role === 'admin' ? 'Admin' : 'Staff'}
                    </p>
                  </div>
                  {u.source !== 'env' && u.id !== authSession.user.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      aria-label={`Remove ${u.username}`}
                      title={`Remove ${u.username}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Human-in-the-loop Appointment Requests */}
      {appointments.length > 0 && (
        <section aria-label="Appointment requests" className="mt-6">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
            Appointment Requests ({appointments.length})
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                authToken={authSession.token}
                onUnauthorized={onLogout}
                onUpdated={handleAppointmentUpdate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filter & Search Toolbar for Chat Tickets */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filter tickets by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#0E7490] bg-[#0E7490] text-white dark:border-cyan-500 dark:bg-cyan-600'
                    : 'border-[#CFE3EE] bg-white text-slate-700 hover:bg-[#E8F6FB] dark:border-[#1E3347] dark:bg-[#111E2B] dark:text-slate-300 dark:hover:bg-[#192D40]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono tabular-nums opacity-85">{counts[tab.key]}</span>
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets..."
          aria-label="Search tickets"
          className="min-h-[40px] w-full rounded-xl border border-[#BDD8E7] bg-white px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0E7490] focus:outline-none sm:w-56 sm:text-xs dark:border-[#243B52] dark:bg-[#111E2B] dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Ticket Queue Container */}
      <section id="ticket-queue" aria-label="Ticket list" className="mt-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl border border-[#CFE3EE] bg-white dark:border-[#1E3347] dark:bg-[#111E2B]" />
            <div className="h-44 animate-pulse rounded-2xl border border-[#CFE3EE] bg-white dark:border-[#1E3347] dark:bg-[#111E2B]" />
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="rounded-2xl border border-[#CFE3EE] bg-white p-8 text-center dark:border-[#1E3347] dark:bg-[#111E2B]">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {tickets.length === 0 ? 'No patient tickets yet' : 'No matching tickets'}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {tickets.length === 0
                ? 'Questions asked on the patient chat page appear here automatically.'
                : 'Try switching the status filter or clearing your search.'}
            </p>
          </div>
        ) : (
          visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              authToken={authSession.token}
              onUnauthorized={onLogout}
              onReplySent={handleTicketUpdate}
              onStatusChanged={handleTicketUpdate}
            />
          ))
        )}
      </section>
    </main>
  );
}
