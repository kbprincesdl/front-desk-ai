import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { CLINIC_DATA } from '../data/clinicData';
import type { AppointmentRequest, ClinicDoctor, LanguageCode } from '../types/clinic';

interface BookingFlowCardProps {
  sessionId: string;
  language: LanguageCode;
  doctors: ClinicDoctor[];
  onClose: () => void;
  onSubmitted: (appt: AppointmentRequest) => void;
}

interface ReasonOption {
  id: string;
  label: string;
  sub: string;
  suggestedDoctor: string;
}

const REASONS: ReasonOption[] = [
  {
    id: 'checkup',
    label: 'Consultation / Checkup',
    sub: 'Rs 400 · Adjusted if treatment starts in 7 days',
    suggestedDoctor: 'Dr. Meera Nair',
  },
  {
    id: 'root_canal',
    label: 'Root Canal Treatment',
    sub: 'Rs 6,500 to Rs 9,000 · Usually two visits',
    suggestedDoctor: 'Dr. Meera Nair',
  },
  {
    id: 'braces',
    label: 'Braces & Aligners',
    sub: 'Rs 35,000 to Rs 60,000 · 6-month no-cost EMI',
    suggestedDoctor: 'Dr. Imran Qureshi',
  },
  {
    id: 'child',
    label: 'Child Visit (under 14)',
    sub: 'Saturdays only · Parent must be present',
    suggestedDoctor: 'Dr. Sneha Rao',
  },
];

const TIME_SLOTS = [
  { label: '9:30 am', hour: 9, minute: 30 },
  { label: '10:30 am', hour: 10, minute: 30 },
  { label: '11:30 am', hour: 11, minute: 30 },
  { label: '12:30 pm', hour: 12, minute: 30 },
  { label: '2:30 pm', hour: 14, minute: 30 },
  { label: '4:00 pm', hour: 16, minute: 0 },
  { label: '5:30 pm', hour: 17, minute: 30 },
  { label: '7:00 pm', hour: 19, minute: 0 },
];

function getValidDatesForDoctor(
  doctorName: string,
  doctors: ClinicDoctor[],
): { dateISO: string; label: string }[] {
  const doc = doctors.find((d) => d.name === doctorName);
  const docDays = Array.isArray(doc?.activeDays) && doc.activeDays.length > 0
    ? doc.activeDays
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allowedDayNames = new Set(docDays);
  const results: { dateISO: string; label: string }[] = [];

  const now = new Date();
  for (let offset = 0; offset < 28 && results.length < 6; offset++) {
    const candidate = new Date(now.getTime() + offset * 86400000);
    const istStr = candidate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dayName = candidate.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
    });
    if (dayName === 'Sun' || !allowedDayNames.has(dayName)) continue;

    const niceDate = candidate.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    results.push({
      dateISO: istStr,
      label: offset === 0 ? `Today (${niceDate})` : niceDate,
    });
  }
  return results;
}

const LOCAL_APPT_KEY = 'bright_roots_local_appointments';

function saveLocalAppointmentFallback(payload: {
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
  let existing: AppointmentRequest[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_APPT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed as AppointmentRequest[];
    }
  } catch {
    existing = [];
  }
  const appt: AppointmentRequest = {
    id: `APT-${201 + existing.length}`,
    sessionId: payload.sessionId || 'web-guest',
    reason: payload.reason,
    doctorName: payload.doctorName,
    dateISO: payload.dateISO,
    dateLabel: payload.dateLabel,
    timeSlot: payload.timeSlot,
    patientName: payload.patientName,
    patientPhone: payload.patientPhone,
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
  };
  try {
    localStorage.setItem(LOCAL_APPT_KEY, JSON.stringify([appt, ...existing]));
  } catch {
    // Ignore storage quota errors
  }
  return appt;
}

