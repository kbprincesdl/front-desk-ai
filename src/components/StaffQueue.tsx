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
  Pencil,
  Plus,
  RefreshCw,
  Send,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type {
  AdminAnalytics,
  AppointmentRequest,
  AppointmentStatus,
  ClinicDoctor,
  CustomerFeedback,
  Ticket,
  TicketStatus,
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
      'text-stone-700 bg-stone-100 border-stone-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
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
  onUpdated: (updated: AppointmentRequest) => void;
}

function AppointmentCard({ appt, onUpdated }: AppointmentCardProps) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (status: AppointmentStatus, staffNote?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/appointments/${encodeURIComponent(appt.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, staffNote }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { appointment: AppointmentRequest };
      setRescheduleOpen(false);
      setNoteInput('');
      onUpdated(data.appointment);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
            <span className="font-mono font-semibold tabular-nums text-stone-900 dark:text-slate-100">
              {appt.id}
            </span>
            <span aria-hidden="true">·</span>
            <span>{appt.reason}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-stone-900 dark:text-slate-50">
            {appt.patientName}{' '}
            <span className="font-mono text-xs font-medium tabular-nums text-stone-600 dark:text-slate-400">
              ({appt.patientPhone})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-slate-300">
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
        <p className="mt-2 rounded-lg bg-[#FFF4EE] px-3 py-1.5 text-xs text-stone-700 dark:bg-slate-800 dark:text-slate-300">
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
            className="min-h-[38px] flex-1 rounded-lg border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => decide('Rescheduled', noteInput)}
            className="min-h-[38px] rounded-lg bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            Send Reschedule
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F2E7DA] pt-3 dark:border-slate-800">
        <button
          type="button"
          disabled={busy || appt.status === 'Confirmed' || appt.status === 'Visited'}
          onClick={() => decide('Confirmed')}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-45 dark:bg-teal-600"
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
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E7D8C5] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-[#FFF3E6] disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
  onReplySent: (updated: Ticket) => void;
  onStatusChanged: (updated: Ticket) => void;
}

