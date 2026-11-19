import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock,
  MapPin,
  Phone,
  RotateCcw,
  Send,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { CLINIC_DATA } from '../data/clinicData';
import type { ChatMessage } from '../types/clinic';

const SESSION_STORAGE_KEY = 'bright_roots_session_id';

const QUICK_PROMPTS = [
  'What time do you open on Saturday?',
  'How much is a root canal?',
  'Which doctor sees children?',
  'Do you take Niva Bupa insurance?',
  'Where is the clinic located?',
];

function getOrCreateSessionId(): string {
  const params = new URLSearchParams(window.location.search);
  const urlSession = params.get('session')?.trim();
  if (urlSession) {
    localStorage.setItem(SESSION_STORAGE_KEY, urlSession);
    return urlSession;
  }
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const created =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function PatientChat() {
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const askedOnLoadRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);

  const fetchMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: ChatMessage[] };
      if (Array.isArray(data.messages)) {
        setMessages((prev) => {
          if (
            prev.length === data.messages!.length &&
            prev[prev.length - 1]?.id === data.messages![data.messages!.length - 1]?.id
          ) {
            return prev;
          }
          return data.messages!;
        });
      }
    } catch {
      // Ignore transient background poll failures
    }
  }, []);

  const sendQuestion = useCallback(
    async (questionText: string, sid: string) => {
      const trimmed = questionText.trim();
      if (!trimmed || isSendingRef.current) return;

      isSendingRef.current = true;
      setIsSending(true);
      setErrorMsg(null);

      const optimisticUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId: sid,
        role: 'patient',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid, message: trimmed }),
        });

        if (!res.ok) {
          throw new Error('Could not reach front desk service.');
        }

        const data = (await res.json()) as {
          patientMessage: ChatMessage;
          botMessage: ChatMessage;
        };

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== optimisticUserMsg.id);
          return [...withoutTemp, data.patientMessage, data.botMessage];
        });
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Unable to send your message right now. Please try again.',
        );
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [],
  );

  // Initial load + ?q= auto-ask
  useEffect(() => {
    let active = true;

    const init = async () => {
      await fetchMessages(sessionId);
      if (!active) return;

      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('q')?.trim();
      if (qParam && askedOnLoadRef.current !== qParam) {
        askedOnLoadRef.current = qParam;
        await sendQuestion(qParam, sessionId);
      }
    };

    init();

    const interval = window.setInterval(() => {
      if (!isSendingRef.current) {
        fetchMessages(sessionId);
      }
    }, 1500);

    const onFocus = () => {
      if (!isSendingRef.current) {
        fetchMessages(sessionId);
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [sessionId, fetchMessages, sendQuestion]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await sendQuestion(text, sessionId);
  };

  const handleNewChat = () => {
    const nextId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, nextId);
    askedOnLoadRef.current = null;
    setSessionId(nextId);
    setMessages([]);
    setErrorMsg(null);
    if (window.location.search) {
      window.history.replaceState({}, '', '/');
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Primary Chat Workspace */}
        <section
          aria-label="Patient front desk chat"
          className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Chat Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5 sm:px-5 dark:border-slate-800">
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold text-slate-900 sm:text-lg dark:text-slate-50 text-balance">
                FrontDesk AI
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Banjara Hills, Hyderabad · English, Hindi, Telugu
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewChat}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New chat</span>
              </button>
            )}
          </div>

          {/* Emergency strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50/70 px-4 py-2 text-xs text-red-900 sm:px-5 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />
              <span>Dental emergency or swelling?</span>
            </span>
            <a
              href={`tel:${CLINIC_DATA.clinic.emergency_phone.replace(/\s+/g, '')}`}
              className="font-mono font-semibold tabular-nums underline decoration-red-400 underline-offset-2 hover:text-red-700 dark:hover:text-red-100 whitespace-nowrap"
            >
              Call {CLINIC_DATA.clinic.emergency_phone}
            </a>
          </div>

          {/* Message Thread */}
          <div className="flex min-h-[340px] max-h-[58dvh] flex-col gap-4 overflow-y-auto px-4 py-4 sm:min-h-[420px] sm:px-5 sm:py-5">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    Welcome to <strong className="font-semibold text-slate-900 dark:text-white">Bright Roots Dental</strong>. Ask about our clinic timings, doctors, treatment fees, cashless insurance, parking, or appointment policies. Questions outside our clinic file are routed to our front desk staff.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Common questions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isSending}
                        onClick={() => sendQuestion(prompt, sessionId)}
                        className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-teal-600 hover:text-teal-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.role === 'patient') {
                  return (
                    <div key={msg.id} className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>You</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatTime(msg.createdAt)}</span>
                      </div>
                      <div className="max-w-[88%] rounded-xl bg-teal-700 px-4 py-2.5 text-sm leading-relaxed text-white break-words sm:max-w-[78%] dark:bg-teal-600">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                const isStaff = msg.role === 'staff';
                const isUrgent = msg.ticketStatus === 'urgent';

                return (
                  <div key={msg.id} className="flex flex-col items-start gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {isStaff ? 'Clinic Staff' : 'FrontDesk AI'}
                      </span>
                      {msg.ticketId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{msg.ticketId}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatTime(msg.createdAt)}</span>
                    </div>

                    <div
                      className={`bot-msg max-w-[92%] rounded-xl border px-4 py-3 text-sm leading-relaxed break-words sm:max-w-[82%] ${
                        isUrgent
                          ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100'
                          : isStaff
                            ? 'border-teal-300 bg-teal-50 text-slate-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-slate-100'
                            : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.fromFallback && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Answered from the clinic file
                      </p>
                    )}
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex flex-col items-start gap-1" aria-live="polite">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  FrontDesk AI
                </span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Checking the clinic file...
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              >
                {errorMsg}
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-200 p-3 sm:p-4 dark:border-slate-800"
          >
            <label htmlFor="chat-input" className="sr-only">
              Ask a question about Bright Roots Dental
            </label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about timings, fees, doctors, or insurance..."
              autoComplete="off"
              className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20"
            />
            <button
              id="chat-send"
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <span>Send</span>
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>

        {/* Clinic Reference Panel (Full sidebar on desktop, clean expandable card on mobile) */}
        <aside
          aria-label="Clinic directory"
          className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
            Clinic Information
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Official details from the Bright Roots Dental clinic file.
          </p>

          <div className="mt-4 divide-y divide-slate-200 text-xs dark:divide-slate-800">
            <div className="pb-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>Location & Parking</span>
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
                {CLINIC_DATA.clinic.address}
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {CLINIC_DATA.clinic.landmark}
              </p>
              <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                {CLINIC_DATA.clinic.parking}
              </p>
            </div>

            <div className="py-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Clock className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>Clinic Hours</span>
              </div>
              <dl className="mt-2 space-y-1.5 text-slate-700 dark:text-slate-300">
                <div>
                  <dt className="font-medium text-slate-900 dark:text-slate-200">Mon – Sat</dt>
                  <dd className="tabular-nums">{CLINIC_DATA.hours.monday_to_saturday}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900 dark:text-slate-200">Lunch break</dt>
                  <dd className="tabular-nums">{CLINIC_DATA.hours.lunch_break}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900 dark:text-slate-200">Sunday</dt>
                  <dd className="tabular-nums">{CLINIC_DATA.hours.sunday}</dd>
                </div>
              </dl>
            </div>

            <div className="py-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Stethoscope className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>Doctors</span>
              </div>
              <ul className="mt-2 space-y-2">
                {CLINIC_DATA.doctors.map((doc) => (
                  <li key={doc.name}>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{doc.name}</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {doc.role} · {doc.days}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Phone className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>Contact</span>
              </div>
              <div className="mt-2 space-y-1 text-slate-700 dark:text-slate-300">
                <p>
                  Front desk:{' '}
                  <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                    {CLINIC_DATA.clinic.phone}
                  </span>
                </p>
                <p>
                  WhatsApp & Emergency:{' '}
                  <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                    {CLINIC_DATA.clinic.emergency_phone}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
