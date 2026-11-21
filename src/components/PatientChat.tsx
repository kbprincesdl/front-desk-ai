import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Baby,
  CalendarPlus,
  Clock,
  CreditCard,
  IndianRupee,
  MapPin,
  Mic,
  MicOff,
  PhoneCall,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CLINIC_DATA } from '../data/clinicData';
import type {
  AppointmentRequest,
  ChatMessage,
  ClinicDoctor,
  CustomerFeedback,
  FeedbackValue,
  LanguageCode,
} from '../types/clinic';
import { BookingFlowCard } from './BookingFlowCard';
import { ClinicDirectory } from './ClinicDirectory';
import { CustomerFeedbackBanner } from './CustomerFeedbackBanner';
import { ToothMascot } from './ToothMascot';

const INITIAL_DOCTORS: ClinicDoctor[] = CLINIC_DATA.doctors.map((d, idx) => ({
  id: `DR-${101 + idx}`,
  name: d.name,
  role: d.role,
  days: d.days,
  activeDays:
    d.days === 'Monday to Saturday'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : d.days === 'Saturday only'
        ? ['Sat']
        : ['Tue', 'Thu', 'Sat'],
}));

const SESSION_STORAGE_KEY = 'bright_roots_session_id';
const LANG_STORAGE_KEY = 'bright_roots_lang';

interface QuickChip {
  label: string;
  action: 'ask' | 'book';
  icon: 'book' | 'clock' | 'rupee' | 'child' | 'shield' | 'map' | 'card' | 'doctor';
}

const INITIAL_CHIPS: Record<LanguageCode, QuickChip[]> = {
  en: [
    { label: 'Book appointment', action: 'book', icon: 'book' },
    { label: 'What time do you open on Saturday?', action: 'ask', icon: 'clock' },
    { label: 'How much is a root canal?', action: 'ask', icon: 'rupee' },
    { label: 'Which doctor sees children?', action: 'ask', icon: 'child' },
    { label: 'Do you take Niva Bupa insurance?', action: 'ask', icon: 'shield' },
  ],
  hi: [
    { label: 'अपॉइंटमेंट बुक करें', action: 'book', icon: 'book' },
    { label: 'शनिवार को क्लिनिक का समय क्या है?', action: 'ask', icon: 'clock' },
    { label: 'रूट कैनाल की फीस कितनी है?', action: 'ask', icon: 'rupee' },
    { label: 'बच्चों को कौन से डॉक्टर देखते हैं?', action: 'ask', icon: 'child' },
    { label: 'क्या निवा बूपा बीमा चलता है?', action: 'ask', icon: 'shield' },
  ],
  te: [
    { label: 'అపాయింట్‌మెంట్ బుక్ చేయండి', action: 'book', icon: 'book' },
    { label: 'శనివారం క్లినిక్ సమయాలు ఏమిటి?', action: 'ask', icon: 'clock' },
    { label: 'రూట్ కెనాల్ ఖర్చు ఎంత?', action: 'ask', icon: 'rupee' },
    { label: 'పిల్లలను ఏ డాక్టర్ చూస్తారు?', action: 'ask', icon: 'child' },
    { label: 'నివా బూపా ఇన్సూరెన్స్ ఉందా?', action: 'ask', icon: 'shield' },
  ],
};

const UI_TEXT: Record<
  LanguageCode,
  {
    subtitle: string;
    welcome: string;
    placeholder: string;
    send: string;
    bookBtn: string;
    emergencyPrompt: string;
    callNow: string;
    listening: string;
    speakReply: string;
    stopSpeech: string;
  }
