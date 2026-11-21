import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import type {
  AppointmentRequest,
  AppointmentStatus,
  Ticket,
  TicketStatus,
} from '../types/clinic';

type FilterTab = 'all' | TicketStatus;

const STATUS_META: Record<
  TicketStatus,
  { label: string; colorClass: string; barColor: string; Icon: typeof AlertTriangle }
> = {
  urgent: {
    label: 'Urgent',
    colorClass:
      'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/60 dark:border-red-900',
    barColor: 'bg-red-600 dark:bg-red-500',
    Icon: AlertTriangle,
  },
  'needs human': {
    label: 'Needs human',
    colorClass:
      'text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-900',
    barColor: 'bg-amber-500',
    Icon: Clock,
  },
  answered: {
    label: 'Answered',
    colorClass:
      'text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-900',
    barColor: 'bg-teal-600 dark:bg-teal-500',
    Icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    colorClass:
      'text-stone-700 bg-stone-100 border-stone-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
    barColor: 'bg-stone-400 dark:bg-slate-600',
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
          disabled={busy || appt.status === 'Confirmed'}
          onClick={() => decide('Confirmed')}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-45 dark:bg-teal-600"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          <span>Confirm</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => setRescheduleOpen((o) => !o)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E7D8C5] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-[#FFF3E6] disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Reschedule</span>
        </button>

        <button
          type="button"
          disabled={busy || appt.status === 'Rejected'}
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
      {/* Ticket Header Row */}
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

      {/* Patient Question & Bot Reply */}
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

        {/* Staff Replies History */}
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

      {/* Staff Reply Form */}
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
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/appointments'),
      ]);
      if (tRes.ok) {
        const tData = (await tRes.json()) as { tickets?: Ticket[] };
        if (Array.isArray(tData.tickets)) setTickets(tData.tickets);
      }
      if (aRes.ok) {
        const aData = (await aRes.json()) as { appointments?: AppointmentRequest[] };
        if (Array.isArray(aData.appointments)) setAppointments(aData.appointments);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 2500);
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

  const handleTicketUpdate = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleAppointmentUpdate = (updated: AppointmentRequest) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'needs human', label: 'Needs human' },
    { key: 'answered', label: 'Answered' },
    { key: 'closed', label: 'Closed' },
  ];

  const chartBars: { label: string; count: number; color: string }[] = [
    { label: 'Answered', count: counts.answered, color: 'bg-teal-600 dark:bg-teal-500' },
    { label: 'Needs human', count: counts['needs human'], color: 'bg-amber-500' },
    { label: 'Urgent', count: counts.urgent, color: 'bg-red-600 dark:bg-red-500' },
    { label: 'Pending bookings', count: pendingAppointments, color: 'bg-[#C84635]' },
  ];
  const maxBarCount = Math.max(1, ...chartBars.map((b) => b.count));

  return (
    <main className="animate-page-in mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Staff Queue Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold text-stone-900 sm:text-2xl dark:text-[#FAF5EF]">
            Front Desk Staff Queue
          </h1>
          <p className="mt-0.5 text-xs text-stone-600 sm:text-sm dark:text-slate-400">
            Confirm booking requests and reply to escalated patient questions.
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

      {/* Staff Dashboard Overview + Simple Count Chart */}
      <section
        aria-label="Staff dashboard summary"
        className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-stone-500 dark:text-slate-400">Booking requests</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900 dark:text-slate-50">
              {appointments.length}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#C84635] tabular-nums dark:text-orange-300">
              {pendingAppointments} pending
            </p>
          </div>
          <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-stone-500 dark:text-slate-400">Unanswered tickets</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900 dark:text-slate-50">
              {counts['needs human'] + counts.urgent}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-stone-600 tabular-nums dark:text-slate-400">
              {counts.urgent} urgent · {counts['needs human']} needs human
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-700 dark:text-slate-300">
            Queue Breakdown
          </p>
          <div className="mt-2.5 space-y-2">
            {chartBars.map((bar) => (
              <div key={bar.label} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 truncate text-stone-600 dark:text-slate-400">
                  {bar.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3EAE0] dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${bar.color}`}
                    style={{ width: `${Math.round((bar.count / maxBarCount) * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono font-semibold tabular-nums text-stone-900 dark:text-slate-100">
                  {bar.count}
                </span>
              </div>
            ))}
          </div>
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
