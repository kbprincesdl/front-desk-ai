import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
import { CLINIC_DATA } from '../data/clinicData';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const DOCTOR_DAY_MAP: Record<string, { initials: string; tint: string; activeDays: string[] }> = {
  'Dr. Meera Nair': {
    initials: 'MN',
    tint: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  'Dr. Imran Qureshi': {
    initials: 'IQ',
    tint: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-200',
    activeDays: ['Tue', 'Thu', 'Sat'],
  },
  'Dr. Sneha Rao': {
    initials: 'SR',
    tint: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200',
    activeDays: ['Sat'],
  },
};

function getHyderabadTimeInfo(): {
  dayShort: string;
  minutesSinceMidnight: number;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const dayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourRaw = Number(parts.find((p) => p.type === 'hour')?.value ?? '10');
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return { dayShort, minutesSinceMidnight: hour * 60 + minute };
}

export function getLiveClinicStatus(): {
  label: string;
  tone: 'open' | 'lunch' | 'emergency' | 'closed';
  dayShort: string;
} {
  const { dayShort, minutesSinceMidnight } = getHyderabadTimeInfo();

  if (dayShort === 'Sun') {
    if (minutesSinceMidnight >= 10 * 60 && minutesSinceMidnight < 14 * 60) {
      return { label: 'Emergencies only · closes 2 pm', tone: 'emergency', dayShort };
    }
    return { label: 'Closed · emergency line open', tone: 'closed', dayShort };
  }

  // Mon - Sat
  if (minutesSinceMidnight >= 13 * 60 + 30 && minutesSinceMidnight < 14 * 60 + 30) {
    return { label: 'Lunch break · front desk reopens 2:30 pm', tone: 'lunch', dayShort };
  }
  if (minutesSinceMidnight >= 9 * 60 && minutesSinceMidnight < 20 * 60) {
    return { label: 'Open now · closes 8 pm', tone: 'open', dayShort };
  }
  return { label: 'Closed · opens 9 am', tone: 'closed', dayShort };
}

export function ClinicDirectory() {
  const [liveStatus, setLiveStatus] = useState(getLiveClinicStatus);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveStatus(getLiveClinicStatus());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const statusToneClasses: Record<typeof liveStatus.tone, string> = {
    open: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    lunch:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    emergency:
      'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
    closed:
      'border-stone-200 bg-stone-100 text-stone-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <aside
      aria-label="Clinic directory"
      className="min-w-0 space-y-4 rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Live Clinic Status Badge */}
      <div className="flex flex-col gap-2 border-b border-[#F2E7DA] pb-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-bold text-stone-900 dark:text-slate-50">
            Clinic Directory
          </h2>
          <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400">
            Hyderabad (IST)
          </span>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusToneClasses[liveStatus.tone]}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{liveStatus.label}</span>
        </div>
      </div>

      {/* Doctor Cards */}
      <div>
        <h3 className="text-xs font-semibold text-stone-700 dark:text-slate-300">
          Our Dentists
        </h3>
        <div className="mt-2.5 space-y-2.5">
          {CLINIC_DATA.doctors.map((doc) => {
            const meta = DOCTOR_DAY_MAP[doc.name] ?? {
              initials: 'DR',
              tint: 'bg-teal-100 text-teal-800',
              activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            };
            const availableToday = meta.activeDays.includes(liveStatus.dayShort);

            return (
              <div
                key={doc.name}
                className={`rounded-xl border p-3 transition-colors ${
                  availableToday
                    ? 'border-teal-300 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/30'
                    : 'border-[#EFE2D3] bg-white dark:border-slate-800 dark:bg-slate-950/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${meta.tint}`}
                    aria-hidden="true"
                  >
                    {meta.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className="text-xs font-bold text-stone-900 dark:text-slate-100">
                        {doc.name}
                      </p>
                      {availableToday && (
                        <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-stone-600 dark:text-slate-400">
                      {doc.role}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {WEEKDAYS.map((day) => {
                        const worksDay = meta.activeDays.includes(day);
                        const isToday = day === liveStatus.dayShort;
                        return (
                          <span
                            key={day}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              worksDay
                                ? isToday
                                  ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950'
                                  : 'bg-[#F3EAE0] text-stone-800 dark:bg-slate-800 dark:text-slate-200'
                                : 'text-stone-400 line-through dark:text-slate-600'
                            }`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hours, Location & Contact */}
      <div className="divide-y divide-[#F2E7DA] border-t border-[#F2E7DA] pt-3 text-xs dark:divide-slate-800 dark:border-slate-800">
        <div className="pb-3">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-slate-100">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>Banjara Hills Clinic</span>
          </div>
          <p className="mt-1 leading-relaxed text-stone-700 dark:text-slate-300">
            {CLINIC_DATA.clinic.address}
          </p>
          <p className="mt-0.5 text-stone-500 dark:text-slate-400">
            {CLINIC_DATA.clinic.landmark}
          </p>
          <p className="mt-1 text-stone-600 dark:text-slate-400">
            {CLINIC_DATA.clinic.parking}
          </p>
        </div>

        <div className="py-3">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-slate-100">
            <Clock className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>Hours</span>
          </div>
          <dl className="mt-1.5 space-y-1 text-stone-700 dark:text-slate-300">
            <div>
              <span className="font-medium text-stone-900 dark:text-slate-200">Mon – Sat: </span>
              <span className="tabular-nums">{CLINIC_DATA.hours.monday_to_saturday}</span>
            </div>
            <div>
              <span className="font-medium text-stone-900 dark:text-slate-200">Lunch: </span>
              <span className="tabular-nums">{CLINIC_DATA.hours.lunch_break}</span>
            </div>
            <div>
              <span className="font-medium text-stone-900 dark:text-slate-200">Sunday: </span>
              <span className="tabular-nums">{CLINIC_DATA.hours.sunday}</span>
            </div>
          </dl>
        </div>

        <div className="pt-3">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-slate-100">
            <Phone className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>Phone & Emergency</span>
          </div>
          <div className="mt-1.5 space-y-1 text-stone-700 dark:text-slate-300">
            <p>
              Front desk:{' '}
              <span className="font-mono font-medium tabular-nums text-stone-900 dark:text-slate-100">
                {CLINIC_DATA.clinic.phone}
              </span>
            </p>
            <p>
              WhatsApp / Emergency:{' '}
              <span className="font-mono font-medium tabular-nums text-stone-900 dark:text-slate-100">
                {CLINIC_DATA.clinic.emergency_phone}
              </span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