> = {
  en: {
    subtitle: 'Banjara Hills, Hyderabad · English, Hindi, Telugu',
    welcome:
      'Hi! I can help with clinic timings, doctors, treatment fees, cashless insurance, parking, or appointment requests.',
    placeholder: 'Ask about timings, fees, doctors, or insurance...',
    send: 'Send',
    bookBtn: 'Book appointment',
    emergencyPrompt: 'Swelling, bleeding, or severe pain?',
    callNow: 'Call 98000 00123',
    listening: 'Listening...',
    speakReply: 'Read reply aloud',
    stopSpeech: 'Stop reading',
  },
  hi: {
    subtitle: 'बंजारा हिल्स, हैदराबाद · English, हिंदी, తెలుగు',
    welcome:
      'नमस्ते! आप क्लिनिक के समय, डॉक्टरों, इलाज की फीस, कैशलेस बीमा, पार्किंग या अपॉइंटमेंट के बारे में पूछ सकते हैं।',
    placeholder: 'समय, फीस, डॉक्टर या बीमा के बारे में पूछें...',
    send: 'भेजें',
    bookBtn: 'अपॉइंटमेंट बुक करें',
    emergencyPrompt: 'सूजन, खून बहना या तेज दर्द?',
    callNow: 'कॉल करें 98000 00123',
    listening: 'सुन रहे हैं...',
    speakReply: 'उत्तर सुनें',
    stopSpeech: 'रोकें',
  },
  te: {
    subtitle: 'బంజారా హిల్స్, హైదరాబాద్ · English, हिंदी, తెలుగు',
    welcome:
      'నమస్కారం! క్లినిక్ సమయాలు, డాక్టర్లు, చికిత్స ధరలు, క్యాష్‌లెస్ ఇన్సూరెన్స్, పార్కింగ్ లేదా అపాయింట్‌మెంట్ గురించి అడగవచ్చు.',
    placeholder: 'సమయాలు, ధరలు, డాక్టర్లు లేదా ఇన్సూరెన్స్ అడగండి...',
    send: 'పంపండి',
    bookBtn: 'అపాయింట్‌మెంట్ బుక్ చేయండి',
    emergencyPrompt: 'వాపు, రక్తస్రావం లేదా తీవ్రమైన నొప్పి?',
    callNow: 'కాల్ 98000 00123',
    listening: 'వింటున్నాము...',
    speakReply: 'సమాధానం వినండి',
    stopSpeech: 'ఆపండి',
  },
};

function getChipIcon(icon: QuickChip['icon']) {
  switch (icon) {
    case 'book':
      return CalendarPlus;
    case 'clock':
      return Clock;
    case 'rupee':
      return IndianRupee;
    case 'child':
      return Baby;
    case 'shield':
      return ShieldCheck;
    case 'map':
      return MapPin;
    case 'card':
      return CreditCard;
    default:
      return Stethoscope;
  }
}

function inferChipIcon(label: string): QuickChip['icon'] {
  const lower = label.toLowerCase();
  if (/book|अपॉइंटमेंट|అపాయింట్/.test(lower)) return 'book';
  if (/emi|payment|ईएमआई|ఈఎంఐ/.test(lower)) return 'card';
  if (/insurance|बीमा|ఇన్సూరెన్స్/.test(lower)) return 'shield';
  if (/hour|timing|समय|సమయ/.test(lower)) return 'clock';
  if (/location|parking|पता|చిరునామా/.test(lower)) return 'map';
  if (/fee|cost|फीस|ధర/.test(lower)) return 'rupee';
  return 'doctor';
}

function getOrCreateSessionId(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get('session')?.trim();
    if (urlSession) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, urlSession);
      } catch {
        // Ignore storage write restriction
      }
      return urlSession;
    }
    try {
      const existing = localStorage.getItem(SESSION_STORAGE_KEY);
      if (existing) {
        return existing;
      }
    } catch {
      // Ignore storage read restriction
    }
  } catch {
    // Ignore URL/storage errors
  }
  const created =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, created);
  } catch {
    // Ignore storage write restriction
  }
  return created;
}

function getInitialLang(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'hi' || saved === 'te' || saved === 'en') return saved;
  } catch {
    // Ignore storage read restriction
  }
  return 'en';
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