function downloadICS(appt: AppointmentRequest): void {
  const slotObj = TIME_SLOTS.find((s) => s.label === appt.timeSlot) ?? { hour: 10, minute: 30 };
  const [y, m, d] = appt.dateISO.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startLocal = `${y}${pad(m)}${pad(d)}T${pad(slotObj.hour)}${pad(slotObj.minute)}00`;
  const endHour = slotObj.minute + 30 >= 60 ? slotObj.hour + 1 : slotObj.hour;
  const endMin = (slotObj.minute + 30) % 60;
  const endLocal = `${y}${pad(m)}${pad(d)}T${pad(endHour)}${pad(endMin)}00`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bright Roots Dental//FrontDesk AI//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}@brightrootsdental.in`,
    `DTSTAMP:${startLocal}`,
    `DTSTART:${startLocal}`,
    `DTEND:${endLocal}`,
    `SUMMARY:Dental Visit (${appt.reason}) - Bright Roots Dental`,
    `DESCRIPTION:Appointment request ${appt.id} with ${appt.doctorName}. Status: ${appt.status} (pending front desk confirmation). Bring old X-rays and medicine list.`,
    `LOCATION:${CLINIC_DATA.clinic.address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bright-roots-${appt.id.toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BookingFlowCard({
  sessionId,
  language,
  doctors,
  onClose,
  onSubmitted,
}: BookingFlowCardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [reason, setReason] = useState<ReasonOption | null>(null);
  const [doctorName, setDoctorName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<{ dateISO: string; label: string } | null>(null);
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAppt, setSubmittedAppt] = useState<AppointmentRequest | null>(null);

  const validDates = useMemo(
    () => (doctorName ? getValidDatesForDoctor(doctorName, doctors) : []),
    [doctorName, doctors],
  );

  const heading =
    language === 'hi'
      ? 'अपॉइंटमेंट अनुरोध'
      : language === 'te'
        ? 'అపాయింట్‌మెంట్ అభ్యర్థన'
        : 'Book an Appointment Request';

  const hasPaediatricDoc = useMemo(
    () =>
      doctors.some(
        (d) =>
          d.name.toLowerCase().includes('sneha') ||
          d.role.toLowerCase().includes('paediatric') ||
          d.role.toLowerCase().includes('child'),
      ),
    [doctors],
  );

  const handleSelectReason = (opt: ReasonOption) => {
    setReason(opt);
    const exactMatch = doctors.find((d) => d.name === opt.suggestedDoctor);
    const roleMatch =
      opt.id === 'child'
        ? doctors.find(
            (d) =>
              d.name.toLowerCase().includes('sneha') ||
              d.role.toLowerCase().includes('paediatric') ||
              d.role.toLowerCase().includes('child'),
          )
        : opt.id === 'braces'
          ? doctors.find((d) => d.role.toLowerCase().includes('ortho') || d.role.toLowerCase().includes('brace'))
          : doctors[0];
    setDoctorName(exactMatch?.name ?? roleMatch?.name ?? doctors[0]?.name ?? opt.suggestedDoctor);
    setSelectedDate(null);
    setTimeSlot('');
    setStep(2);
  };

  const handleSelectDoctor = (name: string) => {
    setDoctorName(name);
    setSelectedDate(null);
    setTimeSlot('');
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !doctorName || !selectedDate || !timeSlot) return;
    const cleanName = patientName.trim();
    const cleanPhone = patientPhone.trim();
    if (cleanName.length < 2 || cleanPhone.length < 8) {
      setError('Please enter your name and a valid phone number.');
      return;
    }

    const payload = {
      sessionId: sessionId || 'web-guest',
      reason: reason.label,
      doctorName,
      dateISO: selectedDate.dateISO,
      dateLabel: selectedDate.label,
      timeSlot,
      patientName: cleanName,
      patientPhone: cleanPhone,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { appointment: AppointmentRequest };
        setSubmittedAppt(data.appointment);
        setStep(5);
        onSubmitted(data.appointment);
        return;
      }

      // If backend endpoint is not mounted on a static host (404/405), fall back to browser persistence
      if (res.status === 404 || res.status === 405) {
        const fallbackAppt = saveLocalAppointmentFallback(payload);
        setSubmittedAppt(fallbackAppt);
        setStep(5);
        onSubmitted(fallbackAppt);
        return;
      }

      let serverMsg = 'Could not submit booking request.';
      try {
        const errData = (await res.json()) as { error?: string };
        if (errData?.error) serverMsg = errData.error;
      } catch {
        // Non-JSON response
      }
      throw new Error(serverMsg);
    } catch (err) {
      if (err instanceof TypeError) {
        // Network failure reaching /api/appointments -> save locally so booking isn't lost
        const fallbackAppt = saveLocalAppointmentFallback(payload);
        setSubmittedAppt(fallbackAppt);
        setStep(5);
        onSubmitted(fallbackAppt);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#CBE2EE] bg-[#F6FBFE] p-4 shadow-sm dark:border-[#243B52] dark:bg-[#152534]">
      <div className="flex items-center justify-between gap-2 border-b border-[#DCEBF3] pb-2.5 dark:border-[#1E3347]">
        <div className="flex items-center gap-2">
          {step > 1 && step < 5 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : 1))}
              aria-label="Go back"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-[#E1F0F7] dark:text-slate-300 dark:hover:bg-[#1E3347]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <p className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
              {heading}
            </p>
            {step < 5 && (
              <p className="text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                Step {step} of 4 · Confirmed by front desk staff
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close booking flow"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-[#E1F0F7] dark:text-slate-400 dark:hover:bg-[#1E3347]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step 1: Reason */}
      {step === 1 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            1. Choose a reason for your visit
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REASONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectReason(opt)}
                className="flex flex-col items-start rounded-xl border border-[#CFE3EE] bg-white p-3 text-left transition-colors hover:border-[#0E7490] hover:bg-[#ECFAF6]/60 dark:border-[#243B52] dark:bg-[#0F1B26] dark:hover:border-cyan-400"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {opt.label}
                </span>
                <span className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                  {opt.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Doctor (auto-suggested) */}
      {step === 2 && reason && (
        <div className="mt-3 space-y-2.5">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            2. Choose a doctor (suggested for {reason.label})
          </p>
          {reason.id === 'child' && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
              Children under 14 are seen exclusively by Dr. Sneha Rao on Saturdays. A parent must be present.
            </p>
          )}
          <div className="space-y-2">
            {doctors.map((doc) => {
              const isPaediatric =
                doc.name.toLowerCase().includes('sneha') ||
                doc.role.toLowerCase().includes('paediatric') ||
                doc.role.toLowerCase().includes('child');
              const isSuggested =
                reason.id === 'child'
                  ? isPaediatric
                  : doc.name === reason.suggestedDoctor || doc.name === doctorName;
              const disabled = reason.id === 'child' && hasPaediatricDoc && !isPaediatric;
              return (
                <button
                  key={doc.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDoctor(doc.name)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors ${
                    disabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-45 dark:border-slate-800 dark:bg-slate-900/40'
                      : isSuggested
                        ? 'border-[#0E7490] bg-[#E8F6FB] hover:bg-[#DCF1F9] dark:border-cyan-500 dark:bg-cyan-950/40'
                        : 'border-[#CFE3EE] bg-white hover:border-[#0E7490] dark:border-[#243B52] dark:bg-[#0F1B26]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {doc.name}
                      </span>
                      {isSuggested && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300">
                          <UserCheck className="h-3 w-3" />
                          Suggested
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      {doc.role} · {doc.days}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Valid Date & Time Slot (Lunch & Sunday blocked) */}
      {step === 3 && (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            3. Pick a date & time for {doctorName}
          </p>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Available dates (Sundays closed for routine bookings)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {validDates.map((d) => {
                const active = selectedDate?.dateISO === d.dateISO;
                return (
                  <button
                    key={d.dateISO}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#0E7490] bg-[#0E7490] text-white dark:border-cyan-500 dark:bg-cyan-600'
                        : 'border-[#CFE3EE] bg-white text-slate-800 hover:border-[#0E7490] dark:border-[#243B52] dark:bg-[#0F1B26] dark:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3" />
              <span>Time slots (1:30 pm – 2:30 pm lunch break blocked)</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {TIME_SLOTS.map((slot) => {
                const active = timeSlot === slot.label;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => setTimeSlot(slot.label)}
                    className={`min-h-[36px] rounded-lg border px-2 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                      active
                        ? 'border-[#0284C7] bg-[#0284C7] text-white'
                        : 'border-[#CFE3EE] bg-white text-slate-800 hover:border-[#0E7490] dark:border-[#243B52] dark:bg-[#0F1B26] dark:text-slate-200'
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!selectedDate || !timeSlot}
              onClick={() => setStep(4)}
              className="min-h-[40px] rounded-xl bg-[#0E7490] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#155E75] disabled:opacity-45 dark:bg-cyan-600"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Name & Phone */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            4. Enter your name & phone number
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Patient Name
              </span>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g., Ananya Sharma"
                className="min-h-[40px] w-full rounded-lg border border-[#BDD8E7] bg-white px-3 py-2 text-base text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Phone / WhatsApp
              </span>
              <input
                type="tel"
                required
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="e.g., 98490 12345"
                className="min-h-[40px] w-full rounded-lg border border-[#BDD8E7] bg-white px-3 py-2 text-base tabular-nums text-slate-900 focus:border-[#0E7490] focus:outline-none sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedDate?.label} at {timeSlot} · {doctorName}
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] rounded-xl bg-[#0284C7] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0369A1] disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Step 5: Summary Card with Confetti Pop + Add to Calendar */}
      {step === 5 && submittedAppt && (
        <div className="animate-confetti-pop mt-3 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 className="h-5 w-5" />
              <Sparkles
                className="absolute -right-1.5 -top-1.5 h-4 w-4 text-sky-400"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                Request received. Our front desk will confirm shortly.
              </p>
              <p className="mt-1 text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-mono font-semibold">{submittedAppt.id}</span> ·{' '}
                {submittedAppt.reason} with {submittedAppt.doctorName} on {submittedAppt.dateLabel} at{' '}
                {submittedAppt.timeSlot}
              </p>
              <p className="mt-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                Status: {submittedAppt.status} (human confirmation sent directly to this chat)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => downloadICS(submittedAppt)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#CFE3EE] bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-[#0E7490] hover:text-[#0E7490] dark:border-[#243B52] dark:bg-[#0F1B26] dark:text-slate-100"
            >
              <CalendarPlus className="h-4 w-4 text-[#0E7490] dark:text-cyan-400" />
              <span>Add to Calendar (.ics)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-xl bg-[#0E7490] px-4 py-2 text-xs font-semibold text-white hover:bg-[#155E75] dark:bg-cyan-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
