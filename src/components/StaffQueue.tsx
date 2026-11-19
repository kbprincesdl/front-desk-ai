import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import type { Ticket, TicketStatus } from '../types/clinic';

type FilterTab = 'all' | TicketStatus;

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
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Ticket Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
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
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.colorClass}`}
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
            className="min-h-[34px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Patient question
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 break-words dark:text-slate-50">
            {ticket.question}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Initial FrontDesk AI reply
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 break-words dark:text-slate-300">
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
                className="rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-sm text-slate-900 break-words dark:border-teal-900 dark:bg-teal-950/40 dark:text-slate-100"
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

      {/* Staff Reply Form */}
      <form onSubmit={handleSendReply} className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          <span className="mb-1.5 block">Reply to patient</span>
          <textarea
            id="staff-reply"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a reply for this patient's chat..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
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
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap dark:bg-teal-600 dark:hover:bg-teal-500"
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
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) return;
      const data = (await res.json()) as { tickets?: Ticket[] };
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const interval = window.setInterval(loadTickets, 2500);
    return () => window.clearInterval(interval);
  }, [loadTickets]);

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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'needs human', label: 'Needs human' },
    { key: 'answered', label: 'Answered' },
    { key: 'closed', label: 'Closed' },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Staff Queue Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-900 sm:text-2xl dark:text-slate-50">
            Staff Ticket Queue
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-sm dark:text-slate-400">
            Review patient inquiries and send live replies straight into the patient’s chat.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTickets}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
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
          className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none sm:w-56 sm:text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Ticket Queue Container */}
      <section id="ticket-queue" aria-label="Ticket list" className="mt-5 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            <div className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
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
              onReplySent={handleTicketUpdate}
              onStatusChanged={handleTicketUpdate}
            />
          ))
        )}
      </section>
    </main>
  );
}