function hasEmergencyWords(text: string): boolean {
  return /\b(swelling|swollen|bleeding|severe pain|cannot breathe|can't breathe|trouble breathing)\b|(सूजन|खून|तेज दर्द|सांस|వాపు|రక్తస్రావం|తీవ్రమైన నొప్పి|శ్వాస)/i.test(
    text,
  );
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function PatientChat() {
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());
  const [language, setLanguage] = useState<LanguageCode>(getInitialLang);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>(INITIAL_DOCTORS);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({
    helpfulCount: 0,
    totalBotRatings: 0,
    averageRating: 0,
  });

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const askedOnLoadRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const t = UI_TEXT[language];

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const fetchMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: ChatMessage[] };
      if (Array.isArray(data.messages)) {
        setMessages((prev) => {
          if (
            prev.length === data.messages!.length &&
            prev[prev.length - 1]?.id === data.messages![data.messages!.length - 1]?.id &&
            prev[prev.length - 1]?.feedback === data.messages![data.messages!.length - 1]?.feedback
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

  const fetchShowcaseData = useCallback(async () => {
    try {
      const [docRes, fbRes] = await Promise.all([fetch('/api/doctors'), fetch('/api/feedback')]);
      if (docRes.ok) {
        const docData = (await docRes.json()) as { doctors?: ClinicDoctor[] };
        if (Array.isArray(docData.doctors) && docData.doctors.length > 0) {
          setDoctors(docData.doctors);
        }
      }
      if (fbRes.ok) {
        const fbData = (await fbRes.json()) as {
          feedbacks?: CustomerFeedback[];
          feedbackStats?: {
            helpfulCount: number;
            totalBotRatings: number;
            averageRating: number;
          };
        };
        if (Array.isArray(fbData.feedbacks)) setFeedbacks(fbData.feedbacks);
        if (fbData.feedbackStats) setFeedbackStats(fbData.feedbackStats);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const sendQuestion = useCallback(
    async (questionText: string, sid: string, langOverride?: LanguageCode) => {
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
          body: JSON.stringify({
            sessionId: sid,
            message: trimmed,
            language: langOverride ?? language,
          }),
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

        if (data.botMessage.language && data.botMessage.language !== language) {
          setLanguage(data.botMessage.language);
          try {
            localStorage.setItem(LANG_STORAGE_KEY, data.botMessage.language);
          } catch {
            // Ignore storage write restriction
          }
        }
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
    [language],
  );

  useEffect(() => {
    let active = true;

    const init = async () => {
      await Promise.all([fetchMessages(sessionId), fetchShowcaseData()]);
      if (!active) return;

      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('q')?.trim();
      if (qParam && askedOnLoadRef.current !== qParam) {
        askedOnLoadRef.current = qParam;
        await sendQuestion(qParam, sessionId, 'en');
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
      window.speechSynthesis?.cancel();
    };
  }, [sessionId, fetchMessages, sendQuestion]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending, isBookingOpen]);

  const handleLanguageChange = (next: LanguageCode) => {
    setLanguage(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage write restriction
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await sendQuestion(text, sessionId);
  };

  const handleToggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const w = window as unknown as Record<string, new () => SpeechRecognitionInstance>;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg('Voice input is not supported in this browser.');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => {
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  const handleSpeakMessage = (msg: ChatMessage) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;

    if (speakingMsgId === msg.id) {
      synth.cancel();
      setSpeakingMsgId(null);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(msg.text);
    const targetLang =
      msg.language === 'hi' ? 'hi-IN' : msg.language === 'te' ? 'te-IN' : 'en-IN';
    utterance.lang = targetLang;
    const voices = synth.getVoices();
    const matched = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.slice(0, 2)));
    if (matched) utterance.voice = matched;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msg.id);
    synth.speak(utterance);
  };

  const handleFeedback = async (msgId: string, nextValue: 'up' | 'down') => {
    const current = messages.find((m) => m.id === msgId)?.feedback ?? null;
    const finalValue: FeedbackValue = current === nextValue ? null : nextValue;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: finalValue } : m)),
    );

    try {
      await fetch(
        `/api/chat/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(msgId)}/feedback`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: finalValue }),
        },
      );
      fetchShowcaseData();
    } catch {
      // Non-blocking feedback update
    }
  };

  const handleNewChat = () => {
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
    const nextId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, nextId);
    } catch {
      // Ignore storage write restriction
    }
    askedOnLoadRef.current = null;
    setSessionId(nextId);
    setMessages([]);
    setIsBookingOpen(false);
    setErrorMsg(null);
    if (window.location.search) {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleChipClick = (chip: QuickChip) => {
    if (chip.action === 'book' || /book appointment|अपॉइंटमेंट बुक|అపాయింట్‌మెంట్ బుక్/i.test(chip.label)) {
      setIsBookingOpen(true);
      return;
    }
    sendQuestion(chip.label, sessionId);
  };

  const handleBookingSubmitted = (_appt: AppointmentRequest) => {
    // Booking flow displays its own summary card & notifies staff queue
  };

  // Contextual follow-up chips after latest bot reply
  const latestBotMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'bot') return messages[i];
    }
    return null;
  }, [messages]);

  const contextualChips: QuickChip[] = useMemo(() => {
    if (!latestBotMessage?.suggestedFollowups?.length) {
      return INITIAL_CHIPS[language];
    }
    return latestBotMessage.suggestedFollowups.map((label) => ({
      label,
      action: /book appointment|अपॉइंटमेंट बुक|అపాయింట్‌మెంట్ బుక్/i.test(label) ? 'book' : 'ask',
      icon: inferChipIcon(label),
    }));
  }, [latestBotMessage, language]);

  const emergencyDetected = useMemo(() => {
    if (hasEmergencyWords(input)) return true;
    const lastPatient = [...messages].reverse().find((m) => m.role === 'patient');
    if (lastPatient && hasEmergencyWords(lastPatient.text)) return true;
    return latestBotMessage?.ticketStatus === 'urgent';
  }, [input, messages, latestBotMessage]);

  return (
    <main className="animate-page-in mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      <CustomerFeedbackBanner
        feedbacks={feedbacks}
        helpfulCount={feedbackStats.helpfulCount}
        totalBotRatings={feedbackStats.totalBotRatings}
        averageRating={feedbackStats.averageRating}
        doctors={doctors}
        onFeedbackAdded={(fb) => {
          setFeedbacks((prev) => [fb, ...prev]);
          fetchShowcaseData();
        }}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
        {/* Primary Chat Workspace */}
        <section
          aria-label="Patient front desk chat"
          className="flex min-w-0 flex-col rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Chat Header with Mascot & EN | हिंदी | తెలుగు Language Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E7DA] px-4 py-3.5 sm:px-5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-2.5">
              <ToothMascot mood={isSending ? 'thinking' : 'idle'} size="sm" />
              <div className="min-w-0">
                <h1 className="font-display text-base font-bold text-stone-900 sm:text-lg dark:text-[#FAF5EF]">
                  FrontDesk AI
                </h1>
                <p className="truncate text-xs text-stone-600 dark:text-slate-400">
                  {t.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Language Switcher */}
              <div
                role="group"
                aria-label="Language switcher"
                className="inline-flex items-center rounded-xl border border-[#E7D8C5] bg-[#FFF9F2] p-0.5 dark:border-slate-700 dark:bg-slate-800"
              >
                {(['en', 'hi', 'te'] as LanguageCode[]).map((code) => {
                  const active = language === code;
                  const label = code === 'en' ? 'EN' : code === 'hi' ? 'हिंदी' : 'తెలుగు';
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleLanguageChange(code)}
                      className={`min-h-[32px] rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950'
                          : 'text-stone-700 hover:text-stone-950 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#E7D8C5] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-[#FFF3E6] whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">New chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Calm Emergency Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4DFD6] bg-[#FFF4EE] px-4 py-2 text-xs text-stone-800 sm:px-5 dark:border-red-950/60 dark:bg-red-950/25 dark:text-red-200">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldAlert
                className="h-3.5 w-3.5 shrink-0 text-[#C84635] dark:text-red-400"
                aria-hidden="true"
              />
              <span>{t.emergencyPrompt}</span>
            </span>
            <a
              href={`tel:${CLINIC_DATA.clinic.emergency_phone.replace(/\s+/g, '')}`}
              className="font-mono font-semibold tabular-nums text-[#B23A2A] underline decoration-[#E5988B] underline-offset-2 hover:text-[#8E2B1E] dark:text-red-300 whitespace-nowrap"
            >
              {t.callNow}
            </a>
          </div>

          {/* Message Thread */}
          <div className="flex min-h-[350px] max-h-[58dvh] flex-col gap-4 overflow-y-auto px-4 py-4 sm:min-h-[430px] sm:px-5 sm:py-5">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="flex items-start gap-3.5 rounded-2xl border border-[#EFE2D3] bg-[#FFF9F2] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60">
                  <ToothMascot mood="wave" size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-stone-900 dark:text-slate-50">
                      Bright Roots Dental Front Desk
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-slate-300">
                      {t.welcome}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-stone-500 dark:text-slate-400">
                    Quick questions & booking
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INITIAL_CHIPS[language].map((chip) => {
                      const Icon = getChipIcon(chip.icon);
                      const isBook = chip.action === 'book';
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          disabled={isSending}
                          onClick={() => handleChipClick(chip)}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 ${
                            isBook
                              ? 'border-[#C84635] bg-[#C84635] text-white hover:bg-[#B23A2A]'
                              : 'border-[#E7D8C5] bg-white text-stone-800 hover:border-teal-700 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.role === 'patient') {
                  return (
                    <div key={msg.id} className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
                        <span>You</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatTime(msg.createdAt)}</span>
                      </div>
                      <div className="max-w-[88%] rounded-2xl bg-teal-700 px-4 py-3 text-sm leading-relaxed text-white shadow-sm break-words sm:max-w-[78%] dark:bg-teal-600">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                const isStaff = msg.role === 'staff';
                const isUrgent = msg.ticketStatus === 'urgent';
                const isSpeaking = speakingMsgId === msg.id;

                return (
                  <div key={msg.id} className="flex flex-col items-start gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
                      <span className="font-semibold text-stone-700 dark:text-slate-300">
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
                      className={`bot-msg max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm break-words sm:max-w-[82%] ${
                        isUrgent
                          ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100'
                          : isStaff
                            ? 'border-teal-300 bg-teal-50 text-stone-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-slate-100'
                            : 'border-[#EFE2D3] bg-[#FFF9F2] text-stone-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Source badge + Voice reply + Feedback */}
                    <div className="flex flex-wrap items-center gap-3 pl-1 text-xs text-stone-500 dark:text-slate-400">
                      {!isStaff && (
                        <span>
                          {msg.fromFallback ? 'Answered from the clinic file' : 'From clinic file'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(msg)}
                        aria-label={isSpeaking ? t.stopSpeech : t.speakReply}
                        title={isSpeaking ? t.stopSpeech : t.speakReply}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[#F3EAE0] dark:hover:bg-slate-800 ${
                          isSpeaking ? 'font-semibold text-[#C84635] dark:text-orange-300' : ''
                        }`}
                      >
                        {isSpeaking ? (
                          <VolumeX className="h-3.5 w-3.5" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                        <span>{isSpeaking ? t.stopSpeech : 'Listen'}</span>
                      </button>

                      {!isStaff && !msg.id.startsWith('temp-') && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'up')}
                            aria-label="Helpful reply"
                            className={`rounded-md p-1 transition-colors hover:bg-[#F3EAE0] dark:hover:bg-slate-800 ${
                              msg.feedback === 'up'
                                ? 'text-teal-700 dark:text-teal-300'
                                : 'text-stone-400 dark:text-slate-500'
                            }`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'down')}
                            aria-label="Not helpful reply"
                            className={`rounded-md p-1 transition-colors hover:bg-[#F3EAE0] dark:hover:bg-slate-800 ${
                              msg.feedback === 'down'
                                ? 'text-[#C84635] dark:text-red-400'
                                : 'text-stone-400 dark:text-slate-500'
                            }`}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Dots Animation */}
            {isSending && (
              <div className="flex flex-col items-start gap-1" aria-live="polite">
                <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">
                  FrontDesk AI
                </span>
                <div className="inline-flex items-center gap-1.5 rounded-2xl border border-[#EFE2D3] bg-[#FFF9F2] px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <span className="h-2 w-2 rounded-full bg-teal-700 animate-typing-dot dark:bg-teal-400" />
                  <span
                    className="h-2 w-2 rounded-full bg-teal-700 animate-typing-dot dark:bg-teal-400"
                    style={{ animationDelay: '0.18s' }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-teal-700 animate-typing-dot dark:bg-teal-400"
                    style={{ animationDelay: '0.36s' }}
                  />
                </div>
              </div>
            )}

            {/* Inline Interactive Appointment Booking Flow */}
            {isBookingOpen && (
              <BookingFlowCard
                sessionId={sessionId}
                language={language}
                doctors={doctors}
                onClose={() => setIsBookingOpen(false)}
                onSubmitted={handleBookingSubmitted}
              />
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
              >
                {errorMsg}
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Contextual Quick-Reply Chips after messages */}
          {messages.length > 0 && !isBookingOpen && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#F4E9DC] bg-[#FFFBF5] px-4 py-2.5 sm:px-5 dark:border-slate-800 dark:bg-slate-900/70">
              {contextualChips.map((chip) => {
                const Icon = getChipIcon(chip.icon);
                const isBook = chip.action === 'book';
                return (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={isSending}
                    onClick={() => handleChipClick(chip)}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      isBook
                        ? 'border-[#C84635] bg-[#C84635] text-white hover:bg-[#B23A2A]'
                        : 'border-[#E7D8C5] bg-white text-stone-700 hover:border-teal-700 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-400'
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Emergency Detection Call Action */}
          {emergencyDetected && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-red-200 bg-red-50 px-4 py-2.5 sm:px-5 dark:border-red-900 dark:bg-red-950/50">
              <span className="text-xs font-semibold text-red-900 dark:text-red-100">
                Urgent symptom detected — contact our emergency line immediately:
              </span>
              <a
                href={`tel:${CLINIC_DATA.clinic.emergency_phone.replace(/\s+/g, '')}`}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-red-800 whitespace-nowrap"
              >
                <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Call {CLINIC_DATA.clinic.emergency_phone}</span>
              </a>
            </div>
          )}

          {/* Chat Composer with Voice Mic Input & Send Button */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-[#F2E7DA] p-3 sm:p-4 dark:border-slate-800"
          >
            <label htmlFor="chat-input" className="sr-only">
              Ask a question about Bright Roots Dental
            </label>
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-[#DFCEBA] bg-white pr-1.5 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-teal-400">
              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? t.listening : t.placeholder}
                autoComplete="off"
                className="min-h-[44px] min-w-0 flex-1 bg-transparent px-3.5 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none sm:text-sm dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  title={isListening ? 'Stop listening' : 'Speak your question'}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isListening
                      ? 'bg-[#C84635] text-white'
                      : 'text-stone-500 hover:bg-[#F5EADF] hover:text-stone-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
            </div>

            <button
              id="chat-send"
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#C84635] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#B23A2A] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C84635]"
            >
              <span>{t.send}</span>
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>

        {/* Clinic Directory with Live Status & Editable Doctor Cards */}
        <ClinicDirectory doctors={doctors} onDoctorsChange={setDoctors} />
      </div>
    </main>
  );
}