function TicketCard({ ticket, onReplySent, onStatusChanged }: TicketCardProps) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: trimmed }),
      });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
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
      className="min-w-0 rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2E7DA] pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-slate-400">
          <span className="font-mono font-semibold tabular-nums text-stone-900 dark:text-slate-100">
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
            className="min-h-[34px] rounded-lg border border-[#E7D8C5] bg-white px-2 text-xs font-medium text-stone-700 focus:border-teal-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
          <p className="text-xs font-medium text-stone-500 dark:text-slate-400">
            Patient question
          </p>
          <p className="mt-1 text-sm font-medium text-stone-900 break-words dark:text-slate-50">
            {ticket.question}
          </p>
        </div>

        <div className="rounded-xl border border-[#EFE2D3] bg-[#FFF9F2] p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-stone-500 dark:text-slate-400">
            Initial FrontDesk AI reply
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700 break-words dark:text-slate-300">
            {ticket.botReply}
          </p>
        </div>

        {ticket.staffReplies.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-teal-800 dark:text-teal-300">
              Staff replies sent to patient chat
            </p>
            {ticket.staffReplies.map((sr) => (
              <div
                key={sr.id}
                className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-sm text-stone-900 break-words dark:border-teal-900 dark:bg-teal-950/40 dark:text-slate-100"
              >
                <p className="leading-relaxed">{sr.text}</p>
                <p className="mt-1 text-xs tabular-nums text-stone-500 dark:text-slate-400">
                  Sent {formatDateTime(sr.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendReply}
        className="mt-4 space-y-2 border-t border-[#F2E7DA] pt-3 dark:border-slate-800"
      >
        <label className="block text-xs font-medium text-stone-700 dark:text-slate-300">
          <span className="mb-1.5 block">Reply to patient</span>
          <textarea
            id="staff-reply"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a reply for this patient's chat..."
            className="w-full rounded-xl border border-[#DFCEBA] bg-white px-3 py-2 text-base font-normal text-stone-900 placeholder:text-stone-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
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
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#C84635] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B23A2A] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            <span>{isSending ? 'Sending...' : 'Send Reply'}</span>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </article>
  );
}

export function StaffQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  // Quick Walk-in / Daily Visit Recorder state
  const [visitDoctorId, setVisitDoctorId] = useState('');
  const [visitPatientName, setVisitPatientName] = useState('');
  const [visitReason, setVisitReason] = useState('Consultation');
  const [visitDateISO, setVisitDateISO] = useState('');
  const [loggingVisit, setLoggingVisit] = useState(false);

  // Admin Doctor Directory Editor state
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docRole, setDocRole] = useState('');
  const [docActiveDays, setDocActiveDays] = useState<string[]>([...WEEKDAYS]);
  const [savingDoc, setSavingDoc] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tRes, aRes, dRes, anRes, fRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/appointments'),
        fetch('/api/doctors'),
        fetch('/api/analytics'),
        fetch('/api/feedback'),
      ]);
      if (tRes.ok) {
        const tData = (await tRes.json()) as { tickets?: Ticket[] };
        if (Array.isArray(tData.tickets)) setTickets(tData.tickets);
      }
      if (aRes.ok) {
        const aData = (await aRes.json()) as { appointments?: AppointmentRequest[] };
        if (Array.isArray(aData.appointments)) setAppointments(aData.appointments);
      }
      if (dRes.ok) {
        const dData = (await dRes.json()) as { doctors?: ClinicDoctor[] };
        if (Array.isArray(dData.doctors)) {
          setDoctors(dData.doctors);
          setVisitDoctorId((prev) => prev || dData.doctors?.[0]?.id || '');
        }
      }
      if (anRes.ok) {
        const anData = (await anRes.json()) as AdminAnalytics;
        setAnalytics(anData);
        setVisitDateISO((prev) => prev || anData.todayISO);
      }
      if (fRes.ok) {
        const fData = (await fRes.json()) as { feedbacks?: CustomerFeedback[] };
        if (Array.isArray(fData.feedbacks)) setFeedbacks(fData.feedbacks);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoc.id,
          doctorName: selectedDoc.name,
          patientName: visitPatientName.trim(),
          reason: visitReason.trim() || 'Clinic visit',
          dateISO: visitDateISO || analytics?.todayISO,
        }),
      });
      if (res.ok) {
        setVisitPatientName('');
        await loadData();
      }
    } finally {
      setLoggingVisit(false);
    }
  };

  const openAddDoctor = () => {
    setEditingDocId(null);
    setDocName('');
    setDocRole('');
    setDocActiveDays([...WEEKDAYS]);
    setDocFormOpen(true);
  };

  const openEditDoctor = (doc: ClinicDoctor) => {
    setEditingDocId(doc.id);
    setDocName(doc.name);
    setDocRole(doc.role);
    setDocActiveDays(doc.activeDays.length > 0 ? [...doc.activeDays] : [...WEEKDAYS]);
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
    if (!docName.trim() || !docRole.trim() || docActiveDays.length === 0 || savingDoc) return;
    setSavingDoc(true);
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: docName.trim(),
            role: docRole.trim(),
            days: daysText,
            activeDays: docActiveDays,
          }),
        });
        if (res.ok) {
          setDocFormOpen(false);
          setEditingDocId(null);
          await loadData();
        }
      } else {
        const res = await fetch('/api/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: docName.trim(),
            role: docRole.trim(),
            days: daysText,
            activeDays: docActiveDays,
          }),
        });
        if (res.ok) {
          setDocFormOpen(false);
          await loadData();
        }
      }
    } finally {
      setSavingDoc(false);
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
        helpfulCount={analytics?.feedbackStats.helpfulCount ?? 0}
        totalBotRatings={analytics?.feedbackStats.totalBotRatings ?? 0}
        averageRating={analytics?.feedbackStats.averageRating ?? 0}
        doctors={doctors}
        onFeedbackAdded={(fb) => {
          setFeedbacks((prev) => [fb, ...prev]);
          loadData();
        }}
      />

      {/* Staff & Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold text-stone-900 sm:text-2xl dark:text-[#FAF5EF]">
            Admin & Staff Operations
          </h1>
          <p className="mt-0.5 text-xs text-stone-600 sm:text-sm dark:text-slate-400">
            Track daily patient visits per doctor, manage the clinic directory, and handle tickets.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E7D8C5] bg-[#FFFDF9] px-3.5 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-[#FFF3E6] whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Strip */}
      <section aria-label="Clinic visit summary" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1 text-xs text-stone-500 dark:text-slate-400">
            <span>Patients visited today</span>
            <Users className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          </div>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900 dark:text-slate-50">
            {analytics?.todayVisits ?? 0}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-stone-500 dark:text-slate-400">
            {analytics?.totalVisits ?? 0} total recorded
          </p>
        </div>

        <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1 text-xs text-stone-500 dark:text-slate-400">
            <span>Top Doctor</span>
            <Award className="h-3.5 w-3.5 text-[#C84635] dark:text-orange-300" aria-hidden="true" />
          </div>
          <p className="mt-1 truncate font-display text-base font-bold text-stone-900 dark:text-slate-50">
            {topDoctor && topDoctor.totalCount > 0 ? topDoctor.doctorName : 'No visits yet'}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-teal-800 dark:text-teal-300">
            {topDoctor && topDoctor.totalCount > 0
              ? `${topDoctor.totalCount} visits (${topDoctor.todayCount} today)`
              : 'Log a visit below'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-stone-500 dark:text-slate-400">Booking requests</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900 dark:text-slate-50">
            {appointments.length}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-[#C84635] tabular-nums dark:text-orange-300">
            {pendingAppointments} pending approval
          </p>
        </div>

        <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-stone-500 dark:text-slate-400">Open tickets</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900 dark:text-slate-50">
            {counts['needs human'] + counts.urgent}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-stone-500 dark:text-slate-400">
            {counts.urgent} urgent · {counts['needs human']} needs human
          </p>
        </div>
      </section>

      {/* Admin Daily Patient Visits & Top Doctors Analytics */}
      <section aria-label="Daily patient visits and top doctors" className="mt-5 space-y-4">
        {/* Log Walk-in / Daily Patient Visit Form */}
        <form
          onSubmit={handleLogVisit}
          className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-stone-900 dark:text-slate-50">
              Log Daily Patient Visit
            </h2>
            <span className="text-[11px] text-stone-500 dark:text-slate-400">
              Updates daily clinic totals and doctor leaderboards
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            <select
              value={visitDoctorId}
              onChange={(e) => setVisitDoctorId(e.target.value)}
              aria-label="Select doctor"
              className="min-h-[40px] rounded-xl border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              className="min-h-[40px] rounded-xl border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <input
              type="text"
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              placeholder="Visit reason"
              aria-label="Visit reason"
              className="min-h-[40px] rounded-xl border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <input
              type="date"
              value={visitDateISO}
              onChange={(e) => setVisitDateISO(e.target.value)}
              aria-label="Visit date"
              className="min-h-[40px] rounded-xl border border-[#E7D8C5] bg-white px-3 text-base tabular-nums text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <button
              type="submit"
              disabled={loggingVisit || !visitPatientName.trim()}
              className="min-h-[40px] rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600"
            >
              {loggingVisit ? 'Recording...' : 'Record Visit'}
            </button>
          </div>
        </form>

        {/* Daily Visits Chart + Top Doctors Leaderboard */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Patients Visited Every Day */}
          <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-sm font-bold text-stone-900 dark:text-slate-50">
              Patients Visited Every Day (Last 7 Days)
            </h3>
            <div className="mt-3 space-y-2.5">
              {(analytics?.dailyTotals ?? []).map((day) => (
                <div key={day.dateISO} className="flex items-center gap-2.5 text-xs">
                  <span className="w-16 shrink-0 font-medium tabular-nums text-stone-600 dark:text-slate-400">
                    {day.label}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F3EAE0] dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-700 transition-all dark:bg-teal-500"
                      style={{ width: `${Math.round((day.count / maxDailyVisits) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono font-bold tabular-nums text-stone-900 dark:text-slate-100">
                    {day.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Doctors Leaderboard */}
          <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-display text-sm font-bold text-stone-900 dark:text-slate-50">
              Top Doctors by Patient Visits
            </h3>
            <div className="mt-3 space-y-3">
              {(analytics?.topDoctors ?? []).map((doc, idx) => (
                <div key={doc.doctorId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-stone-900 truncate dark:text-slate-100">
                      <span className="mr-1.5 font-mono text-[#C84635] dark:text-orange-300">
                        #{idx + 1}
                      </span>
                      {doc.doctorName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-stone-700 shrink-0 dark:text-slate-300">
                      {doc.totalCount} total · {doc.todayCount} today
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F3EAE0] dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#C84635] transition-all"
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
        <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-sm font-bold text-stone-900 dark:text-slate-50">
            Each Doctor’s Daily Patient Visits
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#EFE2D3] text-stone-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Doctor</th>
                  {(analytics?.dailyTotals ?? []).map((d) => (
                    <th key={d.dateISO} className="px-2 py-2 text-right font-semibold tabular-nums">
                      {d.label}
                    </th>
                  ))}
                  <th className="pl-3 py-2 text-right font-semibold text-stone-900 dark:text-slate-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EAE0] dark:divide-slate-800">
                {(analytics?.doctorStats ?? []).map((ds) => (
                  <tr key={ds.doctorId}>
                    <td className="py-2.5 pr-3 font-semibold text-stone-900 dark:text-slate-100">
                      {ds.doctorName}
                    </td>
                    {(analytics?.dailyTotals ?? []).map((d) => (
                      <td
                        key={d.dateISO}
                        className="px-2 py-2.5 text-right font-mono tabular-nums text-stone-700 dark:text-slate-300"
                      >
                        {ds.dailyCounts[d.dateISO] ?? 0}
                      </td>
                    ))}
                    <td className="pl-3 py-2.5 text-right font-mono font-bold tabular-nums text-teal-800 dark:text-teal-300">
                      {ds.totalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Admin Clinic Directory Management (Add / Edit / Save Doctors) */}
      <section
        aria-label="Manage clinic doctors"
        className="mt-6 rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-stone-900 dark:text-[#FAF5EF]">
              Clinic Directory — Doctors ({doctors.length})
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400">
              Add new doctors or edit existing schedules and click Save to update FrontDesk AI live.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddDoctor}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#C84635] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B23A2A] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Doctor</span>
          </button>
        </div>

        {docFormOpen && (
          <form
            onSubmit={handleSaveDoctor}
            className="mt-4 space-y-3 rounded-xl border border-teal-300 bg-teal-50/40 p-4 dark:border-teal-800 dark:bg-teal-950/30"
          >
            <p className="text-xs font-bold text-stone-900 dark:text-slate-100">
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
                className="min-h-[40px] rounded-xl border border-[#DFCEBA] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="text"
                required
                value={docRole}
                onChange={(e) => setDocRole(e.target.value)}
                placeholder="Speciality / role"
                aria-label="Doctor speciality"
                className="min-h-[40px] rounded-xl border border-[#DFCEBA] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-stone-700 dark:text-slate-300">
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
                          ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950'
                          : 'border border-[#E7D8C5] bg-white text-stone-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDocFormOpen(false);
                  setEditingDocId(null);
                }}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-[#E7D8C5] bg-white px-3.5 text-xs font-medium text-stone-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={savingDoc}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600"
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
              className="flex flex-col justify-between rounded-xl border border-[#EFE2D3] bg-[#FFF9F2] p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-stone-900 dark:text-slate-100">
                    {doc.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => openEditDoctor(doc)}
                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-[#E7D8C5] bg-white px-2.5 text-[11px] font-semibold text-stone-700 hover:border-teal-700 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">{doc.role}</p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-teal-800 dark:text-teal-300">
                {doc.days}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Human-in-the-loop Appointment Requests */}
      {appointments.length > 0 && (
        <section aria-label="Appointment requests" className="mt-6">
          <h2 className="font-display text-base font-bold text-stone-900 dark:text-[#FAF5EF]">
            Appointment Requests ({appointments.length})
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
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
                    ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600'
                    : 'border-[#E7D8C5] bg-[#FFFDF9] text-stone-700 hover:bg-[#FFF3E6] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
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
          className="min-h-[40px] w-full rounded-xl border border-[#E7D8C5] bg-[#FFFDF9] px-3 py-1.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-700 focus:outline-none sm:w-56 sm:text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Ticket Queue Container */}
      <section id="ticket-queue" aria-label="Ticket list" className="mt-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] dark:border-slate-800 dark:bg-slate-900" />
            <div className="h-44 animate-pulse rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] dark:border-slate-800 dark:bg-slate-900" />
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-stone-900 dark:text-slate-100">
              {tickets.length === 0 ? 'No patient tickets yet' : 'No matching tickets'}
            </p>
            <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
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
              onReplySent={handleTicketUpdate}
              onStatusChanged={handleTicketUpdate}
            />
          ))
        )}
      </section>
    </main>
  );
}
